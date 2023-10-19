import { Redis } from "@upstash/redis/nodejs";
import {
  ActionToHttpRequest,
  AnswersType,
  ChatGPTMessage,
  ChatGPTParams,
  GPTMessageInclSummary,
  StreamingStepInput,
  ToConfirm,
} from "../models";
import { ActionPlusApiInfo, OrgJoinIsPaidFinetunedModels } from "../types";
import getMessages, { chatToDocsPrompt } from "../prompts/chatBot";
import {
  repopulateVariables,
  sanitizeMessages,
} from "./apiResponseSimplification";
import { MessageInclSummaryToGPT, removeOldestFunctionCalls } from "./utils";
import { exponentialRetryWrapper, getTokenCount, openAiCost } from "../utils";
import { getLLMResponse, streamLLMResponse } from "../queryLLM";
import { MAX_TOKENS_OUT } from "../consts";
import { FunctionCall, parseOutput } from "@superflows/chat-ui-react";
import { filterActions } from "./filterActions";
import {
  streamResponseToUser,
  stripExampleFunctions,
  updatePastAssistantMessage,
} from "./angelaUtils";
import { getMissingArgCorrections } from "./missingParamCorrection";
import { requestCorrectionSystemPrompt } from "../prompts/requestCorrection";
import {
  constructHttpRequest,
  getDocsChatRequest,
  makeHttpRequest,
  processAPIoutput,
} from "./requests";
import summarizeText from "./summarize";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../database.types";
import {
  getRelevantDocChunks,
  getSearchDocsAction,
} from "../embed-docs/docsSearch";
import { hallucinateDocsSystemPrompt } from "../prompts/hallucinateDocs";

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  redis = Redis.fromEnv();

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
);

export async function Dottie( // Dottie talks to docs
  controller: ReadableStreamDefaultController,
  reqData: AnswersType,
  org: OrgJoinIsPaidFinetunedModels,
  conversationId: number,
  previousMessages: ChatGPTMessage[],
  language: string | null,
): Promise<{
  nonSystemMessages: ChatGPTMessage[];
  cost: number;
  numUserQueries: number;
}> {
  console.log("Dottie called!");
  const streamInfo = await preamble(
    controller,
    conversationId,
    [],
    reqData,
    org,
    language,
  );

  const model = org.model;
  const nonSystemMessages = [...previousMessages];
  const maxConvLength = model === "gpt-4-0613" ? 20 : 10;
  let cost = 0;

  // Const controlling how much context to include
  const nChunksInclude = 3;

  try {
    const recentMessages = [
      ...nonSystemMessages.slice(
        Math.max(0, nonSystemMessages.length - maxConvLength),
      ),
    ];
    const hallucinatedDocsPrompt = [
      hallucinateDocsSystemPrompt(reqData.user_description, org),
      ...recentMessages.filter((m) => m.role !== "function"),
    ];

    const hallucinatedRes = await exponentialRetryWrapper(
      getLLMResponse,
      [hallucinatedDocsPrompt, { ...completionOptions, temperature: 1 }, model],
      3,
    );
    console.log("Hallucination: ", hallucinatedRes);

    let chatGptPrompt: ChatGPTMessage[] = [
      chatToDocsPrompt(reqData.user_description, org, language), // To stop going over the context limit: only remember the last 'maxConvLength' messages
      ...recentMessages,
    ];

    // We do embedding and similarity search on the hallucinated docs
    const relevantDocs = await getRelevantDocChunks(
      hallucinatedRes,
      org.id,
      nChunksInclude,
      supabase,
    );

    const docMessage = {
      role: "function",
      content: relevantDocs,
      name: "search_docs",
    } as ChatGPTMessage;

    chatGptPrompt.push(docMessage);
    nonSystemMessages.push(docMessage);
    streamInfo(docMessage);

    // If function response too old, remove oldest documentation chunks
    chatGptPrompt = removeOldestFunctionCalls(
      [...chatGptPrompt],
      undefined,
      1500, // Cut out old docs retrieved, but keep old questions & answers
    );

    const promptInputCost = openAiCost(chatGptPrompt, "in", model);
    console.log("GPT input cost:", promptInputCost);
    cost += promptInputCost;

    console.log(
      "Dottie prompt:\n",
      JSON.stringify(chatGptPrompt, undefined, 2),
      "\n\n",
    );
    const res = await exponentialRetryWrapper(
      streamLLMResponse,
      [chatGptPrompt, { ...completionOptions, temperature: 0.5 }, model],
      3,
    );
    if (res === null || "message" in res) {
      console.error(
        `OpenAI API call failed for conversation with id: ${conversationId}. The error was: ${JSON.stringify(
          res,
        )}`,
      );
      streamInfo({
        role: "error",
        content: "Call to Language Model API failed",
      });
      return { nonSystemMessages, cost, numUserQueries: 0 };
    }

    // Stream response from OpenAI
    let rawOutput = await streamResponseToUser(res, streamInfo, {});

    const newMessage = {
      role: "assistant",
      content: rawOutput,
    } as ChatGPTMessage;

    const outCost = openAiCost([newMessage], "out", model);
    cost += outCost;

    // Add assistant message to nonSystemMessages
    nonSystemMessages.push(newMessage);
    return { nonSystemMessages, cost, numUserQueries: 1 };
  } catch (e) {
    console.error(e?.toString() ?? "Internal server error");
    streamInfo({
      role: "error",
      content: e?.toString() ?? "Internal server error",
    });
    return { nonSystemMessages, cost, numUserQueries: 1 };
  }
}

