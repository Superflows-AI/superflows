import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PRICING_PAGE, USAGE_LIMIT } from "../lib/consts";
import { Json } from "../lib/database.types";
import { StreamingStep, StreamingStepInput } from "../lib/models";
import { classNames } from "../lib/utils";
import { AutoGrowingTextArea } from "./autoGrowingTextarea";
import { useProfile } from "./contextManagers/profile";
import { LoadingSpinner } from "./loadingspinner";
import Toggle from "./toggle";
import {
  DevChatItem,
  UserChatItem,
  convertToRenderable,
  functionNameToDisplay,
} from "@superflows/chat-ui-react";
import suggestions1 from "../public/presets/1/suggestions.json";
import suggestions2 from "../public/presets/2/suggestions.json";

export default function PlaygroundChatbot(props: {
  userApiKey: string;
  submitErrorMessage: string;
  userDescription: string;
  mockAPIresponses: boolean;
}) {
  // This is a hack to prevent the effect from running twice in development
  // It's because React strict mode runs in development, which renders everything
  // twice to check for bugs/side effects
  const alreadyRunning = useRef(false);

  const { profile } = useProfile();

  const session = useSession();
  // Get suggestions from past conversations in playground
  const supabase = useSupabaseClient();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [usageLevel, setUsageLevel] = useState<number>(0);
  useEffect(() => {
    (async () => {
      const res = await supabase
        .from("chat_messages")
        .select("*")
        .eq("role", "user")
        // This means it's the first message in a conversation
        .eq("conversation_index", 0)
        .order("created_at", { ascending: false })
        .limit(10);
      if (res.error) throw res.error;
      // Below gets the unique messages and then takes the first 3
      setSuggestions(
        [...new Set(res.data.map((message) => message.content))].slice(0, 3)
      );
    })();
  }, []);
  useEffect(() => {
    if (!profile) return;
    (async () => {
      // Get the usage count for the user
      if (
        profile?.organizations!.is_paid.length === 0 ||
        !profile?.organizations!.is_paid[0].is_premium
      ) {
        // Below is the number of 1st messages sent by the organization's users
        const usageRes = await supabase
          .from("chat_messages")
          .select("*", { count: "exact" })
          .eq("org_id", profile?.organizations!.id)
          .eq("conversation_index", 0)
          .eq("role", "user");
        if (usageRes.error) throw new Error(JSON.stringify(usageRes));
        let numQueriesMade = usageRes.count ?? 0;
        const messagesSent = usageRes.data.map((message) => message.content);
        // This accounts for the suggestions of a preset. The preset adds 3 messages to the DB
        if (
          numQueriesMade &&
          (suggestions1.every((s) => messagesSent.includes(s)) ||
            suggestions2.every((s) => messagesSent.includes(s)))
        ) {
          // 3 suggestions, so reduce by 3
          numQueriesMade -= 3;
        }
        setUsageLevel(numQueriesMade);
      }
    })();
  }, [profile]);

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [devChatContents, setDevChatContents] = useState<StreamingStepInput[]>(
    []
  );
  const [userText, setUserText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);
  const killSwitchClicked = useRef(false);
  const submitButtonClickable =
    !props.submitErrorMessage && userText.length > 3;

  const onChatSubmit = useCallback(
    async (chat: StreamingStepInput[]) => {
      setDevChatContents(chat);
      setUsageLevel((prev) => prev + 1);
      if (loading || alreadyRunning.current) return;
      alreadyRunning.current = true;
      setLoading(true);
      const response = await fetch("/api/v1/answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${profile!.organizations!.api_key}`,
          sessionToken: session?.access_token ?? "",
        },
        body: JSON.stringify({
          user_input: chat[chat.length - 1].content,
          conversation_id: conversationId,
          user_api_key: props.userApiKey,
          user_description: props.userDescription,
          stream: true,
          mock_api_responses: props.mockAPIresponses,
        }),
      });

      if (!response.ok) {
        const responseJson = await response.json();
        throw new Error(responseJson.error);
      }

      const data = response.body;
      if (!data) return;

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let outputMessages = [
        { role: "assistant", content: "" },
      ] as StreamingStepInput[];

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading || killSwitchClicked.current;
        const chunkValue = decoder.decode(value);
        try {
          // Can be multiple server-side chunks in one client-side chunk,
          // separated by "data:"
          chunkValue.split("data:").forEach((chunkOfChunk) => {
            console.log("processing chunk: ", chunkOfChunk);
            if (chunkOfChunk.length === 0) return;
            const data = JSON.parse(chunkOfChunk) as StreamingStep;
            if (conversationId === null) setConversationId(data.id);
            if (data.role !== outputMessages[outputMessages.length - 1]?.role) {
              outputMessages.push({ ...data });
            } else {
              outputMessages[outputMessages.length - 1].content += data.content;
            }
            setDevChatContents([...chat, ...outputMessages]);
          });
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
      alreadyRunning.current = false;
      killSwitchClicked.current = false;
    },
    [
      props.userApiKey,
      profile,
      props.userDescription,
      loading,
      setLoading,
      devChatContents,
      setDevChatContents,
      setUsageLevel,
      killSwitchClicked.current,
      alreadyRunning.current,
      props.mockAPIresponses,
    ]
  );

  const onConfirm = useCallback(
    async (confirm: boolean) => {
      setLoading(true);
      const response = await fetch("/api/v1/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${profile!.organizations!.api_key}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_api_key: props.userApiKey,
          confirm: confirm,
          mock_api_responses: props.mockAPIresponses,
        }),
      });

      const json = await response.json();
      if (response.status === 200) {
        const newChat = [
          ...devChatContents,
          ...(json.outs as StreamingStepInput[]),
        ];
        setDevChatContents(newChat);
        if (confirm) {
          // TODO: This adds an empty message to the DB and GPT chat history.
          //  This is hacky, since all we actually want to do is restart Angela with the existing
          //  chat history. We should refactor this to do that instead.
          await onChatSubmit([...newChat, { role: "user", content: "" }]);
        }
      } else {
        // Handle errors here - add them to chat
        console.error(json.error);
        setDevChatContents((prevState) => [
          ...prevState,
          {
            role: "error",
            content: json.error,
          },
        ]);
      }

      setLoading(false);
    },
    [
      devChatContents,
      setDevChatContents,
      onChatSubmit,
      conversationId,
      setLoading,
      props.userApiKey,
      profile,
      props.mockAPIresponses,
    ]
  );

  useEffect(() => {
    const ele = document.getElementById("scrollable-chat-contents");
    if (ele) {
      ele.scrollTop = ele.scrollHeight;
    }
  }, [devChatContents]);

  return (
    <div className="flex w-full h-full flex-1 flex-col divide-y divide-gray-200 bg-gray-50">
      {/* Header */}
      <div
        className={classNames(
          `pt-6 px-3 pb-4`,
          "text-gray-900 border-b border-gray-200 bg-gray-50"
        )}
      >
        <div className="flex flex-row place-items-center justify-between">
          <div className="flex flex-col place-items-center gap-y-1 text-sm font-bold">
            Developer mode
            <Toggle
              sr={"Developer Mode"}
              enabled={devMode}
              setEnabled={setDevMode}
              size={"sm"}
            />
          </div>
          <h1
            className={classNames(
              "ml-4 block text-2xl font-semibold leading-6"
            )}
          >
            {profile?.organizations?.name} AI
          </h1>
          <div className="flex flex-row justify-end w-48">
            <button
              className={classNames(
                "flex flex-row place-items-center gap-x-1 px-2.5 py-1.5 rounded-md bg-transparent border focus:outline-none focus:ring-2 focus:ring-gray-500 transition",
                "border-gray-300 hover:border-gray-400 text-gray-700"
              )}
              onClick={() => {
                setDevChatContents([]);
                setConversationId(null);
              }}
            >
              <ArrowPathIcon className="h-5 w-5" /> Clear chat
            </button>
          </div>
        </div>
      </div>
      {/* Scrollable chat window */}
      <div
        className="relative flex-1 overflow-y-auto h-full flex flex-col pb-1 pt-36 px-8 md:px-14 lg:px-20"
        id={"scrollable-chat-contents"}
      >
        {profile &&
          process.env.NODE_ENV === "production" &&
          (profile?.organizations!.is_paid.length === 0 ||
            !profile?.organizations!.is_paid[0].is_premium) && (
            <div
              className={classNames(
                "absolute top-28 inset-x-0 flex flex-col justify-center place-items-center text-xl",
                USAGE_LIMIT - usageLevel < 5 ? "text-red-500" : "text-gray-800"
              )}
            >
              <p>
                You&apos;ve used{" "}
                <b className="inline">
                  {usageLevel}/{USAGE_LIMIT}
                </b>{" "}
                of your free-tier queries.
              </p>
              {USAGE_LIMIT <= usageLevel && (
                <a
                  href={PRICING_PAGE}
                  className="mt-4 hover:underline text-blue-600 text-lg"
                >
                  Click here to upgrade to premium tier.
                </a>
              )}
            </div>
          )}
        <div className="mt-6 flex-1 px-1 shrink-0 flex flex-col justify-end gap-y-2">
          {devChatContents.map((chatItem, idx) => {
            if (
              devMode ||
              ["error", "confirmation", "user"].includes(chatItem.role)
            )
              return (
                <DevChatItem
                  key={idx + chatItem.content}
                  chatItem={chatItem}
                  onConfirm={onConfirm}
                />
              );
            else if (chatItem.role === "debug") return;
            else if (chatItem.role === "function") {
              let contentString = "";
              const functionJsonResponse = JSON.parse(chatItem.content) as Json;
              if (
                // Empty array
                (Array.isArray(functionJsonResponse) &&
                  functionJsonResponse.length === 0) ||
                // Empty object
                (functionJsonResponse &&
                  typeof functionJsonResponse === "object" &&
                  Object.entries(functionJsonResponse).length === 0)
              ) {
                if (
                  devChatContents[idx - 1].role === "function" ||
                  (devChatContents[idx + 1] &&
                    devChatContents[idx + 1].role === "function")
                ) {
                  // If the function call is adjacent to other function calls we don't need to tell them it
                  // was empty - otherwise we get a lot of empty messages clogging up the chat interface
                  return <div key={idx + chatItem.content} />;
                }
                contentString = "No data returned";
              } else if (
                functionJsonResponse &&
                typeof functionJsonResponse === "object"
              ) {
                contentString = chatItem.content;
              }
              return (
                <DevChatItem
                  chatItem={{ ...chatItem, content: contentString }}
                  key={idx + chatItem.content}
                />
              );
            }
            return (
              <UserChatItem chatItem={chatItem} key={idx + chatItem.content} />
            );
          })}
          {devChatContents.length === 0 && suggestions.length > 0 && (
            <div className="py-4 px-1.5">
              <h2 className="ml-2 font-medium">Suggestions</h2>
              <div className="mt-1 flex flex-col gap-y-2 place-items-baseline">
                {suggestions.map((text) => (
                  <button
                    key={text}
                    className={classNames(
                      "text-left px-2 py-1 rounded-md border bg-white text-little text-gray-800 shadow hover:shadow-md"
                    )}
                    onClick={() => {
                      setUserText(text);
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Textbox user types into */}
      <div className="flex flex-col pt-4 px-8 md:px-14 lg:px-20">
        <AutoGrowingTextArea
          className={classNames(
            "text-sm resize-none mx-1 rounded py-2 border-gray-300 focus:border-purple-300 focus:ring-1 focus:ring-purple-300 placeholder:text-gray-400",
            userText.length > 300 ? "overflow-auto-y" : "overflow-hidden"
          )}
          placeholder={"Send a message"}
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (submitButtonClickable) {
                onChatSubmit([
                  ...devChatContents,
                  { role: "user", content: userText },
                ]);
                setUserText("");
              }
            }
          }}
        />
        <div className="flex flex-shrink-0 w-full justify-between px-1 pb-4 pt-2 h-20">
          <p
            className={classNames(
              "flex flex-row grow gap-x-1 mx-4 text-red-500 place-items-center justify-center rounded-md px-1 py-2 text-sm font-semibold",
              !props.submitErrorMessage ? "invisible" : "visible"
            )}
          >
            {props.submitErrorMessage}
          </p>
          {loading && (
            <div className="flex justify-center items-center space-x-4 ">
              <button
                className={
                  "flex flex-row gap-x-1 place-items-center ml-4 justify-center rounded-md px-3 py-2 text-sm text-gray-500 shadow-sm bg-gray-100 hover:bg-gray-200 border border-gray-300"
                }
                onClick={() => {
                  killSwitchClicked.current = true;
                  alreadyRunning.current = false;
                  setLoading(false);
                }}
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex justify-center items-center space-x-4 ">
            <button
              type="submit"
              className={classNames(
                "flex flex-row gap-x-1 place-items-center ml-4 justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm",
                loading || !submitButtonClickable
                  ? "bg-gray-400 cursor-not-allowed"
                  : `hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 bg-purple-500`
              )}
              onClick={() => {
                if (!loading && submitButtonClickable) {
                  onChatSubmit([
                    ...devChatContents,
                    { role: "user", content: userText },
                  ]);
                  setUserText("");
                  killSwitchClicked.current = false;
                }
              }}
            >
              {loading && <LoadingSpinner classes="h-4 w-4" />}
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
