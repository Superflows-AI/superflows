import TranscriptSearchSidebar, {
  ConversationSidebarItem,
  getConversations,
  PAGESIZE,
} from "../components/transcripts/transcriptSearchSidebar";
import Headers from "../components/headers";
import React, { useEffect, useRef, useState } from "react";
import { Navbar } from "../components/navbar";
import { ArrowLeftIcon, ShareIcon } from "@heroicons/react/24/outline";
import { HandThumbDownIcon, HandThumbUpIcon } from "@heroicons/react/24/solid";
import { pageGetServerSideProps } from "../components/getServerSideProps";
import { SuperflowsChatItem } from "@superflows/chat-ui-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../lib/database.types";
import { DBChatMessage } from "../lib/types";
import { useProfile } from "../components/contextManagers/profile";
import { classNames } from "../lib/utils";
import Toggle from "../components/toggle";
import { dataAnalysisActionName } from "../lib/v2/builtinActions";
import { GetServerSidePropsContext } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/router";

type FullConversationItem = Pick<
  Database["public"]["Tables"]["conversations"]["Row"],
  "created_at" | "is_playground"
> & {
  chat_messages: Pick<
    DBChatMessage,
    "id" | "role" | "content" | "name" | "conversation_index" | "created_at"
  >[];
  feedback: Pick<
    Database["public"]["Tables"]["feedback"]["Row"],
    | "id"
    | "feedback_positive"
    | "conversation_length_at_feedback"
    | "negative_feedback_text"
  >[];
};

export type TranscriptPageProps = {
  conversations: ConversationSidebarItem[] | null;
  conversationId: number | null;
};