const completionOptions: ChatGPTParams = {
  max_tokens: MAX_TOKENS_OUT,
};

// Angela takes actions
export async function Angela( // Good ol' Angela
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
  // When this number is reached, we remove the oldest messages from the context window
  const streamInfo = await preamble(
    controller,
    conversationId,
    actions,
    reqData,
    org,
    language,
  );

  const nonSystemMessages = [...previousMessages];
  const model = org.model;
  const maxConvLength = model === "gpt-4-0613" ? 20 : 14;
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

  // This allows us to add the 'Search docs' action if it's enabled
  if (org.chat_to_docs_enabled) {
    actions.push(getSearchDocsAction(org, currentHost));
  }

  if (actions.length > 5 && model.includes("3.5")) {
    actions = await filterActions(
      actions,
      nonSystemMessages.slice(
        Math.max(0, nonSystemMessages.length - maxConvLength),
      ),
      model,
    );
  }

  try {
    while (!mostRecentParsedOutput.completed && !awaitingConfirmation) {
      // To stop going over the context limit: only remember the last 'maxConvLength' messages
      const recentMessages = nonSystemMessages
        .slice(Math.max(0, nonSystemMessages.length - maxConvLength))
        // Set summaries to 'content' - don't show AI un-summarized output
        .map(MessageInclSummaryToGPT);

      // Replace messages with `cleanedMessages` which has removed long IDs & URLs.
      // originalToPlaceholderMap is a map from the original string to the placeholder (URLX/IDX)
      const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
        recentMessages,
        org.sanitize_urls_first,
      );
      let chatGptPrompt: ChatGPTMessage[] = getMessages(
        cleanedMessages,
        actions,
        reqData.user_description,
        org,
        language,
        Object.entries(originalToPlaceholderMap).length > 0,
      );
      if (process.env.NODE_ENV === "development") {
        console.log(
          "Angela system prompt:\n",
          chatGptPrompt[0].content,
          "\n\n",
        );
      }

      // If over context limit, remove oldest function calls
      chatGptPrompt = removeOldestFunctionCalls(
        [...chatGptPrompt],
        model === "gpt-4-0613" ? "4" : "3",
      );

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
        return { nonSystemMessages, cost: totalCost, numUserQueries };
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
          `OpenAI API call failed for conversation with id: ${conversationId}. The error was: ${JSON.stringify(
            res,
          )}`,
        );
        streamInfo({
          role: "error",
          content: "Call to Language Model API failed",
        });
        return { nonSystemMessages, cost: totalCost, numUserQueries };
      }

      // Stream response from OpenAI
      let rawOutput = await streamResponseToUser(
        res,
        streamInfo,
        originalToPlaceholderMap,
      );

      const newMessage = {
        role: "assistant",
        content: rawOutput,
      } as GPTMessageInclSummary;

      const outCost = openAiCost([newMessage], "out", model);
      totalCost += outCost;

      mostRecentParsedOutput = parseOutput(rawOutput);

      // We only count a query against a user's quota if the AI selects an action to take.
      // We don't count it if the AI is just asking for more information, or if the user says 'hi' etc.
      if (
        mostRecentParsedOutput.commands &&
        mostRecentParsedOutput.commands.length > 0
      )
        numUserQueries += 1;

      // Add assistant message to nonSystemMessages
      nonSystemMessages.push(newMessage);

      const toUserCorrect: { functionName: string; param: string }[] = [];
      // Call endpoints here
      const commandMapOutput = (
        await Promise.all(
          mostRecentParsedOutput.commands.map(async (command) => {
            console.log("Processing command: ", command);
            const chosenAction = actions.find((a) => a.name === command.name);
            if (!chosenAction) {
              // There are 2 main failure cases:
              //  1. Totally useless e.g. FUNCTION_1()
              //  2. Similar but hallucinated e.g. search_turnips()
              //
              // In both cases we continue Angela, skip the command and send a function
              //  message with an error in it
              console.warn(`Action ${command.name} not found!`);
              streamInfo({
                role: "function",
                name: command.name,
                content: `Function ${command.name} is invalid! Do not output this again`,
              });
              return;
            }

            // Re-add long IDs before making calls to the API
            const repopulatedArgs = repopulateVariables(
              command.args,
              originalToPlaceholderMap,
            );
            command.args = repopulatedArgs as FunctionCall["args"];

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
              updatePastAssistantMessage(command, nonSystemMessages);
            }

            if (needsUserCorrection) {
              // We check for nulls later in the .map() output to see if we need to ask
              // the user for more information
              return null;
            }

            const actionToHttpRequest: ActionToHttpRequest = {
              action: chosenAction,
              parameters: command.args,
              organization: org,
              stream: streamInfo,
              userApiKey: reqData.user_api_key ?? "",
            };

            if (!chosenAction.requires_confirmation) {
              const { url, requestOptions } =
                chosenAction.name === "get_info_from_docs"
                  ? getDocsChatRequest(
                      chosenAction,
                      reqData.user_input,
                      org.id,
                      tokenCount,
                    )
                  : constructHttpRequest(actionToHttpRequest);

              let out;

              try {
                out = await makeHttpRequest(url, requestOptions, currentHost);
                out = processAPIoutput(out, chosenAction);
              } catch (e) {
                console.error(e);
                // @ts-ignore
                out = `Failed to call ${url}\n\n${e.toString()}`;
              }
              console.log("Output from API call:", out);
              let outMessage: GPTMessageInclSummary = {
                role: "function",
                name: command.name,
                content: typeof out === "string" ? out : JSON.stringify(out),
              };

              // If >500 tokens, summarise the message
              if (
                typeof out === "string" &&
                getTokenCount([outMessage]) > 500
              ) {
                outMessage.summary = await summarizeText(out, org);
              }
              nonSystemMessages.push(outMessage);
              // We can have issues in the frontend if the content is
              if (outMessage.summary && outMessage.content.length > 2000) {
                outMessage = { ...outMessage };
                outMessage.content =
                  outMessage.content.slice(0, 2000) +
                  "... output has been concatenated";
              }
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

      // Below checks for if there are any 'needs correction' messages
      if (commandMapOutput.some((output) => output === null)) {
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
          } as ChatGPTMessage;
          nonSystemMessages.push(missingParamsMessage as GPTMessageInclSummary);
          streamInfo(missingParamsMessage as GPTMessageInclSummary);
        });
      }

      // This is for typing purposes
      const toConfirm: ToConfirm[] = commandMapOutput.filter(
        (x): x is ToConfirm => x !== null,
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

      if (mostRecentParsedOutput.completed) {
        return { nonSystemMessages, cost: totalCost, numUserQueries };
      }

      numOpenAIRequests++;
      if (numOpenAIRequests >= 6) {
        console.error(
          `OpenAI API call limit reached for conversation with id: ${conversationId}`,
        );
        streamInfo({
          role: "error",
          content: "OpenAI API call limit reached",
        });
        return { nonSystemMessages, cost: totalCost, numUserQueries };
      }
    }
  } catch (e) {
    console.error(e?.toString() ?? "Internal server error");
    streamInfo({
      role: "error",
      content: e?.toString() ?? "Internal server error",
    });
    return { nonSystemMessages, cost: totalCost, numUserQueries };
  }
  return { nonSystemMessages, cost: totalCost, numUserQueries };
}

