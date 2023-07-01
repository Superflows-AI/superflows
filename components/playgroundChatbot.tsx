import {
  ArrowPathIcon,
  CheckCircleIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "./loadingspinner";
import { classNames, convertToRenderable, parseKeyValues } from "../lib/utils";
import { ParsedOutput, parseOutput } from "../lib/parsers/parsers";
import Toggle from "./toggle";
import { useProfile } from "./contextManagers/profile";
import { StreamingStep } from "../pages/api/v1/answers";
import { Json } from "../lib/database.types";
import { AutoGrowingTextArea } from "./autoGrowingTextarea";

const BrandColour = "#ffffff";
const BrandColourAction = "#5664d1";
const BrandActionTextColour = "#ffffff";

export const promptSuggestionButtons = [
  "When is Mrs. Carol's mitigation scheduled for?",
  "Necesitamos saber si ya el caso de la señora Carol Adames ya se pasó a WekLaw",
  "Who can I ask about the status of Mr. Luiz Marquesini who signed on August 30, 2022?",
];

interface ChatItem {
  role: "user" | "assistant" | "function" | "debug" | "error";
  name?: string;
  content: string;
}

export type Step =
  | ({ id: number; role: "assistant" } & ParsedOutput)
  | { id: number; role: "function"; name: string; result: Json };

export default function PlaygroundChatbot(props: {
  page: string;
  setPage: (page: string) => void;
  language: "English" | "Espanol";
  userApiKey: string;
  submitReady: boolean;
}) {
  // This is a hack to prevent the effect from running twice in development
  // It's because React strict mode runs in development, which renders everything
  // twice to check for bugs/side effects
  const alreadyRunning = useRef(false);

  const { profile } = useProfile();

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [devChatContents, setDevChatContents] = useState<ChatItem[]>([]);
  const [userText, setUserText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);

  const killSwitchClicked = useRef(false);

  const submitButtonClickable = props.submitReady && userText.length > 3;

  const addTextToChat = useCallback(
    async (chat: ChatItem[]) => {
      setDevChatContents(chat);
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
          language: props.language,
          user_api_key: props.userApiKey,
          stream: true,
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
      let outputMessages = [{ role: "assistant", content: "" }] as ChatItem[];

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading || killSwitchClicked.current;
        const chunkValue = decoder.decode(value);
        try {
          // Can be multiple server-side chunks in one client-side chunk,
          // separated by "data:". The .slice(5) removes the "data:" at
          // the start of the string
          console.log("My chunk", chunkValue);
          chunkValue
            .slice(5)
            .split("data:")
            .forEach((chunkOfChunk) => {
              if (chunkOfChunk.length === 0) return;
              const data = JSON.parse(chunkOfChunk) as StreamingStep;
              if (conversationId === null) setConversationId(data.id);
              if (
                data.role !== outputMessages[outputMessages.length - 1]?.role
              ) {
                outputMessages.push({
                  role: data.role,
                  content: data.content,
                });
              } else {
                outputMessages[outputMessages.length - 1].content +=
                  data.content;
              }
              setDevChatContents([...chat, ...outputMessages]);
            });
        } catch (e) {
          console.error(e);
        }
      }
      // TODO: Add a confirmation step when taking non-GET actions
      setLoading(false);
      alreadyRunning.current = false;
      killSwitchClicked.current = false;
    },
    [
      props.userApiKey,
      profile,
      loading,
      setLoading,
      devChatContents,
      setDevChatContents,
      killSwitchClicked.current,
      alreadyRunning.current,
      props.language,
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
          "text-gray-900 border-b border-gray-200"
        )}
        style={{ backgroundColor: BrandColour }}
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
        className="flex-1 overflow-y-auto h-full flex flex-col pb-1 px-32"
        id={"scrollable-chat-contents"}
      >
        <div className="mt-6 flex-1 px-1 shrink-0 flex flex-col justify-end gap-y-2">
          {devChatContents.map((chatItem, idx) => {
            if (devMode || chatItem.role === "user")
              return <DevChatItem chatItem={chatItem} key={idx} />;
            else {
              if (chatItem.role === "debug") return <></>;
              else if (chatItem.role === "error") {
                return <DevChatItem chatItem={chatItem} key={idx} />;
              } else if (chatItem.role === "function") {
                let contentString;
                const functionJsonResponse = JSON.parse(chatItem.content);
                if (
                  Array.isArray(functionJsonResponse) &&
                  functionJsonResponse.length === 0
                ) {
                  contentString = "No results found.";
                } else if (
                  typeof functionJsonResponse === "object" &&
                  Object.entries(functionJsonResponse).length === 0
                ) {
                  contentString = "No results found.";
                } else {
                  contentString =
                    chatItem.name +
                    "called:\n" +
                    convertToRenderable(functionJsonResponse);
                }
                return (
                  <DevChatItem
                    chatItem={{ ...chatItem, content: contentString }}
                    key={idx}
                  />
                );
              }
              return <UserChatItem chatItem={chatItem} key={idx} />;
            }
          })}
          {devChatContents.length === 0 &&
            promptSuggestionButtons.length > 0 && (
              <div className="py-4 px-1.5">
                <h2 className="ml-2 font-medium">Suggestions</h2>
                <div className="mt-1 flex flex-col gap-y-2 place-items-baseline">
                  {promptSuggestionButtons.map((text) => (
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
      <div className="flex flex-col pt-4 px-32">
        <AutoGrowingTextArea
          className={classNames(
            "text-sm resize-none mx-1 rounded py-2 border-gray-300 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 placeholder:text-gray-400",
            userText.length > 300 ? "overflow-auto-y" : "overflow-hidden"
          )}
          placeholder={"Send a message"}
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (submitButtonClickable) {
                addTextToChat([
                  ...devChatContents,
                  { role: "user", content: userText },
                ]);
                setUserText("");
              }
            }
          }}
        />
        <div className="flex flex-shrink-0 w-full justify-between px-1 pb-4 pt-2">
          <p
            className={classNames(
              "flex flex-row grow gap-x-1 mx-4 text-red-500 place-items-center justify-center rounded-md px-1 py-2 text-sm font-semibold",
              props.submitReady ? "invisible" : "visible"
            )}
          >
            {
              "You need to add your API hostname (API tab) and actions (Actions tab)."
            }
          </p>
          {loading && (
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
          )}
          <button
            type="submit"
            className={classNames(
              "flex flex-row gap-x-1 place-items-center ml-4 justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm",
              loading || !submitButtonClickable
                ? "bg-gray-500 cursor-not-allowed"
                : `hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 bg-purple-500`
            )}
            onClick={() => {
              if (!loading && submitButtonClickable) {
                addTextToChat([
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
  );
}

function fromStepToGPTMessages(steps: Step[]): ChatItem[] {
  return steps.map((step) => {
    if (step.role === "assistant") {
      const commandsString =
        "Commands:\n" +
        step.commands
          .map((command) => {
            const argsString = Object.entries(command.args)
              .map(([argName, argValue]) => argName + "=" + argValue)
              .join(", ");
            return `${command.name}(${argsString})`;
          })
          .join("\n");
      const completedString =
        step.completed === null ? "question" : step.completed;
      const tellUserString = step.tellUser
        ? "Tell user: " + step.tellUser + "\n\n"
        : "";
      return {
        role: step.role,
        content: `Reasoning: ${step.reasoning}\n\nPlan: ${step.plan}\n\n${tellUserString}${commandsString}Completed: ${completedString}\n\n`,
      };
    } else {
      return {
        role: step.role,
        name: step.name,
        content: `Function: ${step.name}\n\nResult: ${JSON.stringify(
          step.result
        )}\n\n`,
      };
    }
  });
}

const fullRegex = /(<button>.*?<\/button>)|(<table>.*?<\/table>)|([^<]+)/g;
let confirmRegex = /<button>Confirm<\/button>/;
let buttonRegex = /<button>(.*?)<\/button>/;
let tableRegex = /<table>(.*?)<\/table>/;

function DevChatItem(props: { chatItem: ChatItem }) {
  const { profile } = useProfile();
  const [saveSuccessfulFeedback, setSaveSuccessfulFeedback] = useState(false);
  useEffect(() => {
    if (saveSuccessfulFeedback) {
      setTimeout(() => {
        setSaveSuccessfulFeedback(false);
      }, 3000);
    }
  }, [saveSuccessfulFeedback]);
  let match;
  let matches = [];
  while ((match = fullRegex.exec(props.chatItem.content)) !== null) {
    if (match[1]) matches.push(match[1]);
    if (match[2]) matches.push(match[2]);
    if (match[3]) matches.push(match[3].trim());
  }
  // TODO: if it's a function call, hide it from the user
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
          ? "bg-purple-100"
          : ""
      )}
    >
      <p className="text-xs text-gray-600 mb-1">
        {props.chatItem.role === "assistant"
          ? profile?.organizations?.name + " AI"
          : props.chatItem.role === "function"
          ? "Function called"
          : props.chatItem.role === "user"
          ? "You"
          : props.chatItem.role === "debug"
          ? "Debug"
          : props.chatItem.role === "error"
          ? "Error"
          : "Unknown"}
      </p>
      {matches.map((text, idx) => {
        if (confirmRegex.exec(text) && confirmRegex.exec(text)!.length > 0) {
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
                className={`px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2`}
                style={{
                  backgroundColor: BrandColourAction,
                  color: BrandActionTextColour,
                  // @ts-ignore
                  "--tw-ring-color": BrandColourAction,
                }}
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
            className="text-little text-gray-900 whitespace-pre-line"
          >
            {text}
          </p>
        );
      })}
    </div>
  );
}

function Table(props: { chatKeyValueText: string }) {
  const parsedValues = parseKeyValues(props.chatKeyValueText);

  return (
    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
      <table className="min-w-full divide-y divide-gray-300">
        <tbody className="bg-gray-300 rounded-full">
          {parsedValues.map((keyValue) => (
            <tr key={keyValue.key} className="even:bg-[#DADDE3]">
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-900">
                {keyValue.key}
              </td>
              <td className="whitespace-wrap px-2 py-2.5 text-sm text-gray-700">
                {keyValue.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserChatItem(props: { chatItem: ChatItem }) {
  const { profile } = useProfile();
  const [saveSuccessfulFeedback, setSaveSuccessfulFeedback] = useState(false);
  useEffect(() => {
    if (saveSuccessfulFeedback) {
      setTimeout(() => {
        setSaveSuccessfulFeedback(false);
      }, 3000);
    }
  }, [saveSuccessfulFeedback]);
  let match;
  let matches = [];
  while ((match = fullRegex.exec(props.chatItem.content)) !== null) {
    if (match[1]) matches.push(match[1]);
    if (match[2]) matches.push(match[2]);
    if (match[3]) matches.push(match[3].trim());
  }
  const outputObj = parseOutput(props.chatItem.content);
  return (
    <div className="py-4 px-1.5 rounded flex flex-col bg-gray-200 text-left place-items-baseline">
      <p className="text-xs text-gray-600 mb-1">
        {profile?.organizations?.name + " AI"}
      </p>
      {matches.map((text, idx) => {
        if (confirmRegex.exec(text) && confirmRegex.exec(text)!.length > 0) {
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
                className={`px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2`}
                style={{
                  backgroundColor: BrandColourAction,
                  color: BrandActionTextColour,
                  // @ts-ignore
                  "--tw-ring-color": BrandColourAction,
                }}
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
          <>
            <div className="bg-yellow-100 rounded-md px-4 py-2 border border-yellow-300 w-full">
              <p className="flex flex-row gap-x-1.5 text-yellow-800">
                <LightBulbIcon className="h-5 w-5 text-yellow-600" /> Thoughts
              </p>
              <p className="mt-1 text-little whitespace-pre-line text-gray-700">
                {outputObj.reasoning}
              </p>
            </div>
            {outputObj.tellUser && (
              <p
                key={idx}
                className="px-2 mt-3 text-base text-gray-900 whitespace-pre-line"
              >
                {outputObj.tellUser}
              </p>
            )}
          </>
        );
      })}
    </div>
  );
}
