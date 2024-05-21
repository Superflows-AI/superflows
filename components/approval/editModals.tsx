import React, { useEffect, useState } from "react";
import { AutoGrowingTextArea } from "../autoGrowingTextarea";
import Modal from "../modal";
import { parseCodeGenv3 } from "../../lib/v3/prompts_parsers/codeGen";
import { Action, ApprovalVariable } from "../../lib/types";
import {
  Bars3BottomLeftIcon,
  CodeBracketIcon,
  EyeIcon,
  EyeSlashIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { parseRoutingOutputv3 } from "../../lib/v3/prompts_parsers/routing";
import { classNames, snakeToCamel } from "../../lib/utils";
import { LoadingSpinner } from "../loadingspinner";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import { useProfile } from "../contextManagers/profile";
import { parseFilteringOutputv3 } from "../../lib/v3/prompts_parsers/filtering";
import WarningModal from "../warningModal";
import ComboBox, { ComboboxOption } from "../combobox";
import { getActionTSSignature } from "../../lib/prompts/tsConversion";
import { UIAnswerType, UIMessageData } from "./types";
import QuestionText from "./question";

export function EditRouteModal(props: {
  open: boolean;
  setOpen: () => void;
  setRoute: (route: "DOCS" | "CODE") => void;
  messageData: { id: string; raw_text: string };
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [localChoice, setLocalChoice] = useState(
    parseRoutingOutputv3(props.messageData?.raw_text ?? "")?.choice,
  );
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false);
  const [changed, setChanged] = useState<boolean>(false);
  useEffect(() => {
    if (props.open) {
      setLocalChoice(
        parseRoutingOutputv3(props.messageData?.raw_text ?? "")?.choice,
      );
    }
  }, [props.messageData, props.open]);

  return (
    <>
      <WarningModal
        open={warningModalOpen}
        setOpen={setWarningModalOpen}
        title={"Are you sure you want to regenerate the answer?"}
        description={
          "This will overwrite the current generated answer with a new one. This action cannot be undone."
        }
        actionName={"Regenerate Answer"}
        actionColour={"red"}
        action={async () => {
          if (!changed || !localChoice) return;
          const { error } = await supabase
            .from("approval_answer_messages")
            .update({
              raw_text: `<thinking>${
                profile?.full_name ?? profile?.email_address ?? "A user"
              } set this through the UI at ${new Date().toString()}</thinking><choice>${localChoice}</choice>`,
            })
            .eq("id", props.messageData.id);
          if (error) throw new Error(error.message);
          props.setRoute(localChoice);
        }}
      />
      <Modal open={props.open} setOpen={props.setOpen} classNames="max-w-xl">
        <div className="w-full flex flex-col">
          <div
            className={
              "flex flex-row gap-x-2 text-gray-300 place-items-center mb-2"
            }
          >
            <CodeBracketIcon className={"h-6 w-6"} />
            <h1 className="text-lg text-gray-300">Edit Answer Type</h1>
          </div>
          {localChoice ? (
            <div
              className={"mt-2 flex flex-row justify-center gap-x-10 text-lg"}
            >
              <button
                className={classNames(
                  localChoice === "CODE"
                    ? "bg-gray-900 border-gray-400 text-gray-100"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:text-gray-200 hover:bg-gray-850 hover:border-gray-500",
                  "border px-5 py-2 transition rounded-md",
                )}
                onClick={() => {
                  setLocalChoice("CODE");
                  setChanged(
                    parseRoutingOutputv3(props.messageData?.raw_text ?? "")
                      ?.choice !== "CODE",
                  );
                }}
              >
                API
              </button>
              <button
                className={classNames(
                  localChoice === "DOCS"
                    ? "bg-gray-900 border-gray-400 text-gray-100"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:text-gray-200 hover:bg-gray-850 hover:border-gray-500",
                  "border px-5 py-2 transition rounded-md",
                )}
                onClick={() => {
                  setLocalChoice("DOCS");
                  setChanged(
                    parseRoutingOutputv3(props.messageData?.raw_text ?? "")
                      ?.choice !== "DOCS",
                  );
                }}
              >
                Docs
              </button>
            </div>
          ) : (
            <div className="flex place-items-center justify-center">
              <LoadingSpinner classes={"h-10 w-10 text-gray-400"} />
            </div>
          )}
          <div className={"flex flex-row justify-end gap-x-2 mt-6"}>
            <button
              className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
              onClick={props.setOpen}
            >
              Cancel
            </button>
            <button
              className={classNames(
                changed ? "bg-green-600" : "bg-gray-600 cursor-not-allowed",
                "rounded px-2 py-1 text-gray-50",
              )}
              onClick={() => {
                if (!changed || !localChoice) return;
                setWarningModalOpen(true);
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function EditFilteringModal(props: {
  open: boolean;
  setOpen: () => void;
  actions: { name: string; description: string }[];
  setChosenActions: (chosenActions: string[]) => void;
  messageData: { id: string; raw_text: string };
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [localChosenFunctions, setLocalChosenFunctions] = useState<
    string[] | null
  >(
    parseFilteringOutputv3(
      props.messageData?.raw_text ?? "",
      props.actions.map((m) => snakeToCamel(m.name)),
    )?.selectedFunctions ?? null,
  );
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false);
  const [changed, setChanged] = useState<boolean>(false);
  useEffect(() => {
    if (props.open) {
      setLocalChosenFunctions(
        parseFilteringOutputv3(
          props.messageData?.raw_text ?? "",
          props.actions.map((a) => a.name),
        )?.selectedFunctions,
      );
    }
  }, [props.messageData, props.open]);

  return (
    <>
      <WarningModal
        open={warningModalOpen}
        setOpen={setWarningModalOpen}
        title={"Are you sure you want to regenerate the answer?"}
        description={
          "This will overwrite the current generated answer with a new one. This action cannot be undone."
        }
        actionName={"Regenerate Answer"}
        actionColour={"red"}
        action={async () => {
          if (!changed || !localChosenFunctions) return;
          const { error } = await supabase
            .from("approval_answer_messages")
            .update({
              raw_text: `<thinking>${
                profile?.full_name ?? profile?.email_address ?? "A user"
              } set this through the UI at ${new Date().toString()}</thinking>
<selected_functions>
${localChosenFunctions.join("\n")}
</selected_functions>`,
            })
            .eq("id", props.messageData.id);
          if (error) throw new Error(error.message);
          props.setChosenActions(localChosenFunctions);
        }}
      />
      <Modal
        open={props.open}
        setOpen={props.setOpen}
        classNames="max-w-xl overflow-visible"
      >
        <div className="w-full flex flex-col">
          <div
            className={
              "flex flex-row gap-x-2 text-gray-300 place-items-center mb-2"
            }
          >
            <CodeBracketIcon className={"h-6 w-6"} />
            <h1 className="text-lg text-gray-300">Edit Relevant Actions</h1>
          </div>
          {localChosenFunctions ? (
            <div className="flex flex-col">
              <ComboBox
                options={props.actions
                  .filter((a) => !localChosenFunctions.includes(a.name))
                  .map((a) => ({
                    id: a.name,
                    name: a.name,
                    description: !a.description
                      ? ""
                      : a.description.length > 80
                      ? a.description.slice(0, 80) + "..."
                      : a.description,
                  }))}
                selected={{ id: null, name: "" }}
                setSelected={(selected: ComboboxOption) => {
                  if (
                    props.actions.map((a) => a.name).includes(selected.name) &&
                    !localChosenFunctions.includes(selected.name)
                  ) {
                    setLocalChosenFunctions([
                      ...localChosenFunctions,
                      selected.name,
                    ]);
                    setChanged(true);
                  }
                }}
                theme={"dark"}
              />
              <div className={"mt-4"}>
                <div className="text-gray-200 text-sm">Selected Actions:</div>
                <ul className="flex flex-col gap-y-2 mt-1">
                  {localChosenFunctions.map((name) => (
                    <div
                      key={name}
                      className="flex flex-row gap-x-1 place-items-center"
                    >
                      <li className="rounded border border-gray-400 px-2 py-0.5 w-fit bg-gray-850">
                        <div className="text-gray-200 text-little">{name}</div>
                      </li>
                      <button
                        className="text-gray-400 rounded p-1 hover:text-gray-300 transition duration-150 hover:bg-gray-850"
                        onClick={() => {
                          setLocalChosenFunctions(
                            localChosenFunctions.filter((n) => n !== name),
                          );
                          setChanged(true);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex place-items-center justify-center">
              <LoadingSpinner classes={"h-10 w-10 text-gray-400"} />
            </div>
          )}
          <div className={"flex flex-row justify-end gap-x-2 mt-6"}>
            <button
              className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
              onClick={props.setOpen}
            >
              Cancel
            </button>
            <button
              className={classNames(
                changed
                  ? "bg-purple-700 hover:bg-purple-600"
                  : "bg-gray-600 cursor-not-allowed",
                "rounded px-2 py-1 text-gray-50",
              )}
              onClick={() => {
                if (!changed || !localChosenFunctions) return;
                setWarningModalOpen(true);
              }}
            >
              Regenerate Answer
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function EditCodeModal(props: {
  open: boolean;
  setOpen: () => void;
  messageData: UIMessageData;
  answer: UIAnswerType;
  runCode: (code: string) => void;
  actions: Action[];
}) {
  const [localCode, setLocalCode] = useState(
    parseCodeGenv3(props.messageData.raw_text).code,
  );
  const [changed, setChanged] = useState<boolean>(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showFunctions, setShowFunctions] = useState(false);
  const [softWrap, setSoftWrap] = useState(true);
  useEffect(() => {
    setLocalCode(parseCodeGenv3(props.messageData.raw_text).code);
  }, [props.messageData.raw_text]);
  const [shownError, setShownError] = useState<string | null>(null);
  useEffect(() => {
    setShowPlan(false);
  }, [props.open]);
  useEffect(() => {
    const error = props.messageData.generated_output.find(
      // @ts-ignore
      (m) => m.role === "error",
    );
    // @ts-ignore
    setShownError(error?.content ?? null);
  }, [props.messageData]);

  return (
    <Modal
      open={props.open}
      setOpen={props.setOpen}
      classNames={classNames(
        showFunctions ? "lg:w-screen" : "max-w-5xl",
        "sm:my-2 lg:my-2",
      )}
    >
      <div className="relative w-full flex flex-col">
        <div
          className={
            "mb-2 flex flex-row gap-x-2 text-gray-300 place-items-center w-fit"
          }
        >
          <CodeBracketIcon className={"h-6 w-6"} />
          <h1 className="text-lg text-gray-300">Edit Code</h1>
        </div>
        <div className="absolute top-0 inset-x-32 flex justify-center mb-0.5 text-lg text-gray-300">
          <QuestionText
            questionText={props.answer.approval_questions[0]?.text}
          />
        </div>
        <div
          className={classNames(
            "mb-1 whitespace-pre-line rounded px-2 py-1 bg-gray-750 text-gray-300 text-sm font-mono",
            "flex flex-row place-items-center gap-x-2",
          )}
        >
          <p className="text-gray-400 text-sm font-sans">Functions:</p>
          {showFunctions ? (
            <button onClick={() => setShowFunctions(false)} className="">
              <EyeSlashIcon className="h-4 w-4 text-gray-400" />
            </button>
          ) : (
            <button
              className="text-gray-400 hover:text-gray-300"
              onClick={() => setShowFunctions(true)}
            >
              <EyeIcon className="h-4 w-4" />{" "}
            </button>
          )}
        </div>
        <div
          className={classNames(
            "mb-1 whitespace-pre-line rounded px-2 py-1 bg-gray-750 text-gray-300 text-sm",
            !showPlan ? "flex flex-row place-items-center gap-x-2" : "relative",
          )}
        >
          <p className="text-gray-400 text-sm">Plan:</p>
          {showPlan ? (
            <>
              {parseCodeGenv3(props.messageData.raw_text).plan}
              <button
                onClick={() => setShowPlan(false)}
                className="absolute top-1.5 left-12"
              >
                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
              </button>
            </>
          ) : (
            <button
              className="text-gray-400 hover:text-gray-300"
              onClick={() => setShowPlan(true)}
            >
              <EyeIcon className="h-4 w-4" />{" "}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-2">
          {showFunctions && (
            <div className="text-little text-gray-300">
              <div
                className={classNames(
                  "rounded-md bg-gray-700 px-3 py-2 font-mono text-sm h-[500px] overflow-y-auto text-gray-100",
                  !softWrap
                    ? "overflow-x-auto whitespace-pre"
                    : "whitespace-pre-line",
                )}
              >
                {props.actions
                  .map((action) =>
                    getActionTSSignature(action, true, null, true),
                  )
                  .join("\n\n")}
              </div>
            </div>
          )}
          <div
            className={classNames(
              showFunctions ? "" : "col-span-2",
              "w-full relative",
            )}
          >
            <AutoGrowingTextArea
              className={classNames(
                "rounded font-mono text-sm w-full",
                !softWrap && "overflow-x-auto whitespace-nowrap",
              )}
              placeholder={"Write code here..."}
              value={localCode}
              onChange={(e) => {
                setLocalCode(e.target.value);
                setChanged(
                  e.target.value !==
                    parseCodeGenv3(props.messageData.raw_text).code,
                );
              }}
            />
            <button
              onClick={() => setSoftWrap(!softWrap)}
              className={classNames(
                softWrap
                  ? "bg-gray-100 hover:bg-gray-200"
                  : "bg-gray-200 hover:bg-gray-300",
                "absolute top-1 right-5 rounded p-0.5 border border-gray-300 mb-0.5",
              )}
            >
              <Bars3BottomLeftIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
        {shownError && (
          <div className="bg-red-200 py-1 px-3 text-red-800 border border-red-400 rounded-md my-1">
            {shownError}
          </div>
        )}
        <div className={"flex flex-row justify-end gap-x-2 mt-2"}>
          <button
            className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
            onClick={props.setOpen}
          >
            Cancel
          </button>
          <button
            className={classNames(
              changed ? "bg-green-600" : "bg-gray-600 cursor-not-allowed",
              "rounded px-2 py-1 text-gray-50",
            )}
            onClick={async () => {
              setShownError(null);
              if (!changed) return;
              // TODO: Parse the code and check for obvious issues. Highlight these if present.
              // const parsedCode = parseGeneratedCodev3(localCode, props.actions);
              // if (!parsedCode) {
              //   setShownError(
              //     "Error: No valid code present. Please write valid code.",
              //   );
              //   return;
              // } else if ("error" in parsedCode) {
              //   setShownError(parsedCode.error);
              //   return;
              // }

              props.runCode(
                `<plan>
${parseCodeGenv3(props.messageData.raw_text).plan}
</plan>
<code>
${localCode}
</code>`,
              );
              props.setOpen();
            }}
          >
            Run Code
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function EditUserMessageModal(props: {
  open: boolean;
  close: () => void;
  userMessage: UIMessageData | undefined;
  answer: UIAnswerType;
  variables: ApprovalVariable[];
  setUserMessage: (message: Record<string, any>) => void;
}) {
  const supabase = useSupabaseClient<Database>();
  const [localVariables, setLocalVariables] = useState<Record<string, any>>({});
  const [isValid, setIsValid] = useState<boolean[]>([]);
  useEffect(() => {
    try {
      const parsedVariables = JSON.parse(props.userMessage?.raw_text ?? "{}");
      setLocalVariables(
        Object.entries(parsedVariables).reduce((acc, [k, v]) => {
          if (Array.isArray(v) || typeof v === "object") {
            acc[k] = JSON.stringify(v);
          } else {
            acc[k] = v;
          }
          return acc;
        }, {} as Record<string, any>),
      );
      setIsValid(Object.keys(parsedVariables).map(() => true));
    } catch (e) {
      console.error(e);
    }
  }, [props.userMessage]);
  return (
    <Modal
      open={Boolean(props.open)}
      setOpen={() => props.close()}
      classNames={"max-w-3xl overflow-visible"}
    >
      <div className="w-full flex-col mb-4">
        <h1 className="text-xl text-gray-300">Edit Parameters Values</h1>
      </div>
      {Object.keys(localVariables).length > 0 ? (
        <div className="flex flex-col">
          {Object.entries(localVariables).map(([key, val], idx) => {
            const relevantVariable = props.variables.find(
              (v) => v.name === key,
            );
            if (!relevantVariable) return null;
            return (
              <div
                key={idx}
                className="relative grid grid-cols-6 gap-x-2 border-t first:border-t-0 border-t-gray-600 py-1.5"
              >
                <div className="col-span-2 flex place-items-center h-full">
                  <p className={"text-lg text-gray-300 align-text-bottom"}>
                    {key}
                  </p>
                  <div className="relative">
                    <QuestionMarkCircleIcon
                      className={
                        "ml-3 h-6 w-6 peer text-gray-400 hover:bg-gray-700 transition p-0.5 rounded-full"
                      }
                    />
                    <div className="popup w-64 top-0 left-10 text-gray-300">
                      <div className="text-gray-100">
                        {relevantVariable.description}
                      </div>
                      Default:{" "}
                      {relevantVariable.type.endsWith("[]")
                        ? JSON.stringify(relevantVariable.default)
                        : (relevantVariable.default as
                            | string
                            | boolean
                            | number)}
                    </div>
                  </div>
                </div>
                <input
                  className={classNames(
                    "w-full flex-1 col-span-4",
                    !isValid[idx] && "border-red-500 focus:border-red-600",
                  )}
                  type={relevantVariable.type === "number" ? "number" : "text"}
                  value={typeof val !== "string" ? JSON.stringify(val) : val}
                  onChange={(e) => {
                    const isJson = relevantVariable.type.endsWith("[]");
                    if (isJson) {
                      const newIsValid = [...isValid];
                      try {
                        const parsed = JSON.parse(e.target.value);
                        if (!Array.isArray(parsed)) throw new Error();
                        newIsValid[idx] = true;
                      } catch (e) {
                        newIsValid[idx] = false;
                      }
                      setIsValid(newIsValid);
                    }
                    setLocalVariables((prev) => ({
                      ...prev,
                      [key]:
                        relevantVariable.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    }));
                  }}
                />
                {!isValid[idx] && (
                  <div
                    className={"absolute top-4 right-2 text-sm text-red-600"}
                  >
                    Invalid array
                  </div>
                )}
              </div>
            );
          })}
          <div className={"flex flex-row justify-end gap-x-2 mt-2"}>
            <button
              className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
              onClick={() => props.close()}
            >
              Cancel
            </button>
            <button
              className={classNames(
                "rounded px-2 py-1 text-gray-50",
                props.userMessage?.raw_text ===
                  JSON.stringify(localVariables) || isValid.some((v) => !v)
                  ? "cursor-not-allowed bg-gray-700"
                  : "bg-green-600",
              )}
              onClick={async () => {
                if (!props.userMessage || isValid.some((v) => !v)) return;
                const varsToSave = Object.assign(
                  {},
                  ...Object.entries(localVariables).map(([key, val]) => {
                    if (
                      props.variables
                        .find((v) => v.name === key)
                        ?.type.endsWith("[]")
                    ) {
                      return { [key]: JSON.parse(val) };
                    } else {
                      return { [key]: val };
                    }
                  }),
                );
                const { error } = await supabase
                  .from("approval_answer_messages")
                  .update({
                    raw_text: JSON.stringify(varsToSave, undefined, 2),
                  })
                  .match({ id: props.userMessage.id });
                if (error) throw new Error(error.message);
                props.setUserMessage(localVariables);
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center place-items-center">
          <LoadingSpinner classes={"h-12 w-12 text-gray-400"} />
        </div>
      )}
    </Modal>
  );
}

export function EditAPIKeyModal(props: {
  open: boolean;
  setOpen: () => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
}) {
  const [localValue, setLocalValue] = useState(props.apiKey);
  return (
    <Modal open={props.open} setOpen={props.setOpen} classNames="max-w-xl">
      <div className="w-full flex flex-col">
        <div
          className={
            "flex flex-row gap-x-2 text-gray-300 place-items-center mb-2"
          }
        >
          <CodeBracketIcon className={"h-6 w-6"} />
          <h1 className="text-lg text-gray-300">Edit API Key</h1>
        </div>
        <p className="text-sm text-gray-400 mb-3">
          API key used to access your API.
        </p>
        <input
          className="rounded-md"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
        />
        <p className="w-full text-center text-sm text-gray-400 mt-1">
          This is never stored in our database.
        </p>
        <div className={"flex flex-row justify-end gap-x-2 mt-6"}>
          <button
            className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
            onClick={props.setOpen}
          >
            Cancel
          </button>
          <button
            className={classNames(
              props.apiKey !== localValue
                ? "bg-green-600"
                : "bg-gray-600 cursor-not-allowed",
              "rounded px-2 py-1 text-gray-50",
            )}
            onClick={() => {
              if (props.apiKey === localValue) return;
              localStorage.setItem("userApiKey", localValue);
              props.setApiKey(localValue);
              props.setOpen();
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}
