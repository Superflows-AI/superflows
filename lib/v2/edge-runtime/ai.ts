import { Redis } from "@upstash/redis/nodejs";
import {
  AnswersType,
  ChatGPTMessage,
  ChatGPTParams,
  FunctionMessage,
  FunctionMessageInclSummary,
  GPTMessageInclSummary,
  ToConfirm,
} from "../../models";
import {
  ActionPlusApiInfo,
  Organization,
  OrgJoinIsPaidFinetunedModels,
} from "../../types";
import getMessages from "../prompts/chatBot";
import {
  repopulateVariables,
  sanitizeMessages,
} from "../../edge-runtime/apiResponseSimplification";
import {
  MessageInclSummaryToGPT,
  preStreamProcessOutMessage,
  removeOldestFunctionCalls,
  sortObjectToArray,
} from "../../edge-runtime/utils";
import {
  exponentialRetryWrapper,
  getTokenCount,
  logPrompt,
  openAiCost,
} from "../../utils";
import { streamLLMResponse } from "../../queryLLM";
import { MAX_TOKENS_OUT } from "../../consts";
import { FunctionCall, parseOutput } from "@superflows/chat-ui-react";
import {
  streamResponseToUser,
  updatePastAssistantMessage,
} from "../../edge-runtime/angelaUtils";
import { getMissingArgCorrections } from "../../edge-runtime/missingParamCorrection";
import { requestCorrectionSystemPrompt } from "../../prompts/requestCorrection";
import {
  constructHttpRequest,
  makeHttpRequest,
  processAPIoutput,
} from "../../edge-runtime/requests";
import summarizeText from "../../edge-runtime/summarize";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../database.types";
import { convertToGraphData, runDataAnalysis } from "./dataAnalysis";
import { dataAnalysisActionName, dataAnalysisAction } from "../builtinActions";
import {
  GraphData,
  StreamingStepInput,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { LlmResponseCache } from "../../edge-runtime/llmResponseCache";
import {
  Dottie,
  storeActionsAwaitingConfirmation,
} from "../../edge-runtime/ai";
import { LLMPreProcess, PreProcessOutType, Route } from "./clarification";
import { summariseChatHistory } from "./summariseChatHistory";
import { getSearchDocsAction } from "../../builtinActions";
import { sendFunLoadingMessages } from "../../funLoadingMessages";
import {
  explainPlotChatPrompt,
  EXPLANATION_MODEL,
  explanationParams,
} from "../../v3/prompts_parsers/explanation";
import { streamWithEarlyTermination } from "./utils";

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  redis = Redis.fromEnv();

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
  {
    auth: {
      persistSession: false,
    },
  },
);

const completionOptions: ChatGPTParams = {
  max_tokens: MAX_TOKENS_OUT,
  temperature: 0.2,
};

const FASTMODEL = "ft:gpt-3.5-turbo-0613:superflows:general-2:81WtjDqY";

export function hideLongGraphOutputs(
  chatGptPrompt: ChatGPTMessage[],
  fnNames?: string[],
): {
  chatGptPrompt: ChatGPTMessage[];
  graphDataHidden: boolean;
} {
  const names = fnNames ?? [dataAnalysisActionName];
  let graphDataHidden = false;
  const out = chatGptPrompt.map((m) => {
    if (m.role === "function" && names.includes(m.name)) {
      if (
        // No newlines in our minified JSONs
        !m.content.includes("\n") &&
        // Below are to check it's a JSON
        ["{", "["].includes(m.content[0]) &&
        ["}", "]"].includes(m.content[m.content.length - 1]) &&
        // Got to be long otherwise no point
        getTokenCount([m]) > 500
      ) {
        try {
          const graphData = JSON.parse(m.content);
          const arrayLength = graphData.data.length;
          const graphOrTable = graphData.type === "table" ? "table" : "graph";
          let dataStr = "";
          if (getTokenCount(JSON.stringify(graphData.data.slice(0, 3))) > 300) {
            dataStr = `[${JSON.stringify(graphData.data[0])},`;
          } else {
            dataStr = `[${graphData.data
              .slice(0, 3)
              .map(JSON.stringify)
              .join(",")},`;
          }
          delete graphData.data;
          m.content = JSON.stringify(graphData);
          dataStr += `<further elements cut for brevity (total length: ${arrayLength}) - DO NOT pretend to know the data, instead tell the user to look at this ${graphOrTable}>]`;
          m.content = m.content.slice(0, -1) + ',"data":' + dataStr + "}";
          graphDataHidden = true;
        } catch (e) {}
      } else if (getTokenCount([m]) > 500) {
        // Hiding logs
        m.content = "<cut for brevity - DO NOT pretend to know the logs>";
      }
    }
    return m;
  });
  return { chatGptPrompt: out, graphDataHidden };
}

