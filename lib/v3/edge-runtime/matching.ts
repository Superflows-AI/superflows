import {
  AnswersType,
  ChatGPTMessage,
  FunctionMessage,
  GPTMessageInclSummary,
} from "../../models";
import {
  ActionPlusApiInfo,
  ApprovalAnswerMessage,
  ApprovalVariable,
  ExecuteCode2Item,
  OrgJoinIsPaidFinetunedModels,
} from "../../types";
import { hideLongGraphOutputs, preamble } from "../../v2/edge-runtime/ai";
import { LlmResponseCache } from "../../edge-runtime/llmResponseCache";
import { summariseChatHistory } from "../../v2/edge-runtime/summariseChatHistory";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../database.types";
import { exponentialRetryWrapper, logPrompt, snakeToCamel } from "../../utils";
import { getLLMResponse, queryEmbedding } from "../../queryLLM";
import {
  getMatchingPromptv3,
  MatchingParsedResponse,
  parseMatchingOutput,
} from "../prompts_parsers/matching";
import { streamWithEarlyTermination } from "../../v2/edge-runtime/utils";
import {
  convertWrittenCodeToExecutable,
  parseCodeGenv3,
} from "../prompts_parsers/codeGen";
import { checkCodeExecutionOutput, convertToGraphData } from "./dataAnalysis";
import { parseFilteringOutputv3 } from "../prompts_parsers/filtering";
import { parseRoutingOutputv3 } from "../prompts_parsers/routing";
import { getRelevantDocChunks } from "../../embed-docs/docsSearch";
import { chatToDocsPrompt } from "../../prompts/chatBot";
import { MessageInclSummaryToGPT } from "../../edge-runtime/utils";
import { funLoadingMessages } from "../../funLoadingMessages";
import { StreamingStepInput } from "@superflows/chat-ui-react/dist/src/lib/types";
import {
  explainPlotChatPrompt,
  EXPLANATION_MODEL,
  explanationParams,
} from "../prompts_parsers/explanation";
import { hallucinateDocsSystemPrompt } from "../../prompts/hallucinateDocs";
import { chatToDocsPromptv3 } from "../prompts_parsers/chatToDocs";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
  {
    auth: {
      persistSession: false,
    },
  },
);

