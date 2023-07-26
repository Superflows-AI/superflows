import {
  ArrowPathIcon,
  CheckCircleIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  LightBulbIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PRICING_PAGE, USAGE_LIMIT } from "../lib/consts";
import { StreamingStep, StreamingStepInput } from "../lib/models";
import { parseOutput } from "../lib/parsers/parsers";
import {
  classNames,
  convertToRenderable,
  functionNameToDisplay,
  parseTableTags,
} from "../lib/utils";
import { AutoGrowingTextArea } from "./autoGrowingTextarea";
import { useProfile } from "./contextManagers/profile";
import { LoadingSpinner } from "./loadingspinner";
import Toggle from "./toggle";
import { ToConfirm } from "../pages/api/v1/answers";
import { Json } from "../lib/database.types";

export default function PlaygroundChatbot(props: {
  userApiKey: string;
  submitErrorMessage: string;
  userDescription: string;
  testMode: boolean;
}) {
  // This is a hack to prevent the effect from running twice in development
  // It's because React strict mode runs in development, which renders everything
  // twice to check for bugs/side effects
  const alreadyRunning = useRef(false);

  const { profile } = useProfile();

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
        // Below is the number of messages sent by the organization's users
        const usageRes = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("org_id", profile?.organizations!.id)
          .eq("role", "user");
        if (usageRes.error) throw new Error(JSON.stringify(usageRes));
        const numQueriesMade = usageRes.count ?? 0;
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
        },
        body: JSON.stringify({
          user_input: chat[chat.length - 1].content,
          conversation_id: conversationId,
          user_api_key: props.userApiKey,
          user_description: props.userDescription,
          stream: true,
          test_mode: props.testMode,
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
      props.testMode,
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
          org_id: profile!.organizations!.id,
          confirm: confirm,
          test_mode: props.testMode,
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
      props.testMode,
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
          process.env.VERCEL_ENV === "production" &&
          (profile?.organizations!.is_paid.length === 0 ||
            !profile?.organizations!.is_paid[0].is_premium ||
            USAGE_LIMIT <= usageLevel) && (
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
                  devChatContents[idx + 1].role === "function"
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
                contentString = convertToRenderable(
                  functionJsonResponse,
                  `${functionNameToDisplay(chatItem?.name ?? "")} result`
                );
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

const fullRegex = /(<button>.*?<\/button>)|(<table>.*?<\/table>)|([\s\S]+?)/g;
let feedbackRegex = /<button>Feedback<\/button>/;
let buttonRegex = /<button>(?![^<]*<button>)(.*?)<\/button>/;
let tableRegex = /<table>(.*?)<\/table>/;

export function splitContentByParts(content: string): string[] {
  /** We split the message into different parts (based on whether they're a <table>, <button> or just text),
   * and then render parts one-by-one **/
  let match;
  let matches = [];
  while ((match = fullRegex.exec(content)) !== null) {
    if (match[1]) matches.push(match[1]);
    if (match[2]) matches.push(match[2]);
    if (match[3]) {
      // This is because the 3rd match group is lazy, so only captures 1 character at a time
      const prev = matches[matches.length - 1];
      if (
        matches.length === 0 ||
        (prev.startsWith("<") && prev.endsWith(">"))
      ) {
        matches.push(match[3]);
      } else matches[matches.length - 1] += match[3];
    }
  }
  return matches;
}

function DevChatItem(props: {
  chatItem: StreamingStepInput;
  onConfirm?: (confirm: boolean) => void;
}) {
  const { profile } = useProfile();
  const [saveSuccessfulFeedback, setSaveSuccessfulFeedback] =
    useState<boolean>(false);
  // Confirmed is null if the user hasn't confirmed yet, true if the user has confirmed, and false if the user has cancelled
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  useEffect(() => {
    if (saveSuccessfulFeedback) {
      setTimeout(() => {
        setSaveSuccessfulFeedback(false);
      }, 3000);
    }
  }, [saveSuccessfulFeedback]);

  let content = props.chatItem.content;
  if (!content) return <></>;
  if (props.chatItem.role === "confirmation") {
    const toConfirm = JSON.parse(props.chatItem.content) as ToConfirm[];
    content = `The following action${
      toConfirm.length > 1 ? "s require" : " requires"
    } confirmation:\n\n${toConfirm
      .map((action, idx) => {
        return `${convertToRenderable(
          action.args,
          functionNameToDisplay(action.name)
        )}`;
      })
      .join("")}`;
  }

  const matches = splitContentByParts(content);

  return (
    <div
      className={classNames(
        "py-4 px-1.5 rounded flex flex-col",
        props.chatItem.role === "user"
          ? "bg-gray-100 text-right place-items-end"
          : "bg-gray-200 text-left place-items-baseline",
        props.chatItem.role === "error"
          ? "bg-red-200"
          : props.chatItem.role === "debug"
          ? "bg-green-100"
          : props.chatItem.role === "function"
          ? "bg-green-200"
          : props.chatItem.role === "confirmation"
          ? "bg-blue-100"
          : ""
      )}
    >
      <p className="text-xs text-gray-600 mb-1">
        {props.chatItem.role === "assistant"
          ? profile?.organizations?.name + " AI"
          : props.chatItem.role === "function"
          ? "Function called"
          : props.chatItem.role === "confirmation"
          ? "Confirmation required"
          : props.chatItem.role === "user"
          ? "You"
          : props.chatItem.role === "debug"
          ? "Debug"
          : props.chatItem.role === "error"
          ? "Error"
          : "Unknown"}
      </p>
      {matches.map((text, idx) => {
        if (feedbackRegex.exec(text) && feedbackRegex.exec(text)!.length > 0) {
          return (
            <div
              key={idx}
              className="my-5 w-full flex flex-col place-items-center gap-y-2"
            >
              Did this response answer your question?
              <div className="flex flex-row gap-x-4">
                <button
                  onClick={() => setSaveSuccessfulFeedback(true)}
                  className={`flex flex-row gap-x-1.5 font-medium place-items-center text-gray-50 px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 bg-red-500 ring-red-500 hover:bg-red-600`}
                >
                  <HandThumbDownIcon className="h-5 w-5" />
                  No
                </button>
                <button
                  onClick={() => setSaveSuccessfulFeedback(true)}
                  className={`flex flex-row gap-x-1.5 font-medium place-items-center text-gray-50 px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 bg-green-500 ring-green-500 hover:bg-green-600`}
                >
                  <HandThumbUpIcon className="h-5 w-5" />
                  Yes
                </button>
              </div>
              <div
                className={classNames(
                  "flex flex-row place-items-center gap-x-1",
                  saveSuccessfulFeedback ? "visible" : "invisible"
                )}
              >
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <div className="text-sm">Thanks for your feedback!</div>
              </div>
            </div>
          );
        }
        const buttonMatches = buttonRegex.exec(text);
        if (buttonMatches && buttonMatches.length > 0) {
          return (
            <div
              key={idx}
              className="my-5 w-full flex flex-col place-items-center gap-y-2"
            >
              <button
                onClick={() => setSaveSuccessfulFeedback(true)}
                className={`px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 ring-purple-600 bg-purple-600 text-white`}
              >
                {buttonMatches[1].trim()}
              </button>
              <div className="flex flex-row place-items-center gap-x-1">
                {saveSuccessfulFeedback && (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <div className="text-sm">Successful!</div>
                  </>
                )}
              </div>
            </div>
          );
        }
        const tableMatches = tableRegex.exec(text);
        if (tableMatches && tableMatches.length > 0) {
          return <Table chatKeyValueText={tableMatches[1]} key={idx} />;
        }
        return (
          <p
            key={idx}
            className="text-little text-gray-900 whitespace-pre-line break-all"
          >
            {text}
          </p>
        );
      })}
      {props.onConfirm &&
        props.chatItem.role === "confirmation" &&
        (confirmed === null ? (
          <div className="my-5 w-full flex flex-col place-items-center gap-y-2">
            Are you sure you want to continue?
            <div className="flex flex-row gap-x-8">
              <button
                onClick={() => {
                  setConfirmed(false);
                  props.onConfirm!(false);
                }}
                className={`flex flex-row gap-x-1.5 font-medium place-items-center text-gray-700 px-4 border border-gray-400 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 bg-gray-100 ring-gray-500 hover:bg-gray-200`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmed(true);
                  props.onConfirm!(true);
                }}
                className={`flex flex-row gap-x-1.5 font-medium place-items-center text-gray-50 px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 bg-blue-500 ring-blue-500 hover:bg-blue-600`}
              >
                Confirm
              </button>
            </div>
            <div
              className={classNames(
                "flex flex-row place-items-center gap-x-1",
                saveSuccessfulFeedback ? "visible" : "invisible"
              )}
            >
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <div className="text-sm">Thanks for your feedback!</div>
            </div>
          </div>
        ) : confirmed ? (
          <div className="my-5 w-full font-semibold flex flex-row justify-center gap-x-1 place-items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            Confirmed
          </div>
        ) : (
          <div className="my-5 w-full flex flex-row font-semibold justify-center gap-x-2 place-items-center">
            <XCircleIcon className="h-5 w-5 text-red-500" />
            Cancelled
          </div>
        ))}
    </div>
  );
}

function Table(props: { chatKeyValueText: string }) {
  let parsedValues = parseTableTags(props.chatKeyValueText);

  return (
    <div className="inline-block min-w-full py-4 align-middle sm:px-6 lg:px-8">
      <div className="min-w-full border border-gray-300">
        <table className="w-full divide-y divide-gray-300">
          <caption className="text-md text-gray-900 bg-gray-100 py-2 font-extrabold">
            {parsedValues.find((keyValue) => keyValue.key === "caption")?.value}
          </caption>
          <tbody className="bg-gray-300 rounded-full">
            {parsedValues.map(
              (keyValue) =>
                keyValue.key !== "caption" && (
                  <tr key={keyValue.key} className="even:bg-[#DADDE3]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-900">
                      {keyValue.key}
                    </td>
                    <td className="whitespace-wrap px-2 py-2.5 text-sm text-gray-700">
                      {keyValue.value}
                    </td>
                  </tr>
                )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserChatItem(props: { chatItem: StreamingStepInput }) {
  const { profile } = useProfile();
  const [saveSuccessfulFeedback, setSaveSuccessfulFeedback] = useState(false);
  useEffect(() => {
    if (saveSuccessfulFeedback) {
      setTimeout(() => {
        setSaveSuccessfulFeedback(false);
      }, 3000);
    }
  }, [saveSuccessfulFeedback]);
  if (!props.chatItem.content) return <></>;
  const matches = splitContentByParts(props.chatItem.content);

  const outputObj = parseOutput(props.chatItem.content);
  return (
    <div className="py-4 px-1.5 rounded flex flex-col bg-gray-200 text-left place-items-baseline">
      <p className="text-xs text-gray-600 mb-1">
        {profile?.organizations?.name + " AI"}
      </p>
      {matches.map((text, idx) => {
        if (feedbackRegex.exec(text) && feedbackRegex.exec(text)!.length > 0) {
          return (
            <div
              key={idx}
              className="my-5 w-full flex flex-col place-items-center gap-y-2"
            >
              Did this response answer your question?
              <div className="flex flex-row gap-x-4">
                <button
                  onClick={() => setSaveSuccessfulFeedback(true)}
                  className={`flex flex-row gap-x-1.5 font-medium place-items-center text-gray-50 px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 bg-red-500 ring-red-500 hover:bg-red-600`}
                >
                  <HandThumbDownIcon className="h-5 w-5" />
                  No
                </button>
                <button
                  onClick={() => setSaveSuccessfulFeedback(true)}
                  className={`flex flex-row gap-x-1.5 font-medium place-items-center text-gray-50 px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 bg-green-500 ring-green-500 hover:bg-green-600`}
                >
                  <HandThumbUpIcon className="h-5 w-5" />
                  Yes
                </button>
              </div>
              <div
                className={classNames(
                  "flex flex-row place-items-center gap-x-1",
                  saveSuccessfulFeedback ? "visible" : "invisible"
                )}
              >
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <div className="text-sm">Thanks for your feedback!</div>
              </div>
            </div>
          );
        }
        const buttonMatches = buttonRegex.exec(text);
        if (buttonMatches && buttonMatches.length > 0) {
          return (
            <div
              key={idx}
              className="my-5 w-full flex flex-col place-items-center gap-y-2"
            >
              <button
                onClick={() => setSaveSuccessfulFeedback(true)}
                className={`px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 ring-purple-600 bg-purple-600 text-white`}
              >
                {buttonMatches[1].trim()}
              </button>
              <div className="flex flex-row place-items-center gap-x-1">
                {saveSuccessfulFeedback && (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <div className="text-sm">Successful!</div>
                  </>
                )}
              </div>
            </div>
          );
        }
        const tableMatches = tableRegex.exec(text);
        if (tableMatches && tableMatches.length > 0) {
          return <Table chatKeyValueText={tableMatches[1]} key={idx} />;
        }
        return (
          <div key={idx} className="w-full">
            {outputObj.reasoning && (
              <div className="bg-yellow-100 rounded-md px-4 py-2 border border-yellow-300 w-full">
                <p className="flex flex-row gap-x-1.5 text-yellow-800">
                  <LightBulbIcon className="h-5 w-5 text-yellow-600" /> Thoughts
                </p>
                <p className="mt-1 text-little whitespace-pre-line text-gray-700">
                  {outputObj.reasoning}
                </p>
              </div>
            )}
            {outputObj.tellUser && (
              <p
                key={idx}
                className="px-2 mt-3 text-base text-gray-900 whitespace-pre-line w-full"
              >
                {outputObj.tellUser}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
