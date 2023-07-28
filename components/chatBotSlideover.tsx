import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  ChevronLeftIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { classNames, getNumRows } from "../lib/utils";
import { LoadingSpinner } from "./loadingspinner";
import { parseTableTags } from "@superflows/chat-ui-react";

const BrandName = "Apollo";
const BrandColour = "#ffffff";
const BrandColourAction = "#146ef5";
const BrandActionTextColour = "#ffffff";
const SlideoverSide: "right" | "left" = "right";

// This sets the colour of the text on the header of the sidebar. Set "dark" if using a white background
const sidebarHeaderTextColor: "dark" | "light" = "dark";

export const promptSuggestionButtons = [
  "What stage are we at with the deal with Acme Inc.?",
  "Search for C-suites at European CRM companies with >500 employees",
  "Who is leading the Acme Inc. deal?",
];

export const gptResponses = [
  "Searching with filters: <table>Search for: Companies<br/>Industry: computer software, internet<br/>Keywords: SaaS<br/>Account HQ Location: United Kingdom, United States<br/>Employees: 11-20, 21-50, 51-100, 101-200</table><button>Set Filters</button>",
  "Not yet, it’s scheduled for 12:06pm today<button>View email</button>",
  "Sure! Adding snippet: <table>Name: Not free then<br/>Body:Afraid I’m not free at that time, but can do any other time this afternoon. When would work for you?</table><button>Add snippet</button>",
];

interface ChatItem {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBotSlideover(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const ref = useRef(null);
  const [chatContents, setChatContents] = useState<ChatItem[]>([]);
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseNum, setResponseNum] = useState(0);

  const addTextToChat = useCallback(
    (chat: ChatItem[]) => {
      let existingMessage = chat[chat.length - 1];
      if (existingMessage.role !== "assistant") {
        chat.push({ role: "assistant", content: "" });
        existingMessage = chat[chat.length - 1];
      }
      const gptResponse = gptResponses[responseNum];
      const remainingGPTResponse = gptResponse.replace(
        existingMessage.content,
        ""
      );
      const nextWord = remainingGPTResponse.split(" ")[0] + " ";
      const newMessage = existingMessage.content + nextWord;
      setChatContents((prev) => [
        ...prev.slice(0, prev.length - 1),
        { role: "assistant", content: newMessage },
      ]);
      if (gptResponse.replace(newMessage.slice(0, newMessage.length - 1), "")) {
        setTimeout(() => {
          addTextToChat([...chat, { role: "assistant", content: newMessage }]);
        }, 80);
      } else {
        setResponseNum((prev) => (prev + 1) % gptResponses.length);
        setLoading(false);
      }
    },
    [setChatContents, responseNum, setResponseNum]
  );

  useEffect(() => {
    if (loading) {
      addTextToChat(chatContents);
    }
  }, [loading]);

  useEffect(() => {
    const ele = document.getElementById("scrollable-chat-contents");
    if (ele) {
      ele.scrollTop = ele.scrollHeight;
    }
  }, [chatContents]);

