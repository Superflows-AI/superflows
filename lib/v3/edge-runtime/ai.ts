import { ChatGPTMessage, GPTMessageInclSummary } from "../../models";
import {
  ActionPlusApiInfo,
  ApprovalAnswerData,
  ApprovalAnswerMessage,
  ApprovalVariable,
  ExecuteCode2Item,
  OrgJoinIsPaidFinetunedModels,
} from "../../types";
import { exponentialRetryWrapper, logPrompt, snakeToCamel } from "../../utils";
import {
  createClient,
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { Database, Json } from "../../database.types";
import { parseFilteringOutputv3 } from "../prompts_parsers/filtering";
import {
  codeGenLLMParams,
  convertWrittenCodeToExecutable,
  getCodeGenPromptv3,
  parseCodeGenv3,
} from "../prompts_parsers/codeGen";
import { getUserMessageText } from "../utils";
import { hideLongGraphOutputs } from "../../v2/edge-runtime/ai";
import { streamWithEarlyTermination } from "../../v2/edge-runtime/utils";
import { getLLMResponse } from "../../queryLLM";
import { checkCodeExecutionOutput, convertToGraphData } from "./dataAnalysis";
import { filterActions } from "../../v2/edge-runtime/filterActions";
import {
  explainPlotChatPrompt,
  EXPLANATION_MODEL,
  explanationParams,
} from "../prompts_parsers/explanation";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
  {
    auth: {
      persistSession: false,
    },
  },
);

if (!process.env.CASSIUS_MODEL) {
  throw new Error("Environment variable CASSIUS_MODEL not set");
}

const CASSIUS_MODEL = process.env.CASSIUS_MODEL;