export async function Bertie( // Bertie will eat you for breakfast
  controller: ReadableStreamDefaultController,
  reqData: AnswersType,
  actions: ActionPlusApiInfo[],
  org: OrgJoinIsPaidFinetunedModels,
  conversationId: number,
  previousMessages: GPTMessageInclSummary[],
  language: string | null,
  currentHost: string,
): Promise<{
  nonSystemMessages: GPTMessageInclSummary[];
  cost: number;
  numUserQueries: number;
}> {
  console.log("Bertie will eat you for breakfast");
  const streamInfo = await preamble(controller, conversationId);

  let chatHistory = [...previousMessages];
  let model = org.model;
  // GPT4 can deal with longer context window better
  const maxConvLength = model === "gpt-4" ? 20 : 14;
  let mostRecentParsedOutput = {
    reasoning: "",
    plan: "",
    tellUser: "",
    commands: [] as FunctionCall[],
    completed: false,
  };
  let numOpenAIRequests = 0;
  let totalCost = 0;
  let numUserQueries = 0;
  let awaitingConfirmation = false;

  // The cache is to check for past identical convos and use them instead of calling the LLM
  let chatMessageCache = new LlmResponseCache();
  await chatMessageCache.initialize(
    reqData.user_input,
    org.id,
    chatHistory.length - 1,
    supabase,
  );
  const cachedChatHistory = chatMessageCache.checkChatSummaryCache(chatHistory);

  // If there are multiple messages in the chat history, we summarise the chat history into a single user
  //  request - this makes future prompts have a _much_ easier time understanding the user's request
  let userRequest: string;
  if (previousMessages.length === 1) {
    userRequest = reqData.user_input;
  } else {
    userRequest =
      cachedChatHistory ||
      (await summariseChatHistory(chatHistory, language, org));
  }
  // If the summary is different from the user message, add it to the chatHistory
  // (for storage in DB later)
  const userMessage = chatHistory[chatHistory.length - 1];
  if (userRequest !== reqData.user_input && userMessage.role === "user") {
    userMessage.chat_summary = userRequest;
  }

  const preprocessedCache = await chatMessageCache.checkPreprocessingCache(
    chatHistory,
    userRequest,
    supabase,
  );
  const preprocessOut: PreProcessOutType = preprocessedCache?.chosen_actions
    ? {
        actions: [...actions, getSearchDocsAction(org, currentHost)].filter(
          (a) => preprocessedCache.chosen_actions!.includes(a.name),
        ),
        // If no route, we use DIRECT to send cached clarification/refusal message
        route: (preprocessedCache.chosen_route as Route) ?? "DIRECT",
        clear: true,
        possible: true,
        message: null,
      }
    : await LLMPreProcess({
        userRequest,
        actions,
        org,
        userDescription: reqData.user_description ?? "",
        conversationId,
        language,
        streamInfo,
        currentHost,
      });
  // Fill in the chosen_actions and chosen_route
  if (userMessage.role === "user") {
    userMessage.chosen_actions = preprocessOut.actions.map((a) => a.name);
    userMessage.chosen_route = preprocessOut.route;
  }
  chatHistory[chatHistory.length - 1] = userMessage;
  if (preprocessOut.route === "DOCS") {
    const docsMessages = chatMessageCache.checkDocsCache(chatHistory);
    if (docsMessages) {
      console.log("Docs Messages found:", docsMessages);
      docsMessages.forEach((m) => {
        // @ts-ignore
        streamInfo(m);
        chatHistory.push(m);
      });
      return {
        nonSystemMessages: chatHistory,
        cost: totalCost,
        numUserQueries,
      };
    }
    return Dottie(
      controller,
      reqData,
      org,
      conversationId,
      previousMessages,
      language,
    );
  }
  if (!preprocessOut.clear || !preprocessOut.possible) {
    chatHistory.push(preprocessOut.message!);
    return {
      nonSystemMessages: chatHistory,
      cost: totalCost,
      numUserQueries,
    };
  }
  actions = preprocessOut.actions;
  let graphDataHidden = false;

  if (preprocessOut.route === "CODE") {
    const outMessages = await runCodeGen(
      userRequest,
      actions,
      org,
      { conversationId, index: chatHistory.length },
      reqData.user_description ?? "",
      chatMessageCache,
      streamInfo,
      reqData.user_api_key,
    );
    chatHistory = chatHistory.concat(outMessages);
    model = FASTMODEL;
    console.log(
      "\n\nNum of non system messages:",
      chatHistory.length,
      "with types:",
      chatHistory.map((m) => m.role),
    );

    // To stop going over the context limit: only remember the last 'maxConvLength' messages
    const recentMessages = chatHistory
      .slice(Math.max(0, chatHistory.length - maxConvLength))
      // Set summaries to 'content' - don't show AI un-summarized output
      .map(MessageInclSummaryToGPT);

    // Replace messages with `cleanedMessages` which has removed long IDs & URLs.
    // originalToPlaceholderMap is a map from the original string to the placeholder (URLX/IDX)
    let { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      recentMessages,
      org.sanitize_urls_first,
    );
    // Hide very long graph outputs
    ({ chatGptPrompt: cleanedMessages, graphDataHidden } =
      hideLongGraphOutputs(cleanedMessages));

    let chatGptPrompt: ChatGPTMessage[] = explainPlotChatPrompt(
      cleanedMessages,
      reqData.user_description ?? "",
      org,
      language,
      graphDataHidden,
    );

    // If over context limit, remove oldest function calls
    chatGptPrompt = removeOldestFunctionCalls(
      [...chatGptPrompt],
      model === "gpt-4-0613" ? "4" : "3",
    );

    console.log(
      "Plot explanation prompt:\n",
      chatGptPrompt.map((m) => `${m.role} message:\n${m.content}`).join("\n\n"),
      "\n\n",
    );

    let rawOutput = chatMessageCache.checkChatCache(chatHistory);
    if (rawOutput) {
      streamInfo({
        role: "assistant",
        content: rawOutput,
      });
    } else {
      // If still over the context limit tell the user to remove actions
      const tokenCount = getTokenCount(chatGptPrompt);
      const maxTokens = model.includes("gpt-3.5") ? 4096 : 8192;

      if (tokenCount >= maxTokens - MAX_TOKENS_OUT) {
        console.error(
          `Cannot call LLM API for conversation with id: ${conversationId}. Context limit reached`,
        );
        streamInfo({
          role: "error",
          content:
            "Your organization has too many actions enabled to complete this request. Disable some actions or contact your IT team.",
        });
        return {
          nonSystemMessages: chatHistory,
          cost: totalCost,
          numUserQueries,
        };
      }

      const promptInputCost = openAiCost(chatGptPrompt, "in", model);
      console.log("GPT input cost:", promptInputCost);
      totalCost += promptInputCost;

      let streamedText = "",
        retryCount = 0;
      while (!streamedText && retryCount < 3) {
        retryCount++;
        let completeOutput = await streamWithEarlyTermination(
          chatGptPrompt,
          explanationParams,
          EXPLANATION_MODEL,
          () => false,
          (rawOutput: string) => {
            streamInfo({
              role: "assistant",
              content: rawOutput.replace(streamedText, ""),
            });
            streamedText = rawOutput;
          },
          "Explanation message",
          `Reasoning:${chatGptPrompt[chatGptPrompt.length - 1].content.replace(
            "<thinking>",
            "",
          )}`,
          { "</thinking>": "", "<tellUser>": "Tell user:\n" },
        );
        if (streamedText && completeOutput) {
          chatHistory.push({ role: "assistant", content: completeOutput });
        }
      }
      return {
        nonSystemMessages: chatHistory,
        cost: totalCost,
        numUserQueries: 1,
      };
    }

    const newMessage = {
      role: "assistant",
      content: rawOutput,
    } as GPTMessageInclSummary;

    const outCost = openAiCost([newMessage], "out", model);
    totalCost += outCost;

    // Add assistant message to nonSystemMessages
    chatHistory.push(newMessage);
    return {
      nonSystemMessages: chatHistory,
      cost: totalCost,
      numUserQueries: 1,
    };
  }
  // Otherwise, we continue with the normal chatbot process
  // Add analytics action if enabled
  actions.unshift(dataAnalysisAction(org));

  try {
    while (!mostRecentParsedOutput.completed && !awaitingConfirmation) {
      // Send 'thinking' message on all requests except the first one
      if (numOpenAIRequests > 0) {
        streamInfo({ role: "loading", content: "Thinking" });
      }
      console.log(
        "\n\nNum of non system messages:",
        chatHistory.length,
        "with types:",
        chatHistory.map((m) => m.role),
      );

      // To stop going over the context limit: only remember the last 'maxConvLength' messages
      const recentMessages = addAssistantHistory(chatHistory)
        .slice(Math.max(0, chatHistory.length - maxConvLength))
        // Set summaries to 'content' - don't show AI un-summarized output
        .map(MessageInclSummaryToGPT);

      // Replace messages with `cleanedMessages` which has removed long IDs & URLs.
      // originalToPlaceholderMap is a map from the original string to the placeholder (URLX/IDX)
      let { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
        recentMessages,
        org.sanitize_urls_first,
      );
      // Hide very long graph outputs
      ({ chatGptPrompt: cleanedMessages, graphDataHidden } =
        hideLongGraphOutputs(cleanedMessages));

      let chatGptPrompt: ChatGPTMessage[] = getMessages(
        cleanedMessages,
        actions,
        reqData.user_description,
        org,
        language,
        Object.entries(originalToPlaceholderMap).length > 0,
      );

      // If over context limit, remove oldest function calls
      chatGptPrompt = removeOldestFunctionCalls(
        [...chatGptPrompt],
        model === "gpt-4-0613" ? "4" : "3",
      );

      console.log(
        "Bertie prompt:\n",
        chatGptPrompt
          .map((m) => `${m.role} message:\n${m.content}`)
          .join("\n\n"),
        "\n\n",
      );

      let rawOutput = chatMessageCache.checkChatCache(chatHistory);
      if (rawOutput) {
        streamInfo({
          role: "assistant",
          content: rawOutput,
        });
      } else {
        // If still over the context limit tell the user to remove actions
        const tokenCount = getTokenCount(chatGptPrompt);
        // TODO - add limits for more models
        const maxTokens = model.includes("gpt-3.5") ? 4096 : 8192;

        if (tokenCount >= maxTokens - MAX_TOKENS_OUT) {
          console.error(
            `Cannot call LLM API for conversation with id: ${conversationId}. Context limit reached`,
          );
          streamInfo({
            role: "error",
            content:
              "Your organization has too many actions enabled to complete this request. Disable some actions or contact your IT team.",
          });
          return {
            nonSystemMessages: chatHistory,
            cost: totalCost,
            numUserQueries,
          };
        }

        const promptInputCost = openAiCost(chatGptPrompt, "in", model);
        console.log("GPT input cost:", promptInputCost);
        totalCost += promptInputCost;

        const res = await exponentialRetryWrapper(
          streamLLMResponse,
          [chatGptPrompt, completionOptions, model],
          3,
        );
        if (res === null || "message" in res) {
          console.error(
            `Language Model API call failed for conversation with id: ${conversationId}. The error was: ${JSON.stringify(
              res,
            )}`,
          );
          streamInfo({
            role: "error",
            content: "Call to Language Model API failed",
          });
          return {
            nonSystemMessages: chatHistory,
            cost: totalCost,
            numUserQueries,
          };
        }

        // Stream response chunk by chunk
        rawOutput = await streamResponseToUser(
          res,
          streamInfo,
          originalToPlaceholderMap,
        );
      }

      const newMessage = {
        role: "assistant",
        content: rawOutput,
      } as GPTMessageInclSummary;

      const outCost = openAiCost([newMessage], "out", model);
      totalCost += outCost;

      mostRecentParsedOutput = parseOutput(rawOutput);

      // We only count a query against a user's quota if the AI selects an action to take.
      // We don't count it if the AI is just asking for more information, or if the user says 'hi' etc.
      if (mostRecentParsedOutput.commands?.length > 0) numUserQueries = 1;

      // Add assistant message to nonSystemMessages
      chatHistory.push(newMessage);

      const functionMessages: Record<string, FunctionMessageInclSummary> = {};
      const toUserCorrect: { functionName: string; param: string }[] = [];
      let errorMakingAPICall = false;
      // Call endpoints here
      const commandMapOutput = (
        await Promise.all(
          mostRecentParsedOutput.commands.map(async (command, idx) => {
            console.log("Processing command: ", command);
            // Check if the action name called by the LLM exists
            const chosenAction: ActionPlusApiInfo | undefined = actions.find(
              (a) => a.name === command.name,
            );
            if (!chosenAction) {
              // There are 2 main failure cases:
              //  1. Totally useless e.g. FUNCTION_1()
              //  2. Similar but hallucinated e.g. search_turnips()
              //
              // In both cases we continue Angela, skip the command and send a function
              //  message with an error in it
              console.warn(`Action ${command.name} not found!`);
              const outMessage = {
                role: "function",
                name: command.name,
                content: `Function ${command.name} not found!`,
              } as FunctionMessage;
              functionMessages[idx] = outMessage;
              streamInfo(outMessage);
              return;
            }

            // Re-add long IDs and URLs before making calls to the API
            const repopulatedArgs = repopulateVariables(
              command.args,
              originalToPlaceholderMap,
            );
            console.log("Args:", command.args, "\nRepop:", repopulatedArgs);
            command.args = repopulatedArgs as FunctionCall["args"];

            // Check and fill in any missing required parameters in the function call
            const corrections = await getMissingArgCorrections(
              chosenAction,
              command,
              [
                requestCorrectionSystemPrompt(org, reqData.user_description),
              ].concat(chatGptPrompt.concat(newMessage).slice(1)), // New message may contain useful information for the correction
              "gpt-4-0613",
            );
            let needsUserCorrection = false;
            if (Object.keys(corrections).length > 0) {
              for (const [param, response] of Object.entries(corrections)) {
                if (
                  typeof response === "string" &&
                  !response
                    .toLowerCase()
                    .replace(/[^A-Z]+/gi, "")
                    .includes("askuser")
                ) {
                  // AI set parameter
                  command.args[param] = response;
                } else {
                  // AI said we need to 'Ask user'
                  console.info("Needs user correction: ", param);
                  needsUserCorrection = true;
                  toUserCorrect.push({ functionName: command.name, param });
                }
              }
              // Update the past assistant message with all newly-added parameters (so it looks to future AI
              //  that it got the call right first time - stops it thinking it can skip required parameters).
              //  All are added since `command.args` has all the newly-added parameters
              updatePastAssistantMessage(command, chatHistory);
            }

            if (needsUserCorrection) {
              // We check for nulls later in the .map() output to see if we need to ask
              // the user for more information
              return null;
            }

            if (command.name === dataAnalysisActionName) {
              // Data analysis action is handled separately
              return;
            }

            if (!chosenAction.requires_confirmation) {
              const { url, requestOptions } = constructHttpRequest({
                action: chosenAction,
                parameters: command.args,
                organization: org,
                stream: streamInfo,
                userApiKey: reqData.user_api_key ?? "",
              });

              // Call user's API here
              let out;
              try {
                if (org.fun_loading_messages) {
                  out = await sendFunLoadingMessages(
                    makeHttpRequest(url, requestOptions, currentHost),
                    streamInfo,
                  );
                } else {
                  streamInfo({ role: "loading", content: "Calling API" });
                  out = await makeHttpRequest(url, requestOptions, currentHost);
                }
                errorMakingAPICall = errorMakingAPICall || out.isError;
                out = processAPIoutput(out.output, chosenAction);
              } catch (e) {
                console.error(e);
                // @ts-ignore
                out = `Failed to call ${url}\n\n${e.toString()}`;
                errorMakingAPICall = true;
              }
              const outString =
                typeof out === "string" ? out : JSON.stringify(out);
              console.log("Output from API call:", outString.slice(0, 100));
              let outMessage: FunctionMessageInclSummary = {
                role: "function",
                name: command.name,
                content: outString,
              };

              // If >500 tokens, summarise the message
              if (
                typeof out === "string" &&
                getTokenCount([outMessage]) > 500
              ) {
                console.log("Summarising text from API response", typeof out);
                streamInfo({
                  role: "loading",
                  content: "Summarising text",
                });
                outMessage.summary = await summarizeText(out, org);
              }
              functionMessages[idx] = outMessage;
              outMessage = preStreamProcessOutMessage(
                outMessage,
                command,
                chosenAction,
              );

              streamInfo(outMessage);
            } else {
              // This adds to the toConfirm array
              return {
                actionId: chosenAction.id,
                args: command.args,
                name: command.name,
              };
            }
          }),
        )
      ).filter((x) => x !== undefined);

      // This adds function outputs in the order they were called by the LLM
      chatHistory = chatHistory.concat(sortObjectToArray(functionMessages));

      // Below checks for if there are any 'needs correction' messages
      const anyNeedCorrection = commandMapOutput.some(
        (output) => output === null,
      );
      if (anyNeedCorrection) {
        // funcToArrToCorrect maps from function name to array of parameters that need user correction
        const funcToArrToCorrect: { [param: string]: string[] } = {};
        toUserCorrect.map((toCorrect) => {
          if (toCorrect.functionName in funcToArrToCorrect) {
            funcToArrToCorrect[toCorrect.functionName].push(toCorrect.param);
          } else {
            funcToArrToCorrect[toCorrect.functionName] = [toCorrect.param];
          }
        });
        // For each function that has parameters requiring correction, send an error function message
        Object.entries(funcToArrToCorrect).map(([functionName, params]) => {
          const missingParamsMessage = {
            role: "function",
            name: functionName,
            content: `Error: function "${functionName}" is missing the following parameters: "${params.join(
              ", ",
            )}\n\nIf you want to call the function again, ask the user for the missing parameters"`,
          } as FunctionMessage;
          chatHistory.push(missingParamsMessage);
          streamInfo(missingParamsMessage);
        });
      }

      // This is for typing purposes
      const toConfirm: ToConfirm[] = commandMapOutput.filter(
        (x): x is ToConfirm => Boolean(x),
      );
      awaitingConfirmation = toConfirm.length > 0;
      if (awaitingConfirmation) {
        streamInfo({
          role: "confirmation",
          content: JSON.stringify(toConfirm),
        });
        if (redis)
          await storeActionsAwaitingConfirmation(toConfirm, conversationId);
      }

      // Data analysis
      const dataAnalysisAction = mostRecentParsedOutput.commands.find(
        (c) => c.name === dataAnalysisActionName,
      );
      // Used in if statements further down
      const fnMsg: FunctionMessage = {
        role: "function",
        name: dataAnalysisActionName,
        content: "",
      };
      if (dataAnalysisAction && !anyNeedCorrection && toConfirm.length === 0) {
        const outMessages = await runCodeGen(
          dataAnalysisAction.args["instruction"],
          [...actions.slice(1)],
          org,
          { conversationId, index: chatHistory.length },
          reqData.user_description ?? "",
          chatMessageCache,
          streamInfo,
          reqData.user_api_key,
        );
        chatHistory = chatHistory.concat(outMessages);
        // Make last message an explanation-only message
        // Hide very long graph outputs
        ({ chatGptPrompt: cleanedMessages, graphDataHidden } =
          hideLongGraphOutputs(cleanedMessages));

        let chatGptPrompt: ChatGPTMessage[] = explainPlotChatPrompt(
          cleanedMessages,
          reqData.user_description ?? "",
          org,
          language,
          graphDataHidden,
        );

        // If over context limit, remove oldest function calls
        chatGptPrompt = removeOldestFunctionCalls(
          [...chatGptPrompt],
          model === "gpt-4-0613" ? "4" : "3",
        );
        logPrompt(chatGptPrompt);

        // If still over the context limit tell the user to remove actions
        const tokenCount = getTokenCount(chatGptPrompt);
        const maxTokens = 10000;

        if (tokenCount >= maxTokens - MAX_TOKENS_OUT) {
          console.error(
            `Cannot call LLM API for conversation with id: ${conversationId}. Context limit reached`,
          );
          return {
            nonSystemMessages: chatHistory,
            cost: totalCost,
            numUserQueries,
          };
        }

        const promptInputCost = openAiCost(chatGptPrompt, "in", model);
        console.log("GPT input cost:", promptInputCost);
        totalCost += promptInputCost;

        let streamedText = "",
          retryCount = 0;
        while (!streamedText && retryCount < 3) {
          retryCount++;
          let completeOutput = await streamWithEarlyTermination(
            chatGptPrompt,
            explanationParams,
            EXPLANATION_MODEL,
            () => false,
            (rawOutput: string) => {
              streamInfo({
                role: "assistant",
                content: rawOutput.replace(streamedText, ""),
              });
              streamedText = rawOutput;
            },
            "Explanation message",
            `Reasoning:${chatGptPrompt[
              chatGptPrompt.length - 1
            ].content.replace("<thinking>", "")}`,
            { "</thinking>": "", "<tellUser>": "Tell user:\n" },
          );
          if (streamedText && completeOutput) {
            chatHistory.push({ role: "assistant", content: completeOutput });
          }
        }
        return {
          nonSystemMessages: chatHistory,
          cost: totalCost,
          numUserQueries: 1,
        };

        // No need to stream data analysis errors to the user
      } else if (dataAnalysisAction) {
        if (anyNeedCorrection) {
          fnMsg.content = "Error: other function calls need user correction";
          chatHistory.push(fnMsg);
        } else if (toConfirm.length !== 0) {
          fnMsg.content =
            "Error: another function call requires user confirmation";
          chatHistory.push(fnMsg);
        }
      }

      if (mostRecentParsedOutput.completed) {
        return {
          nonSystemMessages: chatHistory,
          cost: totalCost,
          numUserQueries,
        };
      }

      numOpenAIRequests++;
      // Maximum number of chatbot calls per user query
      if (numOpenAIRequests >= 6) {
        console.error(
          `OpenAI API call limit reached for conversation with id: ${conversationId}`,
        );
        streamInfo({
          role: "error",
          content: "OpenAI API call limit reached",
        });
        return {
          nonSystemMessages: chatHistory,
          cost: totalCost,
          numUserQueries,
        };
      }
    }
  } catch (e) {
    console.error(e?.toString() ?? "Internal server error");
    streamInfo({
      role: "error",
      content: e?.toString() ?? "Internal server error",
    });
    return { nonSystemMessages: chatHistory, cost: totalCost, numUserQueries };
  }
  return { nonSystemMessages: chatHistory, cost: totalCost, numUserQueries };
}