  return (
    <Transition.Root show={props.open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={props.setOpen}
        initialFocus={ref}
      >
        <div className="fixed inset-0" />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={classNames(
                "pointer-events-none fixed inset-y-0 flex max-w-full",
                SlideoverSide === "left" ? "left-0" : "right-0"
              )}
            >
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-200 sm:duration-200"
                enterFrom={
                  SlideoverSide === "left"
                    ? "-translate-x-full"
                    : "translate-x-full"
                }
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200 sm:duration-200"
                leaveFrom="translate-x-0"
                leaveTo={
                  SlideoverSide === "left"
                    ? "-translate-x-full"
                    : "translate-x-full"
                }
              >
                <Dialog.Panel className="pointer-events-auto w-96">
                  <div className="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                    <div className="flex min-h-0 flex-1 flex-col pb-1">
                      <div
                        className={classNames(
                          `pt-6 px-3 pb-4`,
                          sidebarHeaderTextColor === "light"
                            ? "text-gray-50"
                            : "text-gray-900 border-b border-gray-200"
                        )}
                        style={{ backgroundColor: BrandColour }}
                      >
                        <div className="flex flex-row place-items-center justify-between">
                          <button
                            className={classNames(
                              "flex flex-row place-items-center gap-x-1 px-2.5 py-1.5 rounded-md bg-transparent border focus:outline-none focus:ring-2 focus:ring-gray-500 transition",
                              sidebarHeaderTextColor === "light"
                                ? "border-transparent hover:border-white text-gray-50"
                                : "border-gray-300 hover:border-gray-400 text-gray-700",
                              SlideoverSide === "right"
                                ? "order-last"
                                : "order-first"
                            )}
                            onClick={() => {
                              setChatContents([]);
                            }}
                          >
                            <ArrowPathIcon className="h-5 w-5" /> Clear chat
                          </button>
                          <Dialog.Title
                            className={classNames(
                              "block text-xl font-semibold leading-6"
                            )}
                          >
                            {BrandName} AI
                          </Dialog.Title>
                          <div
                            className={classNames(
                              "flex h-7 items-center",
                              SlideoverSide === "right"
                                ? "order-first"
                                : "order-last"
                            )}
                          >
                            <button
                              type="button"
                              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 hover:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500"
                              onClick={() => props.setOpen(false)}
                            >
                              <span className="sr-only">Close panel</span>
                              {SlideoverSide === "left" ? (
                                <ChevronLeftIcon
                                  className="h-6 w-6"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ChevronRightIcon
                                  className="h-6 w-6"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        className="overflow-y-auto h-full flex flex-col"
                        id={"scrollable-chat-contents"}
                      >
                        <div className="mt-6 flex-1 px-1 shrink-0 flex flex-col justify-end gap-y-2">
                          {chatContents.map((chatItem, idx) => (
                            <ChatItem chatItem={chatItem} key={idx} />
                          ))}
                          {chatContents.length === 0 && (
                            <div className="py-4 px-1.5">
                              <h2 className="ml-2 font-medium">Suggestions</h2>
                              <div className="mt-1 flex flex-col gap-y-2 place-items-baseline">
                                {promptSuggestionButtons.map((text) => (
                                  <button
                                    key={text}
                                    className="text-left px-2 py-1 rounded-md border bg-white text-little text-gray-800 shadow hover:shadow-md"
                                    onClick={() => {
                                      const chatcopy = [...chatContents];
                                      setChatContents([
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
                    </div>
                    <div className="flex flex-col pt-4">
                      <textarea
                        ref={ref}
                        className="text-sm resize-none mx-1 rounded py-2 border-gray-300 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 placeholder:text-gray-400"
                        placeholder={"Send a message"}
                        value={userText}
                        rows={Math.min(getNumRows(userText, 60), 10)}
                        onChange={(e) => setUserText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (userText.length > 5) {
                              setChatContents((prev) => [
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
                            setChatContents((prev) => [
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
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

const fullRegex = /(<button>.*?<\/button>)|(<table>.*?<\/table>)|([^<]+)/g;
let buttonRegex = /<button>(.*?)<\/button>/g;
let tableRegex = /<table>(.*?)<\/table>/g;

function ChatItem(props: {
  chatItem: { role: "user" | "assistant"; content: string };
}) {
  let match;
  let matches = [];
  while ((match = fullRegex.exec(props.chatItem.content)) !== null) {
    if (match[1]) matches.push(match[1]);
    if (match[2]) matches.push(match[2]);
    if (match[3]) matches.push(match[3].trim());
  }
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
        {props.chatItem.role === "assistant" ? BrandName + " AI" : "You"}
      </p>
      {matches.map((text, idx) => {
        const buttonMatches = buttonRegex.exec(text);
        if (buttonMatches && buttonMatches.length > 0) {
          return (
            <div key={idx} className="my-5 w-full flex flex-row justify-center">
              <button
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
            </div>
          );
        }
        const tableMatches = tableRegex.exec(text);
        if (tableMatches && tableMatches.length > 0) {
          return <Table chatKeyValueText={tableMatches[1]} key={idx} />;
        }
        return (
          <p key={idx} className="text-little text-gray-900">
            {text}
          </p>
        );
      })}
    </div>
  );
}

function Table(props: { chatKeyValueText: string }) {
  const parsedValues = parseTableTags(props.chatKeyValueText);

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