export async function matchQuestionToAnswer(
  controller: ReadableStreamDefaultController,
  reqData: AnswersType,
  actions: ActionPlusApiInfo[],
  org: OrgJoinIsPaidFinetunedModels,
  conversationId: number,
  chatHistory: GPTMessageInclSummary[],
  language: string | null,
): Promise<{
  nonSystemMessages: GPTMessageInclSummary[];
  cost: number;
  numUserQueries: number;
}> {
  console.log("Yond Cassius has a lean and hungry look");
  const streamInfo = await preamble(controller, conversationId);
  let totalCost = 0;

  // Check approval_messages cache
  const { data: approvalQuestionMatch, error: approvalQErr } = await supabase
    .from("approval_questions")
    .select("answer_id, approval_answers!inner(id)")
    .match({
      embedded_text: reqData.user_input,
      org_id: org.id,
      "approval_answers.approved": true,
    });
  if (approvalQErr) throw new Error(approvalQErr.message);

  // Perfect match of an approved question
  if (approvalQuestionMatch && approvalQuestionMatch.length > 0) {
    console.log(
      `There's a match with answer id: ${approvalQuestionMatch[0].answer_id}`,
    );
    const userMessage = chatHistory[chatHistory.length - 1];
    if (userMessage.role === "user")
      userMessage.chat_summary = reqData.user_input;

    const answerId = approvalQuestionMatch[0].answer_id;
    const { data: approvalAnswer, error: approvalAnswerErr } = await supabase
      .from("approval_answers")
      .select(
        "fnName,description,is_docs,approval_answer_messages(raw_text,message_type,message_idx)",
      )
      .eq("id", answerId)
      .single();
    if (approvalAnswerErr) throw new Error(approvalAnswerErr.message);
    if (!approvalAnswer) throw new Error("No answer found with id " + answerId);

    const { data: variables, error: variableError } = await supabase
      .from("approval_variables")
      .select("*")
      .eq("org_id", org.id);
    if (variableError) throw new Error(variableError.message);

    const userAnswerMsg = approvalAnswer.approval_answer_messages.find(
      (m) => m.message_type === "user",
    );
    let vars: Record<string, any> = {};
    if (userAnswerMsg) {
      try {
        vars = JSON.parse(userAnswerMsg.raw_text);
      } catch (e) {}
    }

    chatHistory = await executeMessages(
      approvalAnswer.approval_answer_messages.sort(
        (a, b) => a.message_idx - b.message_idx,
      ),
      approvalAnswer.is_docs,
      reqData.user_input,
      actions,
      org,
      streamInfo,
      chatHistory,
      reqData,
      variables.map((v) => ({
        ...v,
        default: vars[v.name] ?? v.default,
      })),
      language,
    );
    return {
      nonSystemMessages: [...chatHistory],
      cost: totalCost,
      numUserQueries: 1,
    };
  }

  // If there are multiple messages in the chat history, we summarise the chat history into a single user
  //  request - this makes future prompts have a _much_ easier time understanding the user's request
  let userRequest: string;
  if (chatHistory.length === 1) {
    userRequest = reqData.user_input;
  } else {
    // The cache is to check for past identical convos and use them instead of calling the LLM
    let chatMessageCache = new LlmResponseCache();
    await chatMessageCache.initialize(
      reqData.user_input,
      org.id,
      chatHistory.length - 1,
      supabase,
    );
    const cachedChatHistory =
      chatMessageCache.checkChatSummaryCache(chatHistory);
    userRequest =
      cachedChatHistory ||
      (await summariseChatHistory(chatHistory, language, org));
  }
  const userMessage = chatHistory[chatHistory.length - 1];
  // For type-safety: it's always a user message
  if (userMessage.role === "user") userMessage.chat_summary = userRequest;

  // Perform matching
  const embedding = (
    await exponentialRetryWrapper(
      queryEmbedding,
      [userRequest, "text-embedding-3-large"],
      3,
    )
  )[0];
  let { data: matches, error } = await supabase.rpc(
    "search_approved_answers_with_group_ranking",
    {
      query_embedding: embedding,
      similarity_threshold: -1,
      // The limit in a prompt is 10, but we start with 20, but remove docs answers if >5
      match_count: 15,
      _org_id: org.id,
    },
  );
  if (error) throw new Error("ERROR: " + error.message);
  if (matches === null) {
    throw new Error("ERROR: No matches found for " + userRequest);
  }
  // Cut the gap from top to 0.25 max
  matches = matches.filter(
    (m: any) => matches![0].mean_similarity - m.mean_similarity <= 0.25,
  );
  // Get the function names and descriptions
  const { data: fnNameData, error: fnNameErr } = await supabase
    .from("approval_answers")
    .select(
      "fnName, id, description, is_docs, approval_questions(text,primary_question)",
    )
    .in(
      "id",
      // @ts-ignore
      matches.map((m) => m.answer_id),
    );
  if (fnNameErr) throw new Error(fnNameErr.message);
  if (!fnNameData)
    throw new Error("No answer found with id " + matches[0].answer_id);

  const { data: variables, error: variableError } = await supabase
    .from("approval_variables")
    .select("*")
    .eq("org_id", org.id);
  if (variableError) throw new Error(variableError.message);

  let numDocs = 0;
  const matchesWithFnNames = (
    matches
      .map((m) => {
        const match = fnNameData.find((f) => f.id === m.answer_id);
        if (!match) throw new Error("No match found for " + m.answer_id);

        // Impose a limit of 5 docs answers to prevent too many docs answers
        if (match.is_docs) numDocs += 1;
        if (numDocs > 5) return null;
        let chosenQ = match.approval_questions.find((q) => q.primary_question);
        if (!chosenQ) chosenQ = match.approval_questions[0];
        return {
          text: chosenQ.text,
          fnName: match.fnName,
          description: match.description,
        };
      })
      .filter(Boolean) as {
      text: string;
      fnName: string;
      description: string;
    }[]
  ).slice(0, 10);

  const matchingPrompt = getMatchingPromptv3({
    userRequest,
    matches: matchesWithFnNames,
    org,
    userDescription: reqData.user_description ?? "",
    variables,
  });
  logPrompt(matchingPrompt);
  let transformedOut = "",
    numRetries = 0,
    parsedMatchingOut: MatchingParsedResponse | null = null,
    chosenMatch = null,
    invalidOutput = false;

  // No valid function chosen or tell user message and retries not maxed out
  while (!chosenMatch && !parsedMatchingOut?.tellUser && numRetries < 2) {
    numRetries += 1;
    const llmOut = await streamWithEarlyTermination(
      matchingPrompt,
      {
        // Set temperature on retry
        temperature: !invalidOutput ? 0 : 0.75,
        max_tokens: 500,
        stop: [
          ")</functionCall>",
          ")\n</functionCall>",
          ");</functionCall>",
          ");\n</functionCall>",
          "</tellUser",
        ],
      },
      "anthropic/claude-3-opus-20240229",
      () => false,
      async (transformed: string) => {
        const newContent = transformed.replace(transformedOut, "");
        streamInfo({
          role: "assistant",
          content: newContent,
        });
        transformedOut = transformed;
      },
      "Matching",
      matchingPrompt[matchingPrompt.length - 1].content.replace(
        "<thinking>",
        "Reasoning:",
      ),
      {
        "</tellUser>": "",
        "</thinking>": "",
        "<tellUser>": "Tell user:\n",
        "<functionCall>": "Commands:\n",
        "</functionCall>": "",
      },
    );
    console.log("LLM out:", llmOut);
    if (llmOut) {
      parsedMatchingOut = parseMatchingOutput(llmOut.raw, variables);
      if (parsedMatchingOut?.functionName) {
        // Get messages from approval_answer_messages and use them to generate the answer, filling in variables
        chosenMatch = fnNameData.find(
          (m) => m.fnName === parsedMatchingOut!.functionName,
        );
        if (!chosenMatch) {
          console.warn(
            `No match found for ${parsedMatchingOut.functionName} on try ${numRetries}`,
          );
          // Reset since no match
          invalidOutput = true;
          parsedMatchingOut = null;
          chosenMatch = null;
        }
      }
      chatHistory.push({
        role: "assistant",
        content: llmOut.transformed,
      });
    }
  }
  // If no function name or tellUser message, we ran out of retries
  if (!chosenMatch && !parsedMatchingOut?.tellUser) {
    console.error("Matching LLM ran out of retries");
    streamInfo({
      role: "assistant",
      content:
        "I'm sorry, but the AI is currently facing difficulties.\n\nPlease try again later.",
    });
    return {
      nonSystemMessages: [...chatHistory],
      cost: 0,
      numUserQueries: 0,
    };
  }

  if (chosenMatch) {
    const { data: messages, error: messagesError } = await supabase
      .from("approval_answer_messages")
      .select("raw_text,message_idx,message_type")
      .eq("answer_id", chosenMatch.id)
      .order("message_idx", { ascending: true });
    if (messagesError) throw new Error(messagesError.message);
    if (!messages && !chosenMatch.is_docs)
      throw new Error("No messages found for " + chosenMatch.id);

    chatHistory = await executeMessages(
      messages,
      chosenMatch.is_docs,
      userRequest,
      actions,
      org,
      streamInfo,
      chatHistory,
      reqData,
      variables.map((v) => ({
        ...v,
        default: (parsedMatchingOut!.variables ?? {})[v.name] ?? v.default,
      })),
      language,
    );
  }
  return {
    nonSystemMessages: [...chatHistory],
    cost: totalCost,
    numUserQueries: 1,
  };
}

