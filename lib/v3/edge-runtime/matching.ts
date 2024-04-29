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
import { queryEmbedding } from "../../queryLLM";
import {
  getMatchingPromptv3,
  parseMatchingOutput,
} from "../prompts_parsers/matching";
import { streamWithEarlyTermination } from "../../v2/edge-runtime/utils";
import {
  convertWrittenCodeToExecutable,
  parseCodeGenv3,
} from "../prompts_parsers/codeGen";
import { checkCodeExecutionOutput, convertToGraphData } from "./dataAnalysis";
import { parseFilteringOutputv3 } from "../prompts_parsers/filtering";
import getMessages from "../../v2/prompts/chatBot";
import { MAX_TOKENS_OUT } from "../../consts";
import { parseRoutingOutputv3 } from "../prompts_parsers/routing";
import { getRelevantDocChunks } from "../../embed-docs/docsSearch";
import { chatToDocsPrompt } from "../../prompts/chatBot";
import { MessageInclSummaryToGPT } from "../../edge-runtime/utils";
import { funLoadingMessages } from "../../funLoadingMessages";
import {
  StreamingStep,
  StreamingStepInput,
} from "@superflows/chat-ui-react/dist/src/lib/types";

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
        "fnName,description,approval_answer_messages(raw_text,message_type,message_idx)",
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

    await executeMessages(
      approvalAnswer.approval_answer_messages.sort(
        (a, b) => a.message_idx - b.message_idx,
      ),
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
  console.log("There's NOT a match!");

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
      (await summariseChatHistory(chatHistory, language, org.id));
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
      // Now using Opus, 12 is (hopefully) ok
      match_count: 12,
      _org_id: org.id,
    },
  );
  if (error) throw new Error("ERROR: " + error.message);
  if (matches === null) {
    throw new Error("ERROR: No matches found for " + userRequest);
  }
  // Cut the gap from top to 0.2 max
  matches = matches.filter(
    (m: any) => matches![0].mean_similarity - m.mean_similarity <= 0.2,
  );
  // Get the function names and descriptions
  const { data: fnNameData, error: fnNameErr } = await supabase
    .from("approval_answers")
    .select(
      "fnName, id, description, approval_questions(text,primary_question)",
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

  const matchesWithFnNames = matches.map((m) => {
    const match = fnNameData.find((f) => f.id === m.answer_id);
    if (!match) throw new Error("No match found for " + m.answer_id);
    let chosenQ = match.approval_questions.find((q) => q.primary_question);
    if (!chosenQ) chosenQ = match.approval_questions[0];
    return {
      text: chosenQ.text,
      fnName: match.fnName,
      description: match.description,
    };
  });

  const matchingPrompt = getMatchingPromptv3({
    userRequest,
    matches: matchesWithFnNames,
    org,
    userDescription: reqData.user_description ?? "",
    variables,
  });
  logPrompt(matchingPrompt);
  let completeOutput = "",
    finalLlmOut: string | null = null,
    numRetries = 0;
  while (!finalLlmOut && numRetries < 2) {
    numRetries += 1;
    finalLlmOut = await streamWithEarlyTermination(
      matchingPrompt,
      {
        temperature: 0,
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
      () => {
        return completeOutput.includes("</tellUser");
      },
      async (rawOutput: string) => {
        if (completeOutput.includes("<tellUser>")) {
          streamInfo({
            role: "assistant",
            content: rawOutput.replace(completeOutput, ""),
          });
        }
        completeOutput = rawOutput;
      },
      "Matching",
      matchingPrompt[matchingPrompt.length - 1].content,
    );
  }
  console.log("LLM out:", finalLlmOut);
  if (!finalLlmOut) {
    throw new Error("Matching LLM ran out of retries");
  }
  const parsedMatchingOut = parseMatchingOutput(finalLlmOut, variables);

  if (parsedMatchingOut?.functionName) {
    // Get messages from approval_answer_messages and use them to generate the answer, filling in variables
    const chosenMatch = fnNameData.find(
      (m) => m.fnName === parsedMatchingOut.functionName,
    );
    if (!chosenMatch) {
      throw new Error("No match found for " + parsedMatchingOut.functionName);
    }
    const { data: messages, error: messagesError } = await supabase
      .from("approval_answer_messages")
      .select("raw_text,message_idx,message_type")
      .eq("answer_id", chosenMatch.id)
      .order("message_idx", { ascending: true });
    if (messagesError) throw new Error(messagesError.message);
    if (!messages) throw new Error("No messages found for " + chosenMatch.id);

    await executeMessages(
      messages,
      actions,
      org,
      streamInfo,
      chatHistory,
      reqData,
      variables.map((v) => ({
        ...v,
        default: (parsedMatchingOut.variables ?? {})[v.name] ?? v.default,
      })),
      language,
    );
  } else {
    // No function name, presumably there is a tellUser message
    chatHistory.push({
      role: "assistant",
      content: parsedMatchingOut?.tellUser ?? "",
    });
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
  actions: ActionPlusApiInfo[],
  org: OrgJoinIsPaidFinetunedModels,
  streamInfo: (step: StreamingStepInput) => void,
  chatHistory: GPTMessageInclSummary[],
  reqData: AnswersType,
  variables: ApprovalVariable[],
  language: string | null,
) {
  let filteredActions: ActionPlusApiInfo[] = [],
    codeMessages: FunctionMessage[] = [],
    route: "DOCS" | "CODE" | undefined = undefined;
  for (const m of messages) {
    if (m.message_type === "routing") {
      const parsedRoutingOut = parseRoutingOutputv3(m.raw_text);
      route = parsedRoutingOut?.choice;
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
      const res = await supabase.functions.invoke("execute-code-2", {
        body: JSON.stringify({
          actionsPlusApi: filteredActions,
          org,
          code: convertWrittenCodeToExecutable(parsedCode.code, variables),
          userApiKey: reqData.user_api_key,
        }),
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
        codeMessages = graphDataArr.map(
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
        .slice(Math.max(0, chatHistory.length - 7))
        .map(MessageInclSummaryToGPT);
      let graphCut: boolean;
      ({ chatGptPrompt: nonSystemMessages, graphDataHidden: graphCut } =
        hideLongGraphOutputs(nonSystemMessages, ["logs", "plot"]));
      let prompt: ChatGPTMessage[];
      if (route === "CODE") {
        prompt = getMessages(
          nonSystemMessages,
          [],
          reqData.user_description,
          org,
          language,
          false,
          graphCut,
        );
      } else {
        prompt = [
          chatToDocsPrompt(reqData.user_description, org, false, language),
          ...nonSystemMessages.map(MessageInclSummaryToGPT),
        ];
      }
      logPrompt(prompt);
      let streamedText = "";
      let completeOutput = await streamWithEarlyTermination(
        prompt,
        {
          max_tokens: MAX_TOKENS_OUT,
          temperature: 0.2,
        },
        "ft:gpt-3.5-turbo-0613:superflows:general-2:81WtjDqY",
        () => false,
        (rawOutput: string) => {
          streamInfo({
            role: "assistant",
            content: rawOutput.replace(streamedText, ""),
          });
          streamedText = rawOutput;
        },
        "Explanation message",
      );
      if (completeOutput) {
        chatHistory.push({ role: "assistant", content: completeOutput });
      }
    }
  }
}
