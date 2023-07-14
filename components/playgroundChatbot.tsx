import {
  ArrowPathIcon,
  CheckCircleIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PRICING_PAGE, USAGE_LIMIT } from "../lib/consts";
import { Json } from "../lib/database.types";
import { ParsedOutput, StreamingStep } from "../lib/models";
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

const BrandColour = "#ffffff";
const BrandColourAction = "#5664d1";
const BrandActionTextColour = "#ffffff";

interface ChatItem {
  role: "user" | "assistant" | "function" | "debug" | "error" | "confirmation";
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
  userDescription: string;
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
  const [devChatContents, setDevChatContents] = useState<ChatItem[]>([]);
  const [userText, setUserText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [confirmationRequired, setConfirmationRequired] =
    useState<boolean>(false);

  const [confirmationButtonClicked, setConfirmationButtonClicked] = useState<
    "yes" | "no" | null
  >(null);

  const killSwitchClicked = useRef(false);

  const submitButtonClickable = props.submitReady && userText.length > 3;

  // Hack to prevent the effect from running twice in development
  const [init, setInit] = useState(true);

  useEffect(() => {
    if (!confirmationRequired || !init) return;

    const commandsAwaitingConfirmation = parseOutput(
      devChatContents[devChatContents.length - 1].content
    ).commands;

    setDevChatContents((prevState) => [
      ...prevState,
      {
        role: "confirmation",
        content: `The following actions are required to achieve your goal ${commandsAwaitingConfirmation.map(
          (command, index) =>
            convertToRenderable(
              command.args,
              `Action ${index + 1}: ${functionNameToDisplay(command.name)}`
            )
        )} <button>Confirm</button>`,
      },
    ]);
    setInit(false); // Set init to false after first run
  }, [confirmationRequired, init]);

  useEffect(() => {
    if (!confirmationButtonClicked) return;
    (async () => {
      setLoading(true);
      setDevChatContents((prevState) => [
        ...prevState,
        {
          role: "user",
          content:
            confirmationButtonClicked === "yes"
              ? "Confirm Action"
              : "Cancel Action",
        },
      ]);
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
          button_clicked: confirmationButtonClicked,
        }),
      });

      if (response.status === 200) {
        const json = await response.json();
        const outs: { name: string; result: object }[] = json.outs;

        for (const out of outs) {
          setDevChatContents((prevState) => [
            ...prevState,
            {
              role: "function",
              name: out.name,
              content: JSON.stringify(out.result),
            },
          ]);
        }
      }

      setConfirmationButtonClicked(null);
      setLoading(false);
    })();
  }, [confirmationButtonClicked]);

  const addTextToChat = useCallback(
    async (chat: ChatItem[]) => {
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
          language: props.language,
          user_api_key: props.userApiKey,
          user_description: props.userDescription,
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
                outputMessages.push({ ...data });
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
      setLoading(false);
      alreadyRunning.current = false;
      killSwitchClicked.current = false;
      setConfirmationRequired(
        outputMessages
          .map((message) => message.content)
          .join("")
          .includes(
            "Executing these instructions requires confirmation. I will not proceed until the user has provided this."
          )
      );
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
            if (devMode || chatItem.role === "user")
              return (
                <DevChatItem
                  chatItem={chatItem}
                  key={idx + chatItem.content}
                  setConfirmationButtonClicked={setConfirmationButtonClicked}
                  setConfirmationRequired={setConfirmationRequired}
                />
              );
            else {
              if (chatItem.role === "debug") return <></>;
              else if (chatItem.role === "error") {
                return (
                  <DevChatItem
                    chatItem={chatItem}
                    key={idx + chatItem.content}
                    setConfirmationButtonClicked={setConfirmationButtonClicked}
                    setConfirmationRequired={setConfirmationRequired}
                  />
                );
              } else if (chatItem.role === "function") {
                let contentString;
                const functionJsonResponse = JSON.parse(chatItem.content);
                if (
                  Array.isArray(functionJsonResponse) &&
                  functionJsonResponse.length === 0
                ) {
                  contentString = "No data returned";
                } else if (
                  functionJsonResponse &&
                  typeof functionJsonResponse === "object" &&
                  Object.entries(functionJsonResponse).length === 0
                ) {
                  contentString = "No data returned";
                } else {
                  contentString = convertToRenderable(
                    functionJsonResponse,
                    `${functionNameToDisplay(chatItem?.name ?? "")} result`
                  );
                }
                return (
                  <DevChatItem
                    chatItem={{ ...chatItem, content: contentString }}
                    key={idx + chatItem.content}
                    setConfirmationButtonClicked={setConfirmationButtonClicked}
                    setConfirmationRequired={setConfirmationRequired}
                  />
                );
              } else if (chatItem.role === "confirmation") {
                return (
                  <DevChatItem
                    chatItem={chatItem}
                    key={idx + chatItem.content}
                    setConfirmationButtonClicked={setConfirmationButtonClicked}
                    setConfirmationRequired={setConfirmationRequired}
                  />
                );
              }
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
                addTextToChat([
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
              props.submitReady ? "invisible" : "visible"
            )}
          >
            {
              "You need to add your API hostname (API tab) and actions (Actions tab)."
            }
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
let feedbackRegex = /<button>Feedback<\/button>/;
let confirmRegex = /<button>Confirm<\/button>/;
let buttonRegex = /<button>(?![^<]*<button>)(.*?)<\/button>/;
let tableRegex = /<table>(.*?)<\/table>/;

function DevChatItem(props: {
  chatItem: ChatItem;
  setConfirmationButtonClicked: (clicked: "yes" | "no" | null) => void;
  setConfirmationRequired: (required: boolean) => void;
}) {
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
          ? "bg-green-200"
          : props.chatItem.role === "confirmation"
          ? "bg-red-300"
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
        if (confirmRegex.exec(text) && confirmRegex.exec(text)!.length > 0) {
          return (
            <div
              key={idx}
              className="my-5 w-full flex flex-col place-items-center gap-y-2"
            >
              Are you sure you want to continue?
              <div className="flex flex-row gap-x-4">
                <button
                  onClick={() => {
                    props.setConfirmationButtonClicked("no");
                    props.setConfirmationRequired(false);
                  }}
                  className={`flex flex-row gap-x-1.5 font-medium place-items-center text-gray-50 px-4 rounded-md py-2 text-base hover:opacity-90 transition focus:ring-2 focus:ring-offset-2 bg-red-500 ring-red-500 hover:bg-red-600`}
                >
                  <HandThumbDownIcon className="h-5 w-5" />
                  No
                </button>
                <button
                  onClick={() => {
                    props.setConfirmationButtonClicked("yes");
                    props.setConfirmationRequired(false);
                  }}
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
            className="text-little text-gray-900 whitespace-pre-line break-all"
          >
            {text}
          </p>
        );
      })}
    </div>
  );
}

function Table(props: { chatKeyValueText: string }) {
  let parsedValues = parseTableTags(props.chatKeyValueText);

  return (
    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
      <table className="min-w-full divide-y divide-gray-300">
        <caption className="text-md text-gray-900 mb-2 font-extrabold">
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
