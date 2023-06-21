import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import runSSE from "../lib/sse";
import {Action, ActionGroupJoinActions} from "../lib/types";
import { LoadingSpinner } from "./loadingspinner";
import SelectBox from "./selectBox";
import {
  camelToCapitalizedWords,
  classNames,
  getNumRows,
  parseKeyValues,
  unpackAndCall,
} from "../lib/utils";
import { parseOutput } from "../lib/parsers/parsers";

const BrandName = "Totango";
const BrandColour = "#ffffff";
const BrandColourAction = "#146ef5";
const BrandActionTextColour = "#ffffff";

export const promptSuggestionButtons = [
  "Who are our most active users in the last 30 days?",
  "Get the European CRM companies with >500 employees",
  "Which of our customers are using the new search feature?",
];

interface ChatItem {
  role: "user" | "assistant" | "function";
  name?: string;
  content: string;
}

export default function PlaygroundChatbot(props: {
  pageActions: ActionGroupJoinActions[];
  activeActions: string[];
  page: string;
  setPage: (page: string) => void;
}) {
  // const [devChatContents, setDevChatContents] = useState<ChatItem[]>([]);

  const ref = useRef(null);
  const [visualChatContents, setVisualChatContents] = useState<ChatItem[]>([]);
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseNum, setResponseNum] = useState(0);

  const [gptPageName, setGptPageName] = useState(props.page);
  const [killSwitchClicked, setKillSwitchClicked] = useState(false);

  const addTextToChat = useCallback(
    async (chat: ChatItem[], activeActions: string[]) => {
      const chatCopy = [...chat];
      chat.push({ role: "assistant", content: "" });
      let filteredPageActions: ActionGroupJoinActions[] = props.pageActions.map(
        (pageAction) => {
          let filteredActions: Action[] = pageAction.actions.filter(
            (action) => {
              return activeActions.includes(action.name);
            }
          );
          let filteredPageAction: ActionGroupJoinActions = {
            ...pageAction,
            actions: filteredActions,
          };
          return filteredPageAction;
        }
      );
      await runSSE(
        "api/call-openai",
        "an access token",
        JSON.stringify({
          userCopilotMessages: chatCopy,
          pageActions: filteredPageActions,
          currentPageName: gptPageName,
        }),
        (text: string, fullOutput: string) => {
          if (killSwitchClicked) return;
          setVisualChatContents((prev) => [
            ...prev.slice(0, prev.length - 1),
            { role: "assistant", content: fullOutput + text },
          ]);
          console.log(
            "parsedOutput",
            JSON.stringify(parseOutput(fullOutput + text))
          );
        },
        async (fullOutput: string) => {
          if (killSwitchClicked) return;
          setVisualChatContents((prev) => [
            ...prev.slice(0, prev.length - 1),
            { role: "assistant", content: fullOutput },
          ]);

          const output = parseOutput(fullOutput);
          output.commands.forEach((command) => {
            console.log("command", command);
            const thisPageActions = props.pageActions.find(
              // (pageAction) => pageAction.pageName === gptPageName
                // TODO: Fix
              (pageAction) => true
            );
            if (!thisPageActions)
              throw Error("GPTPageName is incorrect: " + gptPageName);
            if (command.name === "navigateTo") {
              console.log("navigatingTo", command.args.pageName);
              setGptPageName(command.args.pageName);
              props.setPage(command.args.pageName);
              setVisualChatContents((prev) => {
                if (prev[prev.length - 1].role === "function") {
                  const prevFuncMessage = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, prev.length - 1),
                    {
                      role: "function",
                      name: prevFuncMessage.name + "_" + command.name,
                      content:
                        prevFuncMessage.content +
                        "\n\n" +
                        "Navigated to " +
                        command.args.pageName,
                    },
                  ];
                }
                // SyntaxError: Expected ',' or '}' after property value in JSON at position 22
                return [
                  ...prev,
                  {
                    role: "function",
                    name: command.name,
                    content: "Navigated to " + command.args.pageName,
                  },
                ];
              });
              return;
            }
            const commandAction = thisPageActions.actions.find(
              (action) => action.name === command.name
            );
            if (!commandAction)
              throw Error("Command name is incorrect: " + command.name);
            console.log("commandAction", commandAction);
            console.log("command.args", command.args);
            // const out = unpackAndCall(commandAction.func, command.args);
            // TODO: Fix
            const out = unpackAndCall(() => {}, command.args);
            console.log("out from calling function", out);
            if (out) {
              setVisualChatContents((prev) => {
                if (prev[prev.length - 1].role === "function") {
                  const prevFuncMessage = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, prev.length - 1),
                    {
                      role: "function",
                      name: prevFuncMessage.name + "_" + command.name,
                      content: prevFuncMessage.content + "\n\n" + out,
                    },
                  ];
                }
                return [
                  ...prev,
                  { role: "function", name: command.name, content: out },
                ];
              });
            }
            if (command.name === "createSegment") {
              setGptPageName("Segment");
              props.setPage("Segment");
            }
          });
          setLoading(false);
          setTimeout(() => {
            if (!output.completed) {
              console.log("Running again - not terminating!");
              setLoading(true);
            } else {
              console.log("Terminating!");
              setVisualChatContents((prev) => [
                ...prev,
                { role: "assistant", content: "<button>Confirm</button>" },
              ]);
            }
          }, 250);
        },
        async (e: any) => {
          setLoading(false);
          console.log(e);
        }
      );
    },
    [
      setVisualChatContents,
      responseNum,
      setResponseNum,
      gptPageName,
      props.pageActions,
      props.page,
      setGptPageName,
      killSwitchClicked,
    ]
  );

  useEffect(() => {
    if (loading) {
      addTextToChat(visualChatContents, props.activeActions);
    }
  }, [loading]);

  useEffect(() => {
    const ele = document.getElementById("scrollable-chat-contents");
    if (ele) {
      ele.scrollTop = ele.scrollHeight;
    }
  }, [visualChatContents]);

  return (
    <div className="flex h-full flex-1 flex-col divide-y divide-gray-200 bg-gray-50">
      {/* Header */}
      <div
        className={classNames(
          `pt-6 px-3 pb-4`,
          "text-gray-900 border-b border-gray-200"
        )}
        style={{ backgroundColor: BrandColour }}
      >
        <div className="flex flex-row place-items-center justify-between">
          <div className="flex flex-row gap-x-2 place-items-center w-48">
            <SelectBox
              title="Page:"
              // TODO: Fix
              // options={props.pageActions.map((p) => p.pageName)}
              options={props.pageActions.map((p) => p.name)}
              theme={"light"}
              selected={props.page}
              setSelected={(selected: string) => {
                props.setPage(selected);
                setGptPageName(selected);
              }}
            />
          </div>
          <h1
            className={classNames(
              "ml-4 block text-2xl font-semibold leading-6"
            )}
          >
            {BrandName} AI
          </h1>
          <div className="flex flex-row justify-end w-48">
            <button
              className={classNames(
                "flex flex-row place-items-center gap-x-1 px-2.5 py-1.5 rounded-md bg-transparent border focus:outline-none focus:ring-2 focus:ring-gray-500 transition",
                "border-gray-300 hover:border-gray-400 text-gray-700"
              )}
              onClick={() => {
                setVisualChatContents([]);
                // Set GPT page to initial page
                // TODO: Fix
                // setGptPageName(props.pageActions[0].pageName);
                // props.setPage(props.pageActions[0].pageName);
              }}
            >
              <ArrowPathIcon className="h-5 w-5" /> Clear chat
            </button>
          </div>
        </div>
      </div>
      {/* Scrollable chat window */}
      <div
        className="flex-1 overflow-y-auto h-full flex flex-col pb-1 px-16"
        id={"scrollable-chat-contents"}
      >
        <div className="mt-6 flex-1 px-1 shrink-0 flex flex-col justify-end gap-y-2">
          {visualChatContents.map((chatItem, idx) => (
            <ChatItem chatItem={chatItem} key={idx} />
          ))}
          {visualChatContents.length === 0 && (
            <div className="py-4 px-1.5">
              <h2 className="ml-2 font-medium">Suggestions</h2>
              <div className="mt-1 flex flex-col gap-y-2 place-items-baseline">
                {promptSuggestionButtons.map((text) => (
                  <button
                    key={text}
                    className="text-left px-2 py-1 rounded-md border bg-white text-little text-gray-800 shadow hover:shadow-md"
                    onClick={() => {
                      const chatcopy = [...visualChatContents];
                      setVisualChatContents([
                        ...chatcopy,
                        { role: "user", content: text },
                      ]);
                      setLoading(true);
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
      <div className="flex flex-col pt-4 px-16">
        <textarea
          ref={ref}
          className="text-sm resize-none mx-1 rounded py-2 border-gray-300 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 placeholder:text-gray-400"
          placeholder={"Send a message"}
          value={userText}
          rows={Math.min(getNumRows(userText, 125), 10)}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (userText.length > 5) {
                setVisualChatContents((prev) => [
                  ...prev,
                  { role: "user", content: userText },
                ]);
                setUserText("");
                setLoading(true);
              }
            }
          }}
        />
        <div className="flex flex-shrink-0 w-full justify-end px-4 pb-4 pt-2">
          {loading && (
            <button
              className={
                "flex flex-row gap-x-1 place-items-center ml-4 justify-center rounded-md px-3 py-2 text-sm text-gray-500 shadow-sm bg-gray-100 hover:bg-gray-200 border border-gray-300"
              }
              onClick={() => setKillSwitchClicked(true)}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className={classNames(
              "flex flex-row gap-x-1 place-items-center ml-4 justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm",
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : `hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500`
            )}
            style={{ backgroundColor: BrandColourAction }}
            onClick={() => {
              setVisualChatContents((prev) => [
                ...prev,
                { role: "user", content: userText },
              ]);
              setUserText("");
              setLoading(true);
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

const fullRegex = /(<button>.*?<\/button>)|(<table>.*?<\/table>)|([^<]+)/g;
let buttonRegex = /<button>(.*?)<\/button>/;
let tableRegex = /<table>(.*?)<\/table>/;

function ChatItem(props: { chatItem: ChatItem }) {
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
          : "bg-gray-200 text-left place-items-baseline"
      )}
    >
      <p className="text-xs text-gray-600 mb-1">
        {props.chatItem.role === "assistant"
          ? BrandName + " AI"
          : props.chatItem.role === "function"
          ? "Function called"
          : "You"}
      </p>
      {matches.map((text, idx) => {
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
