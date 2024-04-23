import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SuperflowsChatItem } from "@superflows/chat-ui-react";
import { useProfile } from "../contextManagers/profile";
import {
  CheckCircleIcon,
  CodeBracketIcon,
  EyeIcon,
  InformationCircleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleIconSolid } from "@heroicons/react/24/solid";
import classNames from "classnames";
import FollowUpSuggestions, { EditFollowUpsModal } from "./followUps";
import { SupabaseClient } from "@supabase/supabase-js";
import { parseFilteringOutputv3 } from "../../lib/v3/prompts_parsers/filtering";
import { parseRoutingOutputv3 } from "../../lib/v3/prompts_parsers/routing";
import { Action } from "../../lib/types";
import { snakeToCamel } from "../../lib/utils";
import {
  EditCodeModal,
  EditFilteringModal,
  EditRouteModal,
} from "./editModals";
import {
  AssistantMessage,
  ChatItemType,
  StreamingStep,
  StreamingStepInput,
  UserMessage,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import QuestionText from "./question";
import { LoadingSpinner } from "../loadingspinner";
import { getUserMessageText } from "../../lib/v3/utils";
import { BoltIcon } from "@heroicons/react/24/solid";
import Toggle from "../toggle";
import { UIAnswerType, UIMessageData } from "./types";
import WarningModal from "../warningModal";

export function VerifyQuestionScreen(props: {
  data: {
    id: string;
    is_generating: boolean;
    approved: boolean;
    generation_failed: boolean;
    approval_answer_groups: { name: string }[];
    group_id: string;
  };
}) {
  const { profile } = useProfile();
  const router = useRouter();
  const supabase = useSupabaseClient<Database>();

  const [questionText, setQuestionText] = useState<string | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<StreamingStepInput[]>([]);
  const [allMessageData, setAllMessageData] = useState<UIMessageData[]>([]);
  const [followUps, setFollowups] = useState<
    (UIMessageData & { suggestions: string[] }) | null
  >(null);
  const [editFollowUpsModalText, setEditFollowUpsModalText] = useState<
    string[] | null
  >(null);
  const [answer, setAnswer] = useState<UIAnswerType>({
    ...props.data,
    approval_questions: [],
  });
  const [allActions, setAllActions] = useState<Action[] | null>(null);
  const [thoughtsVisible, setThoughtsVisible] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<
    "code" | "filtering" | "routing" | null
  >(null);
  const [userApiKey, setUserApiKey] = useState(() => {
    // Grab API key from localstorage
    const userApiKeyFromLocalStorage = localStorage.getItem("userApiKey");
    if (!userApiKeyFromLocalStorage) {
      // TODO: Handle this much better
      console.error("No userApiKey in localstorage!");
      return;
    }
    return userApiKeyFromLocalStorage;
  });
  const [devMode, setDevMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { answer, messagesToViz, messagesData } = await pullInMessageData(
        props.data.id,
        supabase,
      );
      const primaryQuestion = answer.approval_questions.find(
        (q) => q.primary_question,
      );
      if (!primaryQuestion) throw new Error("No primary question found");
      setQuestionText(primaryQuestion.text);
      setAnswer(answer);
      if (!messagesToViz.length) return;
      setMessages(messagesToViz);
      setAllMessageData(messagesData);
      const followUpsMessageData = messagesData.find(
        (m) => m.message_type === "suggestions",
      );
      if (followUpsMessageData) {
        setFollowups({
          ...followUpsMessageData,
          suggestions: followUpsMessageData.raw_text
            .split(/(?:^|\n)- /g)
            .filter(Boolean),
        });
      }
      const { data: allActionData, error: allActionError } = await supabase
        .from("actions")
        .select("*")
        .match({ org_id: profile!.org_id!, active: true });
      if (allActionError) throw new Error(allActionError.message);
      setAllActions(allActionData);
    })();
  }, [profile, router.query.id]);

  const regenAnswer = useCallback(
    async (startFrom: number) => {
      /** Regenerate answer, streaming new messages in as they are generated. **/
      setLoading(true);
      // Empty DB of messages which aren't needed any more
      const ids = allMessageData
        .filter(
          (m) =>
            m.message_type === "error" ||
            (m.message_idx >= startFrom && m.message_type !== "suggestions"),
        )
        .map((m) => m.id);

      const { error: updateAnswerErr } = await supabase
        .from("approval_answers")
        .update({ generation_failed: false, approved: false })
        .match({ id: props.data.id });
      if (updateAnswerErr) throw new Error(updateAnswerErr.message);

      const { error: deleteErr } = await supabase
        .from("approval_answer_messages")
        .delete()
        .in("id", ids);
      if (deleteErr) throw new Error(deleteErr.message);

      // Refresh UI
      let { messagesToViz, messagesData, answer } = await pullInMessageData(
        props.data.id,
        supabase,
      );
      setMessages(messagesToViz);
      setAllMessageData(messagesData);

      let responseJson: { error: string };
      const res = await fetch("/api/v3/generate-answer-offline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer_id: props.data.id,
          user_api_key: userApiKey,
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          responseJson = {
            error: `${res.status}: ${res.statusText}. Check the hostname used is correct ${res.url}`,
          };
        } else {
          try {
            responseJson = (await res.json()) as {
              error: string;
            };
          } catch (e) {
            responseJson = {
              error: `${res.status}: ${res.statusText}`,
            };
          }
        }
        console.error(responseJson.error);
        setMessages([
          ...messagesToViz,
          {
            role: "error",
            content: responseJson.error,
          },
        ]);
        setLoading(false);
        return;
      }
      const data = res.body;
      if (!data) return;

      const reader = data.getReader();
      const decoder = new TextDecoder();
      const outputMessages = [
        { role: "assistant", content: "" },
      ] as ChatItemType[];
      let incompleteChunk = "";

      let done = false,
        value: Uint8Array | undefined;
      while (!done) {
        ({ value, done } = await reader.read());
        const chunkValue = incompleteChunk + decoder.decode(value);
        // One server-side chunk can be split across multiple client-side chunks,
        // so we catch errors thrown by JSON.parse() and append the next chunk
        try {
          // Can be multiple server-side chunks in one client-side chunk,
          // separated by "data: ". The .slice(6) removes the "data: " at
          // the start of the string
          chunkValue
            .slice(6)
            .split("data: ")
            .forEach((chunkOfChunk) => {
              if (chunkOfChunk.length === 0) return;
              const data = JSON.parse(chunkOfChunk) as StreamingStep;
              if (
                // Different message role from the last message
                data.role !== outputMessages[outputMessages.length - 1]?.role ||
                // Not the assistant (e.g. function, debug etc where the entire contents of a message is 1 chunk)
                data.role !== "assistant" ||
                // Includes explicit new message tag
                data.content.includes("<<[NEW-MESSAGE]>>")
              ) {
                if (
                  data.role === "assistant" &&
                  data.content.includes("<<[NEW-MESSAGE]>>")
                )
                  data.content = data.content.replace("<<[NEW-MESSAGE]>>", "");
                // Add new message
                outputMessages.push({ ...data });
              } else {
                // Append message data to preceding message
                outputMessages[outputMessages.length - 1].content +=
                  data.content;
              }
              // setMessages([...messagesToViz, ...outputMessages]);
            });
          ({ messagesToViz, messagesData, answer } = await pullInMessageData(
            props.data.id,
            supabase,
          ));
          setMessages(messagesToViz);
          setAllMessageData(messagesData);
          setAnswer(answer);
          incompleteChunk = "";
        } catch (e) {
          console.warn(
            "If there is a JSON parsing error below, this is likely caused by a very large API response that the AI won't be able to handle.\n\n" +
              "We suggest filtering the API response to only include the data you need by setting the 'Include all keys in responses' and " +
              "'Include these keys in response' fields at the bottom of the edit action modal at https://dashboard.superflows.ai\n\n",
            e,
          );
          incompleteChunk += chunkValue;
        }
      }
      setLoading(false);
      ({ messagesToViz, messagesData, answer } = await pullInMessageData(
        props.data.id,
        supabase,
      ));
      setMessages(messagesToViz);
      setAllMessageData(messagesData);
      setAnswer(answer);
    },
    [
      allMessageData,
      loading,
      setLoading,
      messages,
      setMessages,
      setAllMessageData,
      userApiKey,
    ],
  );

  return (
    <>
      {!!messages.length && allMessageData && (
        <>
          {allMessageData.find((m) => m.message_type === "code") && answer && (
            <EditCodeModal
              open={showModal === "code"}
              setOpen={() => setShowModal(null)}
              messageData={
                allMessageData.find((m) => m.message_type === "code")!
              }
              answer={answer}
              actions={
                allActions
                  ? allActions.filter((a) =>
                      parseFilteringOutputv3(
                        allMessageData.find(
                          (m) => m.message_type === "filtering",
                        )!.raw_text,
                        allActions.map((a) => snakeToCamel(a.name)),
                      ).selectedFunctions.includes(snakeToCamel(a.name)),
                    )
                  : []
              }
              runCode={async (code: string) => {
                // Update code message in DB, then regenerate answer
                const codeMessage = allMessageData.find(
                  (m) => m.message_type === "code",
                );
                if (!codeMessage) {
                  console.error("No code message in allMessageData!");
                  return;
                }
                const { error: updateCodeErr } = await supabase
                  .from("approval_answer_messages")
                  .update({ raw_text: code, generated_output: [] })
                  .eq("id", codeMessage.id);
                if (updateCodeErr) throw new Error(updateCodeErr.message);

                // Regenerate answer using new code
                await regenAnswer(codeMessage.message_idx + 1);
              }}
            />
          )}
          {allMessageData.find((m) => m.message_type === "filtering") && (
            <EditFilteringModal
              open={showModal === "filtering"}
              setOpen={() => setShowModal(null)}
              messageData={
                allMessageData.find((m) => m.message_type === "filtering")!
              }
              actions={
                allActions
                  ? allActions.map((a) => ({
                      name: snakeToCamel(a.name),
                      description: a.description,
                    }))
                  : []
              }
              setChosenActions={async (actions: string[]) => {
                setAllMessageData((prev) => {
                  if (!prev) return prev;
                  return prev.map((m) => {
                    if (m.message_type === "filtering") {
                      return {
                        ...m,
                        raw_text: m.raw_text.replace(
                          /<selected_functions>[\s\S]+<\/selected_functions>/,
                          `<selected_functions>\n${actions.join(
                            "\n",
                          )}\n</selected_functions>`,
                        ),
                      };
                    }
                    return m;
                  });
                });
                setShowModal(null);
                await regenAnswer(
                  allMessageData.find((m) => m.message_type === "filtering")!
                    .message_idx + 1,
                );
              }}
            />
          )}
          <EditRouteModal
            open={showModal === "routing"}
            setOpen={() => setShowModal(null)}
            messageData={
              allMessageData.find((m) => m.message_type === "routing")!
            }
            setRoute={async (route: "DOCS" | "CODE") => {
              setAllMessageData((prev) => {
                if (!prev) return prev;
                return prev.map((m) => {
                  if (m.message_type === "routing") {
                    return {
                      ...m,
                      raw_text: m.raw_text.replace(
                        /<choice>[\s\S]+<\/choice>/,
                        `<choice>${route}</choice>`,
                      ),
                    };
                  }
                  return m;
                });
              });
              setShowModal(null);
              await regenAnswer(
                allMessageData.find((m) => m.message_type === "routing")!
                  .message_idx + 1,
              );
            }}
          />
        </>
      )}
      {!!messages.length && followUps && (
        <EditFollowUpsModal
          id={followUps ? followUps.id : ""}
          suggestions={editFollowUpsModalText}
          setSuggestions={(suggestions: string[] | null) => {
            setEditFollowUpsModalText(null);
            if (suggestions === null) return;
            setFollowups({
              ...followUps,
              suggestions: suggestions,
            });
          }}
        />
      )}
      <WarningModal
        open={warningModalOpen}
        setOpen={setWarningModalOpen}
        title={"Are you sure you want to regenerate the answer?"}
        description={
          "This will overwrite the current generated answer with a new one. This action cannot be undone."
        }
        actionName={"Regenerate Answer"}
        actionColour={"red"}
        action={async () => regenAnswer(0)}
      />
      <div className="bg-white relative h-[calc(100vh-4rem)] w-full flex flex-col place-items-center max-w-3xl">
        <div className="absolute top-0.5 left-1.5 flex flex-col tracking-tight leading-3 place-items-center text-center gap-y-1 text-xs text-gray-600 bg-white rounded px-1 py-1.5 z-20">
          Developer
          <br />
          mode
          <Toggle
            sr={"Dev Mode"}
            enabled={devMode}
            setEnabled={setDevMode}
            size={"sm"}
          />
        </div>
        <div
          ref={scrollRef}
          className="absolute top-3 mx-20 z-10 peer rounded-md mb-3 flex place-items-center py-1.5 px-4 border bg-gray-100 border-gray-700 text-gray-800 text-lg font-medium"
        >
          {questionText && <QuestionText questionText={questionText} />}
          <InformationCircleIcon className="h-6 w-6 text-gray-600 ml-2" />
        </div>
        <div className={classNames("popup bg-gray-800 right-10 top-14 w-150")}>
          <p className="text-gray-400">Equivalent to:</p>
          {answer.approval_questions
            .filter((q) => !q.primary_question)
            .map((q, idx) => (
              <div key={idx} className="border-t">
                <QuestionText questionText={q.text} />
              </div>
            ))}
        </div>
        <div className="pt-16 flex-1 bg-white px-4 w-full flex flex-col place-items-center overflow-x-hidden overflow-y-auto mb-16">
          {messages.map((m, idx) => {
            return (
              <SuperflowsChatItem
                key={idx}
                chatItem={m}
                devMode={devMode}
                AIname={profile?.organizations?.name}
                prevAndNextChatRoles={[
                  messages[idx - 1]?.role,
                  messages[idx + 1]?.role,
                ]}
                // @ts-ignore
                precedingUrls={messages[idx - 1]?.urls}
                scrollRef={scrollRef}
                width={scrollRef.current ? scrollRef.current.offsetWidth : 600}
              />
            );
          })}
          {loading && (
            <div
              className={classNames(
                allMessageData.length > 0 ? "mt-2" : "mt-10",
                "mb-3",
              )}
            >
              <SuperflowsChatItem
                chatItem={{ role: "loading", content: "Thinking" }}
                devMode={false}
                prevAndNextChatRoles={[undefined, undefined]}
                scrollRef={scrollRef}
                width={scrollRef.current ? scrollRef.current.offsetWidth : 600}
              />
            </div>
          )}
          {answer.is_generating && !loading && (
            <div className="mt-40 w-full flex place-items-center justify-center flex-col gap-y-2 text-lg">
              <LoadingSpinner classes={"h-16 w-16"} />
              Generating answer...
              <br />
              <p className="text-sm text-gray-500">
                Refresh page to see progress
              </p>
              <br />
              <p className="text-sm text-gray-500">
                If it doesn&apos;t progress after 1 minute,{" "}
                <button
                  className="inline text-sky-500 hover:underline"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("approval_answers")
                      .update({ is_generating: false })
                      .match({ id: props.data.id });
                    if (error) throw new Error(error.message);

                    // Regenerate answer using new code
                    await regenAnswer(messages.length + 1);
                  }}
                >
                  retry here
                </button>
              </p>
            </div>
          )}
          {allMessageData && answer.generation_failed && !loading && (
            <button
              className="mb-3 mt-2 border rounded-md px-3 py-1 flex flex-row gap-x-1 place-items-center text-lg hover:bg-purple-100"
              onClick={async () => {
                // Regenerate answer using new code
                await regenAnswer(allMessageData.length + 1);
              }}
            >
              <BoltIcon className="h-5 w-5" /> Generate from here
            </button>
          )}
          {followUps && (
            <FollowUpSuggestions
              followUpSuggestions={followUps.suggestions}
              onClick={() => setEditFollowUpsModalText(followUps.suggestions)}
            />
          )}
          {!messages.length && !loading && (
            <button
              className="mb-3 mt-32 border border-gray-400 rounded-md px-4 py-2 flex flex-row gap-x-1 place-items-center text-xl hover:bg-purple-100"
              onClick={async () => regenAnswer(0)}
            >
              <BoltIcon className="h-5 w-5" /> Generate Answer
            </button>
          )}
        </div>
        {!!messages.length && (
          <div className="z-10 absolute bottom-0 w-full flex justify-between">
            <button
              className={classNames(
                "w-1/2 transition text-gray-200 py-2",
                loading
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-red-800 hover:bg-red-700",
              )}
              onClick={() => {
                if (loading) return;
                setWarningModalOpen(true);
              }}
            >
              Regenerate
            </button>
            <button
              className={classNames(
                "w-1/2 transition text-gray-200 py-2",
                loading ||
                  answer.approved ||
                  allMessageData.some((m) => m.message_type === "error")
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-green-800 hover:bg-green-700",
              )}
              onClick={async () => {
                if (
                  loading ||
                  answer.approved ||
                  allMessageData.some((m) => m.message_type === "error")
                )
                  return;

                // Generate description for this answer now it's been approved!
                void fetch("/api/v3/generate-answer-description", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    answer_id: props.data.id,
                  }),
                });

                const { error } = await supabase
                  .from("approval_answers")
                  .update({ approved: true })
                  .match({ id: props.data.id });
                if (error) throw new Error(error.message);
                void router.push(
                  `/approval/${await getNextAnswerId(
                    supabase,
                    props.data.group_id,
                  )}`,
                );
              }}
            >
              Approve
            </button>
          </div>
        )}
      </div>
      <div className="w-80 border-l border-l-gray-700 flex flex-col overflow-y-auto h-[calc(100vh-4rem)]">
        <h2 className="text-lg p-2 text-gray-200">Edit Answer</h2>
        {allMessageData &&
          allMessageData
            .filter((m) => m.message_type !== "user")
            .map((messageData) => {
              if (messageData.message_type === "routing") {
                const parsedOut = parseRoutingOutputv3(messageData.raw_text);
                if (!parsedOut) return undefined;
                return (
                  <div
                    key={`${messageData.id}-${parsedOut.choice}`}
                    className="p-2 border-t border-t-gray-700"
                  >
                    <h2 className="text-base text-gray-300 mb-2">
                      Answer Type
                    </h2>
                    {thoughtsVisible && (
                      <div
                        className={
                          "mb-1 whitespace-pre-line rounded px-2 py-1 bg-gray-750 text-gray-200 text-sm"
                        }
                      >
                        <p className="text-gray-400 text-sm">Reason:</p>
                        {parsedOut.thoughts}
                      </div>
                    )}
                    <div className="py-1 px-3 border border-gray-400 rounded bg-gray-850 w-fit">
                      <p className="text-gray-200">
                        {parsedOut.choice === "CODE" ? "API" : "Docs"}
                      </p>
                    </div>
                    <div className="flex flex-row gap-x-2 mt-2">
                      <button
                        className="flex gap-x-1 place-items-center text-gray-400 text-little px-1.5 py-1 border border-transparent transition hover:border-gray-600 rounded hover:text-gray-300"
                        onClick={() => setShowModal("routing")}
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                        Edit
                      </button>
                      {!thoughtsVisible && (
                        <button
                          className="flex gap-x-1 place-items-center text-gray-400 text-little px-1.5 py-1 border border-transparent transition hover:border-gray-600 rounded hover:text-gray-300"
                          onClick={() => setThoughtsVisible(true)}
                        >
                          <EyeIcon className="h-5 w-5" />
                          View Reason
                        </button>
                      )}
                    </div>
                  </div>
                );
              } else if (messageData.message_type === "filtering") {
                if (!allActions) return undefined;
                const filteringParsed = parseFilteringOutputv3(
                  messageData.raw_text,
                  allActions.map((a) => snakeToCamel(a.name)),
                );
                return (
                  <div
                    key={messageData.id}
                    className="p-2 border-t border-t-gray-700"
                  >
                    <h2 className="text-base text-gray-300 mb-2">
                      Relevant Actions
                    </h2>
                    {thoughtsVisible && (
                      <div
                        className={
                          "mb-1 whitespace-pre-line rounded px-2 py-1 bg-gray-750 text-gray-200 text-sm"
                        }
                      >
                        <p className="text-gray-400 text-sm">Reason:</p>
                        {filteringParsed.thoughts}
                      </div>
                    )}
                    <div className="flex flex-col">
                      {filteringParsed.selectedFunctions.map((fn) => (
                        <p
                          key={fn}
                          className="w-fit px-2 py-0.5 rounded border border-gray-400 bg-gray-850 text-gray-100 text-sm"
                        >
                          {fn}
                        </p>
                      ))}
                    </div>
                    <div className="flex flex-row gap-x-2 mt-2">
                      <button
                        className="flex gap-x-1 place-items-center text-gray-400 text-little px-1.5 py-1 border border-transparent transition hover:border-gray-600 rounded hover:text-gray-300"
                        onClick={() => setShowModal("filtering")}
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                        Edit
                      </button>
                      {!thoughtsVisible && (
                        <button
                          className="flex gap-x-1 place-items-center text-gray-400 text-little px-1.5 py-1 border border-transparent transition hover:border-gray-600 rounded hover:text-gray-300"
                          onClick={() => setThoughtsVisible(true)}
                        >
                          <EyeIcon className="h-5 w-5" />
                          View Reason
                        </button>
                      )}
                    </div>
                  </div>
                );
              } else if (messageData.message_type === "code") {
                return (
                  <div
                    key={messageData.id}
                    className="p-2 border-t border-t-gray-700"
                  >
                    <h2 className="text-base text-gray-300 mb-2">Code</h2>
                    <div className="flex flex-row gap-x-2 mt-2">
                      <button
                        className="flex gap-x-1 place-items-center text-gray-400 text-little px-1.5 py-1 border border-transparent transition hover:border-gray-600 rounded hover:text-gray-300"
                        onClick={() => setShowModal("code")}
                      >
                        <CodeBracketIcon className="h-5 w-5" />
                        View & Edit
                      </button>
                    </div>
                  </div>
                );
              }
            })}
        {answer.approved && (
          <div className="mt-6 mx-6 py-2 px-3 rounded-md text-lg border border-gray-500 font-medium flex flex-col place-items-center text-gray-800 bg-gray-100">
            Approved
            <CheckCircleIconSolid className="h-7 w-7 text-green-500" />
          </div>
        )}
      </div>
    </>
  );
}