async function preamble(
  controller: ReadableStreamDefaultController,
  conversationId: number,
  actions: ActionPlusApiInfo[],
  reqData: AnswersType,
  org: OrgJoinIsPaidFinetunedModels,
  language: string | null,
) {
  const encoder = new TextEncoder();

  function streamInfo(step: StreamingStepInput) {
    controller.enqueue(
      encoder.encode(
        "data: " +
          JSON.stringify({
            id: conversationId,
            ...step,
          }),
      ),
    );
  }

  if (redis) {
    // Store the system prompt, in case we get feedback on it
    const redisKey = conversationId.toString() + "-system-prompt";
    const systemPrompt =
      actions.length > 0
        ? getMessages(
            [],
            actions,
            reqData.user_description,
            org,
            language,
            // TODO: ID line isn't always included, but we don't know whether it should be at this point (no functions called yet)
            false,
          )[0].content
        : chatToDocsPrompt(reqData.user_description, org, language).content;
    await redis.set(redisKey, systemPrompt);
    await redis.expire(redisKey, 60 * 15);
  }
  return streamInfo;
}

async function storeActionsAwaitingConfirmation(
  toConfirm: ToConfirm[],
  conversationId: number,
) {
  const redisKey = conversationId.toString() + "-toConfirm";
  if (toConfirm.length > 0 && redis) {
    if ((await redis.get(redisKey)) !== null)
      throw new Error(
        `Conversation ID "${conversationId}" already exists in redis, something has gone wrong`,
      );
    console.log("Setting redis key: ", redisKey);

    await redis.json.set(redisKey, "$", { toConfirm });
    // 10 minutes seems like a reasonable time if the user gets distracted etc
    await redis.expire(redisKey, 60 * 10);
  }
}