export async function preamble(
  controller: ReadableStreamDefaultController,
  conversationId: number,
) {
  const encoder = new TextEncoder();

  return function streamInfo(step: StreamingStepInput) {
    controller.enqueue(
      encoder.encode(
        "data: " +
          JSON.stringify({
            id: conversationId,
            ...step,
          }),
      ),
    );
  };
}

async function runCodeGen(
  userRequest: string,
  actions: ActionPlusApiInfo[],
  org: Pick<
    Organization,
    | "id"
    | "name"
    | "description"
    | "chatbot_instructions"
    | "fun_loading_messages"
  >,
  dbData: { conversationId: number; index: number },
  userDescription: string,
  chatMessageCache: LlmResponseCache,
  streamInfo: (step: StreamingStepInput) => void,
  userApiKey: string | undefined,
): Promise<FunctionMessage[]> {
  console.log("Running data analysis!");
  const graphData = await runDataAnalysis(
    userRequest,
    actions,
    org,
    dbData,
    userDescription,
    chatMessageCache,
    streamInfo,
    userApiKey,
  );
  // Used in if statements further down
  const fnMsg: FunctionMessage = {
    role: "function",
    name: dataAnalysisActionName,
    content: "",
  };
  // Return graph data to the user & add message to chat history
  if (graphData === null) {
    fnMsg.content = "Failed to run data analysis";
    streamInfo(fnMsg);
    return [fnMsg];
  } else if ("error" in graphData) {
    // Handle error - add function message
    fnMsg.content = graphData.error;
    streamInfo(fnMsg);
    return [fnMsg];
  } else {
    const graphDataArr = convertToGraphData(graphData);
    graphDataArr.map(streamInfo);
    return graphDataArr.map((m) => ({
      role: "function",
      name: dataAnalysisActionName,
      content:
        typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));
  }
}

export function addAssistantHistory(
  oldHistory: GPTMessageInclSummary[],
): GPTMessageInclSummary[] {
  /** When CODE has been selected in the past, it jumps from a user message to
   * a function message. This function adds an assistant message in between
   * to make the history more complete. Otherwise future DIRECT mode AI will
   * try to output something that looks like a function message. */
  const newHistory: GPTMessageInclSummary[] = [];
  oldHistory.forEach((message, idx) => {
    newHistory.push(message);
    // Is last message
    if (idx + 1 === oldHistory.length) {
      return;
    }
    // Add a made-up assistant message after a user message if previously it was
    //  followed by a function message
    const nextMessage = oldHistory[idx + 1];
    if (
      message.role === "user" &&
      nextMessage.role === "function" &&
      nextMessage.name === dataAnalysisActionName
    ) {
      //@ts-ignore
      const actionParam = dataAnalysisAction({ id: 0 }).parameters[0].name;
      newHistory.push({
        role: "assistant",
        content: `Commands:
${dataAnalysisActionName}(${actionParam}=\"${
          message.chat_summary || message.content
        }\")`,
      });
    }
  });
  return newHistory;
}
