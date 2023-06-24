import {
  ArrowPathIcon,
  CheckCircleIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import runSSE from "../lib/sse";
import { LoadingSpinner } from "./loadingspinner";
import {
  camelToCapitalizedWords,
  classNames,
  getNumRows,
  parseKeyValues,
  unpackAndCall,
} from "../lib/utils";
import { ParsedOutput, parseOutput } from "../lib/parsers/parsers";
import { MockAction, PageAction } from "../lib/rcMock";
import Toggle from "./toggle";

const BrandName = "RControl";
const BrandColour = "#ffffff";
const BrandColourAction = "#5664d1";
const BrandActionTextColour = "#ffffff";

export const promptSuggestionButtons = [
  "When is Mrs. Carol's mitigation scheduled for?",
  "Necesitamos saber si ya el caso de la señora Carol Adames ya se pasó a WekLaw",
  "Who can I ask about the status of Mr. Luiz Marquesini who signed on August 30, 2022?",
];

interface ChatItem {
  role: "user" | "assistant" | "function";
  name?: string;
  content: string;
}

export default function PlaygroundChatbot(props: {
  pageActions: PageAction[];
  activeActions: string[];
  page: string;
  setPage: (page: string) => void;
  language: "English" | "Espanol";
}) {
  // This is a hack to prevent the effect from running twice in development
  // It's because React strict mode runs in development, which renders everything
  // twice to check for bugs/side effects
  const didRunEffect = useRef(false);

  const ref = useRef(null);
  const [devChatContents, setDevChatContents] = useState<ChatItem[]>([
    // {
    //   role: "user",
    //   content: "Hi",
    // },{
    //   role: "assistant",
    //   content: "Reasoning: You're a muppet. No you're not. Maybe you are. Stop throwing food for crows.\n\nPlan:\n- You should stop being a muppet.\n\nTell user: You are wonderful.\n\nCompleted: true",
    // },
  ]);
  const [userText, setUserText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [responseNum, setResponseNum] = useState<number>(0);

  const [gptPageName, setGptPageName] = useState(props.page);
  const killSwitchClicked = useRef(false);

  const addTextToChat = useCallback(
    async (chat: ChatItem[], activeActions: string[]) => {
      const chatCopy = [...chat];
      chat.push({ role: "assistant", content: "" });
      let filteredPageActions: PageAction[] = props.pageActions.map(
        (pageAction) => {
          let filteredActions: MockAction[] = pageAction.actions.filter(
            (action) => {
              return activeActions.includes(action.name);
            }
          );
          let filteredPageAction: PageAction = {
            ...pageAction,
            actions: filteredActions,
          };
          return filteredPageAction;
        }
      );
      console.log("filteredPageActions", filteredPageActions);
      await runSSE(
        "/api/call-openai",
        JSON.stringify({
          userCopilotMessages: chatCopy,
          pageActions: filteredPageActions,
          currentPageName: gptPageName,
          language: props.language,
        }),
        (text: string, fullOutput: string, eventSource) => {
          setDevChatContents((prev) => [
            ...prev.slice(0, prev.length - 1),
            { role: "assistant", content: fullOutput + text },
          ]);
          console.log(
            "parsedOutput",
            JSON.stringify(parseOutput(fullOutput + text))
          );
          if (killSwitchClicked.current) {
            console.log("KILL SWITCH CLICKED");
            setLoading(false);
            didRunEffect.current = false;
            killSwitchClicked.current = false;
            eventSource.close();
            return;
          }
        },
        async (fullOutput: string) => {
          setDevChatContents((prev) => [
            ...prev.slice(0, prev.length - 1),
            { role: "assistant", content: fullOutput },
          ]);
          setLoading(false);
          const output = parseOutput(fullOutput);
          output.commands.forEach((command) => {
            console.log("command", command);
            const thisPageActions = props.pageActions.find(
              (pageAction) => pageAction.pageName === gptPageName
            );
            if (!thisPageActions)
              throw Error("GPTPageName is incorrect: " + gptPageName);
            if (command.name === "navigateTo") {
              console.log("navigatingTo", command.args.pageName);
              setGptPageName(command.args.pageName);
              props.setPage(command.args.pageName);
              setDevChatContents((prev) => {
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
            const out = unpackAndCall(commandAction.func, command.args);
            console.log("out from calling function", out);
            if (out) {
              setDevChatContents((prev) => {
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
          });
          setTimeout(() => {
            if (output.completed === false) {
              console.log("Running again - not terminating!");
              setLoading(true);
              didRunEffect.current = false;
            } else {
              console.log("Terminating!");
              setResponseNum((prev) => prev + 1);
              if (output.completed === true) {
                setDevChatContents((prev) => [
                  ...prev,
                  { role: "assistant", content: "<button>Confirm</button>" },
                ]);
              }
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
      setDevChatContents,
      responseNum,
      setResponseNum,
      gptPageName,
      props.pageActions,
      props.page,
      setGptPageName,
      killSwitchClicked,
      didRunEffect,
      props.language,
    ]
  );

  useEffect(() => {
    if (loading && !didRunEffect.current) {
      didRunEffect.current = true;
      addTextToChat(devChatContents, props.activeActions);
    }
  }, [loading]);

  useEffect(() => {
    const ele = document.getElementById("scrollable-chat-contents");
    if (ele) {
      ele.scrollTop = ele.scrollHeight;
    }
  }, [devChatContents]);

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
          {/*<div className="flex flex-row gap-x-2 place-items-center w-48">*/}
          {/*  <SelectBox*/}
          {/*    title="Page:"*/}
          {/*    options={props.pageActions.map((p) => p.pageName)}*/}
          {/*    theme={"light"}*/}
          {/*    selected={props.page}*/}
          {/*    setSelected={(selected: string) => {*/}
          {/*      props.setPage(selected);*/}
          {/*      setGptPageName(selected);*/}
          {/*    }}*/}
          {/*  />*/}
          {/*</div>*/}
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
            {BrandName} AI
          </h1>
          <div className="flex flex-row justify-end w-48">
            <button
              className={classNames(
                "flex flex-row place-items-center gap-x-1 px-2.5 py-1.5 rounded-md bg-transparent border focus:outline-none focus:ring-2 focus:ring-gray-500 transition",
                "border-gray-300 hover:border-gray-400 text-gray-700"
              )}
              onClick={() => {
                setDevChatContents([]);
                // Set GPT page to initial page
                setGptPageName(props.pageActions[0].pageName);
                props.setPage(props.pageActions[0].pageName);
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
          {devChatContents.map((chatItem, idx) => {
            if (devMode || chatItem.role !== "assistant")
              return <DevChatItem chatItem={chatItem} key={idx} />;
            else {
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
                      className="text-left px-2 py-1 rounded-md border bg-white text-little text-gray-800 shadow hover:shadow-md"
                      onClick={() => {
                        const chatcopy = [...devChatContents];
                        setDevChatContents([
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
                setDevChatContents((prev) => [
                  ...prev,
                  { role: "user", content: userText },
                ]);
                setUserText("");
                setLoading(true);
              }
            }
          }}
        />
        <div className="flex flex-shrink-0 w-full justify-end px-1 pb-4 pt-2">
          {loading && (
            <button
              className={
                "flex flex-row gap-x-1 place-items-center ml-4 justify-center rounded-md px-3 py-2 text-sm text-gray-500 shadow-sm bg-gray-100 hover:bg-gray-200 border border-gray-300"
              }
              onClick={() => {
                killSwitchClicked.current = true;
              }}
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
              setDevChatContents((prev) => [
                ...prev,
                { role: "user", content: userText },
              ]);
              setUserText("");
              setLoading(true);
              killSwitchClicked.current = false;
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
let confirmRegex = /<button>Confirm<\/button>/;
let buttonRegex = /<button>(.*?)<\/button>/;
let tableRegex = /<table>(.*?)<\/table>/;

function DevChatItem(props: { chatItem: ChatItem }) {
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
  // TODO: if it's a function call, hide it from the user
  return (
    <div className="py-4 px-1.5 rounded flex flex-col bg-gray-200 text-left place-items-baseline">
      <p className="text-xs text-gray-600 mb-1">{BrandName + " AI"}</p>
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