export async function Cassius(
  // Yond Cassius has a lean and hungry look,
  // He thinks too much; such men are dangerous
  controller: ReadableStreamDefaultController,
  reqData: { answer_id: string; user_api_key?: string },
  actions: ActionPlusApiInfo[],
  org: Omit<
    OrgJoinIsPaidFinetunedModels,
    "fun_loading_messages" | "enable_data_analysis" | "bertie_disable_direct"
  > & {
    profiles: { id: string }[];
  },
  approvalAnswersData: ApprovalAnswerData,
  approvalVariableData: ApprovalVariable[],
  shouldRetry: boolean = false,
): Promise<boolean> {
  console.log("Yond Cassius has a lean and hungry look");
  const encoder = new TextEncoder();
  // TODO: Tighten type!
  const streamInfo = (step: any) => {
    controller.enqueue(
      encoder.encode(
        "data: " +
          JSON.stringify({
            id: reqData,
            ...step,
          }),
      ),
    );
  };
  try {
    streamInfo({});
    const pastMessages = approvalAnswersData.approval_answer_messages;
    const generatedMessages: ApprovalAnswerMessage[] = [];
    const primaryQuestion =
      approvalAnswersData.approval_questions.find((q) => q.primary_question) ??
      approvalAnswersData.approval_questions[0];
    console.log("pastMessages", pastMessages);

    async function addNewMessageToDB(
      llmOut: string,
      type: ApprovalAnswerMessage["message_type"],
      generated_output: GPTMessageInclSummary[] = [],
    ): Promise<ApprovalAnswerMessage> {
      const { data, error } = await supabase
        .from("approval_answer_messages")
        .insert({
          answer_id: reqData.answer_id,
          raw_text: llmOut,
          message_type: type,
          message_idx: getNextMessageIdx([
            ...pastMessages,
            ...generatedMessages,
          ]),
          org_id: org.id,
          generated_output: generated_output as Json[],
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    //  1. Generate the user's request if not present - DONE
    //  2. If DOCS and CODE both possible, generate the routing output if not present
    //  3. a. If DOCS
    //       i. generate the hallucinated text for doc search
    //       ii. generate the answer
    //
    //     b. If CODE
    //       i. filter actions
    //       ii. generate the code
    //       iii. run the code - DONE
    //       iv. generate the text explaining the output - DONE
    //  TODO: 4. Generate suggestions if not present
    //    (these aren't used downstream yet so no need for this until they are)

    // Generate the user's request if not present
    let userRequest: ApprovalAnswerMessage | undefined = pastMessages.find(
      (m) => m.message_type === "user",
    );
    console.log("usersRequest", userRequest);
    if (!userRequest) {
      console.log("No user message found, generating one...");
      // Generate parameters to fill user's request if not present
      // TODO: Make this potentially settable by the user in the UI or otherwise, for now just using variable default value
      let variableValues = {};
      const variableMatch =
        approvalAnswersData.approval_questions[0].text.match(/\{(\w+)}/g);
      if (variableMatch) {
        // Cut out the curly braces
        const variablesInvolved = variableMatch.map((v) => v.slice(1, -1));
        variableValues = variablesInvolved.reduce((acc, v) => {
          acc[v] =
            approvalVariableData.find((av) => av.name === v)?.default ?? "";
          return acc;
        }, {} as Record<string, any>);
      }
      userRequest = await addNewMessageToDB(
        JSON.stringify(variableValues, undefined, 2),
        "user",
      );
      streamInfo(userRequest); // Send the user's request to the frontend
      generatedMessages.push(userRequest);
    }

    let filteringMessage = pastMessages.find(
      (m) => m.message_type === "filtering",
    );
    console.log("Filtering message", filteringMessage);
    if (!filteringMessage) {
      console.log("No filtering message found, generating one...");
      const filterOutput = await filterActions(
        getUserMessageText(
          primaryQuestion.text,
          JSON.parse(userRequest.raw_text),
        ),
        actions,
        org,
        "gpt-4o",
      );
      filteringMessage = await addNewMessageToDB(
        `<thinking>\n${filterOutput.thoughts.join(
          "\n",
        )}\n</thinking><selected_functions>\n${filterOutput.actions
          .map((a) => snakeToCamel(a.name))
          .join("\n")}\n</selected_functions>`,
        "filtering",
      );
      streamInfo(filteringMessage); // Send the user's request to the frontend
      generatedMessages.push(filteringMessage);
    }
    const filteredActionNames = parseFilteringOutputv3(
      filteringMessage.raw_text,
      actions.map((a) => snakeToCamel(a.name)),
    ).selectedFunctions;
    console.log("filteredActionNames", filteredActionNames);
    const filteredActions = actions.filter((a) =>
      filteredActionNames.includes(snakeToCamel(a.name)),
    );
    console.log(
      "Filtered actions",
      filteredActions.map((a) => a.name),
    );
    if (filteredActions.length === 0) {
      console.error("No actions selected");
      void streamInfo({
        role: "error",
        content: "No actions selected",
      });
      await addNewMessageToDB("No actions selected", "error");
      return false;
    }

    // Generate the code
    let codeGenerated = false;
    let codeMessage = pastMessages.find((m) => m.message_type === "code");
    if (!codeMessage) {
      console.log("No code message found, generating one...");
      const prompt = getCodeGenPromptv3({
        question: primaryQuestion.text,
        org: org,
        filteredActions,
        variables: approvalVariableData,
      });
      logPrompt(prompt);
      const codeLlmOut = `<plan>\n1. The most helpful answer would include:\n  -${await exponentialRetryWrapper(
        getLLMResponse,
        [prompt, codeGenLLMParams, CASSIUS_MODEL],
        3,
      )}\n</code>`;
      codeMessage = await addNewMessageToDB(codeLlmOut, "code");
      generatedMessages.push(codeMessage);
      codeGenerated = true;
    }

    // Run the code
    if (codeMessage?.generated_output.length === 0) {
      console.log("Generating code output");
      const parsedCode = parseCodeGenv3(codeMessage!.raw_text);
      const userSetValues: Record<string, any> = JSON.parse(
        userRequest?.raw_text ?? "{}",
      );
      const res = await supabase.functions.invoke("execute-code-2", {
        body: JSON.stringify({
          actionsPlusApi: filteredActions,
          org,
          code: convertWrittenCodeToExecutable(
            parsedCode.code,
            approvalVariableData.map((v) => ({
              ...v,
              default: userSetValues[v.name] ?? v.default,
            })),
          ),
          userApiKey: reqData.user_api_key,
        }),
      });
      if (res.error) {
        let errorMessage = "";
        if (res.error instanceof FunctionsHttpError) {
          errorMessage = await res.error.context.text();
          if (errorMessage === "Internal Server Error") {
            errorMessage =
              "Timed out. Caused either by too much CPU time taken, or too long waiting for APIs.";
          }
          console.log("Function returned an error", errorMessage);
        } else if (res.error instanceof FunctionsRelayError) {
          errorMessage = res.error.message;
          console.log("Relay error:", res.error.message);
        } else if (res.error instanceof FunctionsFetchError) {
          errorMessage = res.error.message;
          console.log("Fetch error:", res.error.message);
        }
        await addNewMessageToDB(
          "Failed to execute code: " + errorMessage,
          "error",
        );
        streamInfo({
          role: "error",
          content: "Failed to execute code" + res.error.toString(),
        });
        console.error("Failed to execute code", res.error.toString());
        return false;
      }
      const returnedData = res.data as ExecuteCode2Item[] | null;
      console.log("Returned data", returnedData);
      const codeOk = checkCodeExecutionOutput(returnedData);
      if (!codeOk.isValid) {
        console.warn("Error from generated code:", codeOk.error);
        // Retry code generation from scratch once if not 4XX & code generated
        if (
          shouldRetry &&
          codeGenerated &&
          !codeOk.error.includes('"status": 4')
        ) {
          const { error: delCodeError } = await supabase
            .from("approval_answer_messages")
            .delete()
            .eq("id", codeMessage.id);
          if (delCodeError) throw new Error(delCodeError.message);
          // Dirty, but retries and then returns
          return Cassius(
            controller,
            reqData,
            actions,
            org,
            approvalAnswersData,
            approvalVariableData,
            false,
          );
        }
      }
      if (returnedData !== null) {
        const graphDataArr = convertToGraphData(returnedData);
        const generated_output = graphDataArr.map((m) => ({
          role: m.role === "graph" ? "function" : m.role,
          name: m.role === "graph" ? "plot" : "logs",
          content:
            typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content),
        }));
        if (!codeOk.isValid) {
          generated_output.push({
            role: "error",
            name: "error", // For TS reasons
            content: codeOk.error,
          });
        }
        codeMessage.generated_output = generated_output;
        const { error: insertCodeMessageErr } = await supabase
          .from("approval_answer_messages")
          .update({ generated_output })
          .eq("id", codeMessage.id);
        if (insertCodeMessageErr) {
          console.error("Failed to insert code message", insertCodeMessageErr);
          return false;
        }
        streamInfo({ ...codeMessage, generated_output }); // Send the user's request to the frontend
        if (!codeOk.isValid) return false;
      } else {
        console.error("No output data from generated code");
        void streamInfo({
          role: "error",
          content: "No output data from generated code",
        });
        return false;
      }

      // Explanation message
      let explanationMessage = pastMessages.find(
        (m) => m.message_type === "text",
      );
      if (!explanationMessage) {
        console.log("No explanation message found, generating one...");
        let question = approvalAnswersData.approval_questions.find(
          (q) => q.primary_question,
        );
        if (!question) question = approvalAnswersData.approval_questions[0];
        let nonSystemMessages: ChatGPTMessage[] = [
          {
            role: "user",
            content: getUserMessageText(
              question.text,
              JSON.parse(userRequest!.raw_text),
            ),
          },
          ...(codeMessage.generated_output as ChatGPTMessage[]).filter((m) =>
            ["function"].includes(m.role),
          ),
        ];
        let graphCut: boolean;
        ({ chatGptPrompt: nonSystemMessages, graphDataHidden: graphCut } =
          hideLongGraphOutputs(nonSystemMessages, ["logs", "plot"]));
        const prompt = explainPlotChatPrompt(
          nonSystemMessages,
          "",
          org,
          null,
          graphCut,
        );
        logPrompt(prompt);
        let completeOutput = await streamWithEarlyTermination(
          prompt,
          explanationParams,
          EXPLANATION_MODEL,
          () => false,
          () => {},
          "Explanation message",
          "Reasoning:\n" +
            prompt[prompt.length - 1].content.replace("<thinking>", ""),
          { "</thinking>": "", "<tellUser>": "Tell user:\n" },
        );
        explanationMessage = await addNewMessageToDB(
          completeOutput?.transformed ?? "Failed to generate explanation",
          completeOutput ? "text" : "error",
        );
        streamInfo(explanationMessage);
        generatedMessages.push(explanationMessage);
      }
    }

    // TODO: Suggestions
    // let suggestionsMessage = pastMessages.find(
    //   (m) => m.message_type === "suggestions",
    // );
    // if (!suggestionsMessage) {
    //   console.log("No suggestions message found, generating one...");
    //   // Generate suggestions
  } catch (e) {
    console.error(e?.toString() ?? "Internal server error");
    streamInfo({
      role: "error",
      content: e?.toString() ?? "Internal server error",
    });
    return false;
  }
  return true;
}

function getNextMessageIdx(messages: ApprovalAnswerMessage[]): number {
  return messages.filter((m) => m.message_type !== "suggestions").length;
}