async function getNextAnswerId(
  supabase: SupabaseClient<Database>,
  groupId: string,
): Promise<string | null> {
  // First, look for any unapproved answers in the same group
  const { data: unapprovedData, error: unapprovedError } = await supabase
    .from("approval_answers")
    .select("id, group_id")
    .match({ approved: false, is_generating: false });
  if (unapprovedError) throw new Error(unapprovedError.message);
  if (unapprovedData.length) {
    const nextUnapproved = unapprovedData.find(
      (item) => item.group_id === groupId,
    );
    console.log("nextUnapproved", nextUnapproved);
    if (nextUnapproved) return nextUnapproved.id;
    return unapprovedData[0].id;
  }
  return null;
}

async function pullInMessageData(
  answer_id: string,
  supabase: SupabaseClient<Database>,
): Promise<{
  answer: UIAnswerType;
  messagesData: UIMessageData[];
  messagesToViz: StreamingStepInput[];
}> {
  const { data, error } = await supabase
    .from("approval_answers")
    .select(
      "id,group_id,org_id,is_generating,generation_failed,approved, approval_questions(text, primary_question), approval_answer_messages(id, raw_text, message_idx, message_type, generated_output)",
    )
    .match({ id: answer_id })
    .single();
  if (error) throw new Error(error.message);
  const primaryQuestion = data.approval_questions.find(
    (q) => q.primary_question,
  );
  if (!primaryQuestion) throw new Error("No primary question found");

  const messagesToViz = data.approval_answer_messages
    .sort((a, b) => a.message_idx - b.message_idx)
    .map((m) => {
      if (m.message_type === "user") {
        const userText = getUserMessageText(
          primaryQuestion.text,
          JSON.parse(m.raw_text),
        );
        return { role: "user", content: userText } as UserMessage;
      } else if (m.message_type === "text")
        return { role: "assistant", content: m.raw_text } as AssistantMessage;
      else if (m.message_type === "code") {
        return m.generated_output.map((item) =>
          item &&
          typeof item === "object" &&
          "name" in item &&
          "content" in item &&
          item.name === "plot"
            ? {
                role: "graph",
                // @ts-ignore
                content: JSON.parse(item.content),
              }
            : item,
        );
      } else if (m.message_type === "error") {
        return { role: "error", content: m.raw_text };
      } else if (m.message_type === "function") {
        return m.generated_output.map(
          (item) =>
            item &&
            typeof item === "object" &&
            "name" in item &&
            "content" in item &&
            item,
        );
      }
    })
    .flat()
    .filter(Boolean) as StreamingStepInput[];
  return {
    answer: data,
    messagesData: data.approval_answer_messages,
    messagesToViz,
  };
}
