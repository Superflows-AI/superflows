import { Dialog } from "@headlessui/react";
import {
  ChevronDownIcon,
  CodeBracketSquareIcon,
  GlobeAltIcon,
} from "@heroicons/react/20/solid";
import {
  LinkIcon,
  MinusIcon,
  PencilSquareIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import React, { useEffect, useRef, useState } from "react";
import { Action } from "../../lib/types";
import {
  classNames,
  isAlphaNumericUnderscore,
  isJsonString,
} from "../../lib/utils";
import { AutoGrowingTextArea } from "../autoGrowingTextarea";
import FloatingLabelInput, {
  FloatingLabelTextArea,
} from "../floatingLabelInput";
import Modal from "../modal";
import SelectBox, { SelectBoxOption } from "../selectBox";
import Checkbox from "../checkbox";
import { exampleParameters, exampleRequestBody } from "./consts";

const allActionTypes: SelectBoxOption[] = [
  {
    id: null,
    name: "Select an action type",
    icon: (
      <ChevronDownIcon
        className="ml-2 mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "http",
    name: "HTTP request",
    icon: (
      <GlobeAltIcon
        className="ml-2 mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "callback",
    name: "Trigger a callback (coming soon)",
    icon: (
      <CodeBracketSquareIcon
        className="ml-2 mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500"
        aria-hidden="true"
      />
    ),
  },
  {
    id: "link",
    name: "Open a link (coming soon)",
    icon: (
      <LinkIcon
        className="ml-2 mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500"
        aria-hidden="true"
      />
    ),
  },
];

const allRequestMethods: SelectBoxOption[] = [
  {
    id: null,
    name: "Select a request method",
  },
  {
    id: "get",
    name: "GET",
  },
  {
    id: "post",
    name: "POST",
  },
  {
    id: "put",
    name: "PUT",
  },
  {
    id: "delete",
    name: "DELETE",
  },
  {
    id: "patch",
    name: "PATCH",
  },
];
export default function EditActionModal(props: {
  action: Action;
  close: () => void;
  setAction: (action: Action) => void;
}) {
  const saveRef = useRef(null);
  const [nameValid, setNameValid] = useState<boolean>(
    props.action.name.length > 0 && isAlphaNumericUnderscore(props.action.name),
  );

  const [localAction, setLocalAction] = useState<Action>(props.action);

  const [parametersValidJSON, setParameterValidJSON] = useState<boolean>(true);

  const [bodyValidJSON, setBodyValidJSON] = useState<boolean>(true);

  const [responsesValidJSON, setResponsesValidJSON] = useState<boolean>(true);
  const [includeAllInResposes, setIncludeAllInResponses] = useState<boolean>(
    localAction.keys_to_keep === null,
  );
  const [inclInResponsesValidJSON, setInclInResponsesValidJSON] =
    useState<boolean>(true);

  // State variable useful for caching the keys to keep when the checkbox is checked
  const [cacheKeysToKeep, setCacheKeysToKeep] = useState<string[]>(
    localAction.keys_to_keep as string[],
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean | null>(null);
  useEffect(() => {
    if (showAdvanced !== null) {
      let ele = document.getElementById("scroll-modal");
      // If the element exists, scroll to the bottom
      if (ele) {
        ele.scrollTop = ele.scrollHeight;
      }
    }
  }, [showAdvanced]);

  return (
    <Modal open={!!props.action} setOpen={props.close} classNames={"max-w-4xl"}>
      <div className="flex flex-row justify-between">
        <div className="flex flex-row place-items-center gap-x-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
            <PencilSquareIcon
              className="h-6 w-6 text-sky-600"
              aria-hidden="true"
            />
          </div>
          <Dialog.Title as="h3" className="text-xl leading-6 text-gray-100">
            Edit Action
          </Dialog.Title>
        </div>
      </div>

      <div className="mt-10 mb-7 grid grid-cols-2 gap-x-6">
        <div className="relative">
          <FloatingLabelInput
            className={classNames(
              "px-4 text-gray-900 border-gray-200 border focus:border-sky-500 focus:ring-sky-500 focus:ring-1 ",
              nameValid ? "" : "ring-2 ring-offset-1 ring-red-500",
            )}
            floatingClassName={
              nameValid ? "" : "text-red-500 peer-focus:text-gray-400"
            }
            label={"Name"}
            value={localAction.name ?? ""}
            onChange={(e) => {
              const newName = e.target.value.slice(0, 60);
              setLocalAction({
                ...localAction,
                name: newName,
              });
              if (isAlphaNumericUnderscore(newName) && newName.length > 0) {
                setNameValid(true);
              }
            }}
            onBlur={
              isAlphaNumericUnderscore(localAction.name) &&
              localAction.name.length > 0
                ? () => setNameValid(true)
                : () => setNameValid(false)
            }
          />

          <div
            className={classNames(
              "text-red-600 mt-0.5 w-full text-center text-sm",
              nameValid ? "invisible" : "visible",
            )}
          >
            Must only contain letters, numbers, and underscores
          </div>
        </div>
        <SelectBox
          options={allActionTypes}
          theme={"light"}
          selected={localAction.action_type}
          setSelected={(actionType) => {
            setLocalAction({
              ...localAction,
              action_type: actionType,
            });
          }}
          size={"base"}
        />
      </div>
      <FloatingLabelTextArea
        content={localAction.description}
        onChange={(e) => {
          setLocalAction({
            ...localAction,
            description: e.target.value.slice(0, 300),
          });
        }}
        labelText={"Description"}
        helpTooltipText={
          'Information given to the AI about what this action does. E.g. "Sends a message to the user."'
        }
        maxStringLength={300}
      />

      {/* DIVIDER*/}
      <div className={"h-px w-full bg-gray-300 my-4"} />

      <div className="my-4 flex flex-col gap-y-3">
        {/* PATH */}
        <div className="w-full px-6 flex flex-row justify-center place-items-center">
          <div className="font-bold text-lg text-gray-100 w-32">Path:</div>
          <div className="w-full flex-1">
            <input
              className={classNames(
                "px-4 my-0.5 text-gray-900 border-gray-200 border focus:border-sky-500 focus:ring-sky-500 focus:ring-1 w-full py-2.5 rounded outline-0",
                nameValid && localAction.path === ""
                  ? "ring-2 ring-offset-1 ring-red-500"
                  : "",
              )}
              value={localAction.path ?? ""}
              onChange={(e) => {
                setLocalAction({
                  ...localAction,
                  path: e.target.value,
                });
              }}
            />
            {nameValid && localAction.path === "" && (
              <div className="text-red-600 w-full text-center">
                Please enter a valid path (absolute or relative).
              </div>
            )}
          </div>
        </div>
        {/* METHOD */}
        <div className="w-full px-6 flex flex-row justify-center place-items-center">
          <div className="font-bold text-lg text-gray-100 w-32">Method:</div>
          <SelectBox
            options={allRequestMethods}
            theme={"light"}
            selected={localAction.request_method}
            setSelected={(requestMethod) => {
              setLocalAction({
                ...localAction,
                request_method: requestMethod,
              });
            }}
            size={"base"}
          />
        </div>
        {/* PARAMETERS */}
        <p className="text-sm text-gray-500 px-8">
          The following fields must be in JSON-formatter Swagger (OpenAPI
          specification) format.{" "}
          <a
            className="text-blue-500 hover:underline"
            href={"https://editor.swagger.io/"}
            target="_blank"
            rel="noreferrer"
          >
            See examples (in YAML, not JSON) here
          </a>
        </p>
        <div className="-mb-3 w-full flex flex-row justify-end px-7">
          <button
            className={
              "px-3 py-0.5 text-sm bg-gray-200 hover:bg-gray-100 active:bg-gray-50 rounded border "
            }
            onClick={() => {
              setLocalAction({ ...localAction, parameters: exampleParameters });
            }}
          >
            Example parameters
          </button>
        </div>
        <JsonTextBox
          title={"parameters"}
          validJSON={parametersValidJSON}
          setValidJSON={setParameterValidJSON}
          action={localAction}
          setLocalAction={setLocalAction}
        />

        <div className="-mb-3 w-full flex flex-row justify-end px-7">
          <button
            className={
              "px-3 py-0.5 text-sm bg-gray-200 hover:bg-gray-100 active:bg-gray-50 rounded border "
            }
            onClick={() => {
              setLocalAction({
                ...localAction,
                request_body_contents: exampleRequestBody,
              });
            }}
          >
            Example request body
          </button>
        </div>
        {/* REQUEST_BODY_CONTENTS */}
        <JsonTextBox
          title={"request_body_contents"}
          validJSON={bodyValidJSON}
          setValidJSON={setBodyValidJSON}
          action={localAction}
          setLocalAction={setLocalAction}
        />

        {/* RESPONSES */}
        <JsonTextBox
          title={"responses"}
          validJSON={responsesValidJSON}
          setValidJSON={setResponsesValidJSON}
          action={localAction}
          setLocalAction={setLocalAction}
        />

        <div
          className="w-full px-6 select-none cursor-pointer flex flex-row justify-center place-items-center text-gray-100 gap-x-4 rounded border border-gray-600 bg-gray-850 py-1"
          onClick={() => {
            setShowAdvanced(!showAdvanced);
          }}
        >
          Advanced options{" "}
          {showAdvanced ? (
            <MinusIcon className="w-5 h-5 text-gray-100" />
          ) : (
            <PlusIcon className="w-5 h-5 text-gray-100" />
          )}
        </div>
        {showAdvanced && (
          <>
            <div className="w-full px-6 flex flex-row justify-center place-items-center">
              <div className="font-bold text-lg text-gray-100 w-32">
                Requires confirmation
              </div>
              <div className="flex flex-row justify-start place-items-center gap-x-10 flex-1">
                <Checkbox
                  onChange={(checked) => {
                    setLocalAction({
                      ...localAction,
                      requires_confirmation: checked,
                    });
                  }}
                  checked={localAction.requires_confirmation}
                  label={""}
                  size={"lg"}
                />
                <div className="relative z-10">
                  <QuestionMarkCircleIcon className="peer h-6 w-6 text-gray-400 hover:text-gray-300 transition rounded-full hover:bg-gray-850" />
                  <div className={classNames("-top-8 left-12 w-72 popup")}>
                    If enabled, the AI will ask the user to confirm the action
                    before executing it. E.g. &ldquo;Are you sure you want to
                    delete this?&rdquo;
                  </div>
                </div>
              </div>
            </div>
            <div className={"h-px w-full bg-gray-500 my-2"} />
            {/* INCLUDE IN RESPONSES */}
            <div className="w-full px-6 flex flex-row justify-center place-items-center">
              <div className="font-bold text-lg text-gray-100 w-32">
                Include all keys in responses
              </div>
              <div className="flex flex-row justify-start place-items-center gap-x-10 flex-1">
                <Checkbox
                  onChange={(checked) => {
                    setIncludeAllInResponses(checked);
                    if (checked) {
                      setCacheKeysToKeep(
                        (localAction.keys_to_keep as string[]) ?? [],
                      );
                      setLocalAction({ ...localAction, keys_to_keep: null });
                    } else {
                      setLocalAction({
                        ...localAction,
                        keys_to_keep: cacheKeysToKeep,
                      });
                    }
                  }}
                  checked={includeAllInResposes}
                  label={""}
                  size={"lg"}
                />
                <div className="relative z-10">
                  <QuestionMarkCircleIcon className="peer h-6 w-6 text-gray-400 hover:text-gray-300 transition rounded-full hover:bg-gray-850" />
                  <div className={classNames("-top-8 left-12 w-72 popup")}>
                    Some APIs return lots of data which isn&apos;t useful to the
                    AI. Unchecking this enables you to cut out useless data
                    returned from this endpoint, which improves the AI&apos;s
                    performance.
                  </div>
                </div>
              </div>
            </div>
            <JsonTextBox
              title={"keys_to_keep"}
              validJSON={inclInResponsesValidJSON}
              setValidJSON={setInclInResponsesValidJSON}
              action={localAction}
              setLocalAction={setLocalAction}
              disabled={includeAllInResposes}
            />
            <div className={"h-px w-full bg-gray-500 my-2"} />
            <div className="w-full px-6 flex flex-row justify-center place-items-center">
              <div className="w-32 inline">
                <p className="font-bold text-lg text-gray-100 shrink">
                  Action URL
                </p>
                <div className="relative z-10">
                  <QuestionMarkCircleIcon className="peer h-6 w-6 text-gray-400 hover:text-gray-300 transition rounded-full hover:bg-gray-850" />
                  <div className={classNames("-top-24 left-12 w-72 popup")}>
                    This provides a link to the users so they can verify the
                    information given in the AI response is true.
                    <br />
                    <br />
                    You can use the variable names in the API body and
                    parameters enclosed in curly braces &#123;&#125; in the name
                    and URL.
                  </div>
                </div>
              </div>
              <div className="relative w-[calc(100%-5rem)] grid grid-cols-2 gap-x-4">
                <FloatingLabelInput
                  value={localAction.link_name ?? ""}
                  onChange={(e) => {
                    setLocalAction({
                      ...localAction,
                      link_name: e.target.value,
                    });
                  }}
                  label={"Name"}
                />
                <FloatingLabelInput
                  className={"flex-grow"}
                  value={localAction.link_url ?? ""}
                  onChange={(e) => {
                    setLocalAction({
                      ...localAction,
                      link_url: e.target.value,
                    });
                  }}
                  label={"URL"}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          ref={saveRef}
          className={classNames(
            "inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none  sm:order-3  sm:text-sm",
            parametersValidJSON && responsesValidJSON
              ? "bg-sky-600 hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              : "bg-gray-400 cursor-not-allowed",
          )}
          onClick={(event) => {
            event.preventDefault();
            if (nameValid && parametersValidJSON && responsesValidJSON) {
              // This updates the action in the database
              props.setAction(localAction);
              props.close();
            }
          }}
        >
          Save
        </button>
        <button
          className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 sm:mt-0 sm:text-sm"
          onClick={props.close}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

interface JsonTextBoxProps {
  title: "parameters" | "responses" | "request_body_contents" | "keys_to_keep";
  validJSON: boolean;
  setValidJSON: (valid: boolean) => void;
  action: Action;
  setLocalAction: (action: Action) => void;
  disabled?: boolean;
}

const textToJson = (text: string) => {
  return isJsonString(text)
    ? JSON.stringify(JSON.parse(text), undefined, 2)
    : text;
};

function JsonTextBox(props: JsonTextBoxProps) {
  const [text, setText] = useState(
    // Just format the text once at the start to prevent formatting mid-editing
    textToJson(JSON.stringify(props.action[props.title])),
  );
  useEffect(() => {
    setText(textToJson(JSON.stringify(props.action[props.title])));
  }, [props.action]);

  return (
    <>
      <div className="w-full px-6 py-0.5 flex flex-row justify-between place-items-start overflow-hidden">
        <div className="flex flex-col w-32">
          <div
            className={classNames(
              "font-bold text-lg mt-4",
              props.disabled ? "text-gray-500" : "text-gray-100",
            )}
          >
            {props.title !== "keys_to_keep"
              ? props.title.charAt(0).toUpperCase() +
                props.title.slice(1).replace(/_/g, " ")
              : "Include these keys in response"}
          </div>
          {props.title === "keys_to_keep" && (
            <div
              className={classNames(
                "mt-1 text-sm",
                props.disabled ? "text-gray-600" : "text-gray-400",
              )}
            >
              Comma-separated list of keys
            </div>
          )}
        </div>
        <AutoGrowingTextArea
          className={classNames(
            "border border-gray-700 flex-1 px-4 py-3 font-mono text-sm rounded whitespace-pre-wrap resize-none overflow-hidden",
            props.disabled
              ? "bg-gray-700 text-gray-800"
              : "bg-gray-50 text-black",
          )}
          onChange={(e) => {
            setText(e.target.value);
            props.setValidJSON(isJsonString(e.target.value));
          }}
          value={text}
          placeholder={"{}"}
          onBlur={(e) => {
            try {
              const textarea = e.target as HTMLTextAreaElement;
              textarea.value = textToJson(textarea.value);
              const newAction = props.action;
              newAction[props.title] = JSON.parse(e.target.value);
              props.setLocalAction(newAction);
              props.setValidJSON(true);
            } catch (error) {
              props.setValidJSON(false);
            }
          }}
          minHeight={80}
          maxHeight={999999}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              // How many spaces to insert when tab is pressed
              const nSpaces = 2;
              e.preventDefault();
              const textarea = e.target as HTMLTextAreaElement;
              const { selectionStart, selectionEnd, value } = textarea;
              const before = value.substring(0, selectionStart);
              const after = value.substring(selectionEnd);
              if (e.shiftKey) {
                if (before.endsWith(" ".repeat(nSpaces))) {
                  textarea.value = before.slice(0, -2) + after;
                  textarea.selectionStart = textarea.selectionEnd =
                    before.length - nSpaces;
                }
              } else {
                textarea.value = before + " ".repeat(nSpaces) + after;
                textarea.selectionStart = textarea.selectionEnd =
                  before.length + nSpaces;
              }
            }
          }}
          disabled={props.disabled}
        />
      </div>
      <div
        className={classNames(
          "px-32 text-red-500 -mt-10",
          props.validJSON ? "invisible" : "visible",
        )}
      >
        Invalid JSON
      </div>
    </>
  );
}