export default function TranscriptPage(props: TranscriptPageProps) {
  const router = useRouter();
  const supabase = useSupabaseClient<Database>();
  const { profile } = useProfile();
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<
    number | null
  >(props.conversationId ?? null);
  const [conversation, setConversation] = useState<FullConversationItem | null>(
    null,
  );
  const [devMode, setDevMode] = useState<boolean>(false);
  const [shareClicked, setShareClicked] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedTranscriptId) {
      if (Object.keys(router.query).length)
        router.replace("/analytics", undefined, {
          shallow: true,
        });
      (async () => {
        const { data, error } = await supabase
          .from("conversations")
          .select(
            "created_at,is_playground,chat_messages(id,role,content,name,conversation_index,created_at),feedback(id,feedback_positive,conversation_length_at_feedback,negative_feedback_text)",
          )
          .eq("id", selectedTranscriptId)
          .order("conversation_index", {
            ascending: true,
            foreignTable: "chat_messages",
          })
          .single();
        if (error) throw new Error(error.message);
        setConversation(data);
      })();
    }
  }, [selectedTranscriptId]);

  return (
    <div className="min-h-screen bg-gray-800">
      <Headers />
      <Navbar current={"Transcripts"} />
      <div className={"flex flex-row w-screen overflow-x-hidden"}>
        <TranscriptSearchSidebar
          {...props}
          selectedTranscriptId={selectedTranscriptId}
          setSelectedTranscriptId={setSelectedTranscriptId}
        />
        <div
          ref={ref}
          className={classNames(
            "relative max-h-[calc(100vh-4rem)] flex flex-grow",
            selectedTranscriptId ? "bg-white" : "bg-gray-800",
          )}
        >
          {selectedTranscriptId && (
            <>
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
              <div className="absolute top-2 right-6 flex flex-row place-items-center gap-x-1.5">
                <div className="text-sm text-gray-800">
                  {shareClicked && "Copied"}
                </div>
                <button
                  className="peer flex flex-col tracking-tight leading-3 place-items-center text-center gap-y-1 text-xs text-gray-600 bg-white px-1 py-1 rounded-md border hover:shadow transition active:bg-gray-100"
                  onClick={() => {
                    setShareClicked(true);
                    setTimeout(() => setShareClicked(false), 1000);
                    navigator.clipboard.writeText(
                      `${window.location.origin}/analytics?id=${selectedTranscriptId}`,
                    );
                  }}
                >
                  <ShareIcon className={"h-5 w-5 text-gray-600"} />
                </button>
                <div className="popup right-0 top-8 w-28 text-sm">
                  Copy link to this transcript
                </div>
              </div>
            </>
          )}
          {!selectedTranscriptId ? (
            <div
              className={
                "px-20 h-full flex flex-row gap-x-4 text-xl text-gray-300 place-items-center justify-center"
              }
            >
              <ArrowLeftIcon className={"h-10 w-10 text-gray-300"} /> Select a
              conversation to view its transcript
            </div>
          ) : (
            <div
              className={
                "pt-4 min-h-[calc(100vh-4rem)] w-full px-8 lg:px-24 pb-8 lg:pb-10 overflow-y-auto flex flex-col bg-white overflow-x-hidden"
              }
            >
              {conversation?.chat_messages &&
                [...conversation.chat_messages, ...conversation.feedback]
                  .sort((a, b) => {
                    const aNum =
                      "role" in a
                        ? a.conversation_index
                        : a.conversation_length_at_feedback + 0.5;
                    const bNum =
                      "role" in b
                        ? b.conversation_index
                        : b.conversation_length_at_feedback + 0.5;
                    return aNum - bNum;
                  })
                  .map((m, idx) => {
                    // Chat messages:
                    if ("role" in m) {
                      if (
                        m.role === "function" &&
                        ["plot", dataAnalysisActionName].includes(m.name!)
                      ) {
                        try {
                          const newContent = JSON.parse(m.content);
                          if (typeof newContent.data === "string") {
                            throw new Error(
                              "Data is a string when it should be an array",
                            );
                          }

                          // @ts-ignore
                          m.role = "graph";
                          m.content = newContent;
                        } catch (e) {
                          // Either cut for brevity or "instruct_coder" and logs
                          if (
                            m.name === "plot" ||
                            (!m.content.startsWith("Logs") &&
                              !m.content.startsWith("Failed to execute code") &&
                              !m.content.toLowerCase().startsWith("error"))
                          ) {
                            return (
                              <div className={"w-full px-8"}>
                                <div className="rounded-md border border-gray-200 bg-sky-50 px-6 pt-6 pb-12 mt-1">
                                  Plot: User was shown a data-heavy plot
                                  <p className="text-sm text-gray-500">
                                    Very large plots aren&apos;t stored by
                                    Superflows to avoid performance issues.
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        }
                      }
                      const width = ref.current ? ref.current.offsetWidth : 600;
                      return (
                        <div key={m.id}>
                          <SuperflowsChatItem
                            // @ts-ignore
                            chatItem={m}
                            devMode={devMode}
                            AIname={profile?.organizations?.name}
                            prevAndNextChatRoles={[
                              conversation.chat_messages[idx - 1]?.role,
                              conversation.chat_messages[idx + 1]?.role,
                            ]}
                            scrollRef={ref}
                            width={width}
                          />
                          {/* Workaround to put AI name above message(!) */}
                          {m.role === "user" &&
                            conversation.chat_messages[idx + 1]?.role !==
                              "assistant" &&
                            !devMode && (
                              <SuperflowsChatItem
                                chatItem={{ role: "assistant", content: "" }}
                                AIname={profile?.organizations?.name}
                                devMode={false}
                                prevAndNextChatRoles={["user"]}
                                width={width}
                                scrollRef={ref}
                              />
                            )}
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={m.id}
                          className={classNames(
                            "flex flex-col mt-2 w-full border rounded-md p-4",
                            m.feedback_positive
                              ? "border-green-500 bg-green-200"
                              : "border-red-500 bg-red-200",
                          )}
                        >
                          <div
                            className={
                              "flex flex-row gap-x-2 place-items-center"
                            }
                          >
                            <div className={"font-medium"}>Feedback:</div>
                            {m.feedback_positive ? (
                              <HandThumbUpIcon
                                className={"h-5 w-5 text-green-500"}
                              />
                            ) : (
                              <HandThumbDownIcon
                                className={"h-5 w-5 text-red-500"}
                              />
                            )}
                          </div>
                          {!m.feedback_positive && (
                            <div className="text-sm">
                              {m.negative_feedback_text
                                ? `Feedback: ${m.negative_feedback_text}`
                                : "No comment provided"}
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = getAnalyticsServerSideProps;
export async function getAnalyticsServerSideProps(
  ctx: GetServerSidePropsContext,
) {
  const signInProps = await pageGetServerSideProps(ctx);
  if (signInProps.redirect) return signInProps;

  const supabase = createServerSupabaseClient(ctx);
  const onChange = () => {};
  const checked = true;
  const conversations = await getConversations(
    0,
    PAGESIZE,
    // TODO: Grab from URL if set
    [
      { id: "1", name: "No Feedback", checked, onChange },
      { id: "2", name: "Positive Feedback", checked, onChange },
      { id: "3", name: "Negative Feedback", checked, onChange },
    ],
    [
      { id: "1", name: "From Playground", checked, onChange },
      { id: "2", name: "From API", checked, onChange },
    ],
    supabase,
  );
  return {
    props: {
      ...signInProps.props,
      conversations,
      conversationId: ctx.query.id ?? null,
    },
  };
}