async function executeMessages(
  messages: Pick<
    ApprovalAnswerMessage,
    "raw_text" | "message_idx" | "message_type"
  >[],
  isDocs: boolean,
  userRequest: string,
  actions: ActionPlusApiInfo[],
  org: OrgJoinIsPaidFinetunedModels,
  streamInfo: (step: StreamingStepInput) => void,
  chatHistory: GPTMessageInclSummary[],
  reqData: AnswersType,
  variables: ApprovalVariable[],
  language: string | null,
): Promise<GPTMessageInclSummary[]> {
  let filteredActions: ActionPlusApiInfo[] = [],
    codeMessages: FunctionMessage[] = [],
    route: "DOCS" | "CODE" = "CODE";
  if (isDocs) {
    // Hallucinate docs & search for relevant docs
    const hallucinatedDocsPrompt: ChatGPTMessage[] = [
      hallucinateDocsSystemPrompt(reqData.user_description, org),
      { role: "user", content: userRequest },
    ];
    logPrompt(hallucinatedDocsPrompt);

    const hallucinatedRes = await exponentialRetryWrapper(
      getLLMResponse,
      [
        hallucinatedDocsPrompt,
        { temperature: 0.6, max_tokens: 200 },
        "gpt-3.5-turbo-0125",
      ],
      3,
    );
    console.log("Hallucination: ", hallucinatedRes);

    const relevantDocs = await getRelevantDocChunks(
      hallucinatedRes,
      org.id,
      3,
      supabase,
    );
    let docSearchGPTMessage = {
      role: "function",
      content: relevantDocs.text,
      name: "search_docs",
      urls: relevantDocs.urls,
    } as Extract<GPTMessageInclSummary, { role: "function" }>;
    streamInfo(docSearchGPTMessage);

    const prompt = chatToDocsPromptv3(
      userRequest,
      relevantDocs.text,
      reqData.user_description,
      org,
      language,
    );
    console.log("EXPLANATION PROMPT:");
    logPrompt(prompt);

    chatHistory.push(docSearchGPTMessage);

    let streamedText = "",
      retryCount = 0;
    while (!streamedText && retryCount < 3) {
      retryCount++;
      let completeOutput = await streamWithEarlyTermination(
        prompt,
        explanationParams,
        "anthropic/claude-3-haiku-20240307",
        () => false,
        (rawOutput: string) => {
          streamInfo({
            role: "assistant",
            content: rawOutput.replace(streamedText, ""),
          });
          streamedText = rawOutput;
        },
        "Explanation message",
        prompt[prompt.length - 1].content.replace("<thinking>", "Reasoning:"),
        { "</thinking>": "", "<tellUser>": "Tell user:\n" },
      );
      if (streamedText && completeOutput) {
        chatHistory.push({
          role: "assistant",
          content: completeOutput.transformed,
        });
      }
    }
  }

  // TODO: Untangle the routing code below to handle both docs and non-docs situations
  //  https://learney.atlassian.net/browse/SF-2575
  for (const m of messages) {
    if (m.message_type === "routing") {
      const parsedRoutingOut = parseRoutingOutputv3(m.raw_text);
      if (!parsedRoutingOut?.choice)
        console.error("No choice in routing:", m.raw_text);
      route = parsedRoutingOut?.choice ?? "CODE";
    } else if (m.message_type === "filtering") {
      const parsedFOut = parseFilteringOutputv3(
        m.raw_text,
        actions.map((a) => snakeToCamel(a.name)),
      );
      filteredActions = actions.filter((a) =>
        parsedFOut.selectedFunctions.includes(snakeToCamel(a.name)),
      );
    } else if (m.message_type === "function") {
      const relevantDocs = await getRelevantDocChunks(
        m.raw_text,
        org.id,
        3,
        supabase,
      );
      let docSearchGPTMessage = {
        role: "function",
        content: relevantDocs.text,
        name: "search_docs",
        urls: relevantDocs.urls,
      } as Extract<GPTMessageInclSummary, { role: "function" }>;
      streamInfo(docSearchGPTMessage);
      chatHistory.push(docSearchGPTMessage);
    } else if (m.message_type === "code") {
      console.log("Generating code output");
      const parsedCode = parseCodeGenv3(m.raw_text);
      streamInfo({
        role: "loading",
        content:
          funLoadingMessages[
            Math.floor(Math.random() * funLoadingMessages.length)
          ],
      });
      const executableCode = convertWrittenCodeToExecutable(
        parsedCode.code,
        variables,
      );
      if (typeof executableCode === "object") {
        streamInfo({
          role: "function",
          name: "error",
          content: executableCode.error,
        });
        console.error("Error in code parsing:", executableCode.error);
        continue;
      }
      const res = await supabase.functions.invoke("execute-code-2", {
        body: JSON.stringify({
          actionsPlusApi: filteredActions,
          org,
          code: executableCode,
          userApiKey: reqData.user_api_key,
        }),
      });
      // Stream code to frontend for debugging purposes
      streamInfo({
        role: "debug",
        content: `Executing code:\n\`\`\`\n${executableCode}\n\`\`\``,
      });
      if (res.error) {
        streamInfo({
          role: "function",
          name: "error",
          content: "Failed to execute code" + res.error.toString(),
        });
        console.error("Failed to execute code", res.error);
        continue;
      }
      const returnedData = res.data as ExecuteCode2Item[] | null;
      console.log(
        "Returned data",
        returnedData
          ? returnedData.map((m) =>
              JSON.stringify(m, undefined, 2).slice(0, 100),
            )
          : null,
      );
      const codeOk = checkCodeExecutionOutput(returnedData);
      if (!codeOk.isValid) {
        console.error("Error from generated code:", codeOk.error);
      }
      if (returnedData !== null) {
        const graphDataArr = convertToGraphData(returnedData);
        // Stream the graph data, converting errors to non-red messages in frontend
        graphDataArr.map((m) =>
          streamInfo(
            m.role === "error"
              ? { role: "function", content: m.content, name: "ERROR" }
              : m,
          ),
        );
        codeMessages = graphDataArr
          .filter((m) => m.role !== "debug")
          .map(
            (m) =>
              ({
                role: "function",
                name: m.role === "graph" ? "plot" : "logs",
                content:
                  typeof m.content === "string"
                    ? m.content
                    : JSON.stringify(m.content),
              } as FunctionMessage),
          );
        console.log("Concatenating code messages", codeMessages);
        chatHistory = chatHistory.concat(codeMessages);
      }
    } else if (m.message_type === "text") {
      // Regenerate text manually
      let nonSystemMessages: ChatGPTMessage[] = chatHistory
        .slice(Math.max(0, chatHistory.length - 9))
        .map(MessageInclSummaryToGPT);
      let graphCut: boolean;
      ({ chatGptPrompt: nonSystemMessages, graphDataHidden: graphCut } =
        hideLongGraphOutputs(nonSystemMessages, ["logs", "plot"]));
      let prompt: ChatGPTMessage[];
      if (route === "DOCS") {
        prompt = [
          chatToDocsPrompt(reqData.user_description, org, false, language),
          ...nonSystemMessages.map(MessageInclSummaryToGPT),
        ];
      } else {
        prompt = explainPlotChatPrompt(
          nonSystemMessages,
          reqData.user_description ?? "",
          org,
          language,
          graphCut,
        );
      }
      logPrompt(prompt);
      let streamedText = "",
        retryCount = 0;
      while (!streamedText && retryCount < 3) {
        retryCount++;
        let completeOutput = await streamWithEarlyTermination(
          prompt,
          explanationParams,
          route === "DOCS"
            ? "ft:gpt-3.5-turbo-0613:superflows:general-2:81WtjDqY"
            : EXPLANATION_MODEL,
          () => false,
          (rawOutput: string) => {
            streamInfo({
              role: "assistant",
              content: rawOutput.replace(streamedText, ""),
            });
            streamedText = rawOutput;
          },
          "Explanation message",
          route === "DOCS"
            ? ""
            : `Reasoning:${prompt[prompt.length - 1].content.replace(
                "<thinking>",
                "",
              )}`,
          { "</thinking>": "", "<tellUser>": "Tell user:\n" },
        );
        if (streamedText && completeOutput) {
          chatHistory.push({
            role: "assistant",
            content: completeOutput.transformed,
          });
        }
      }
    }
  }
  return chatHistory;
}
