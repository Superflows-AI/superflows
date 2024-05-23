import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import React, { useEffect, useState } from "react";
import { ApprovalAnswerGroup, ApprovalVariable } from "../../lib/types";
import { ClarifyCloseModal } from "../warningModal";
import SelectBox from "../selectBox";
import { useProfile } from "../contextManagers/profile";
import { classNames } from "../../lib/utils";
import { LoadingSpinner } from "../loadingspinner";
import { UIQuestionMessageData } from "../../pages/approval";

export function AddQuestionModal(props: {
  groupId: string | null;
  setGroupId: (actionGroupId: string | null) => void;
  groups: { name: string; id: string }[];
  setQuestions: React.Dispatch<React.SetStateAction<UIQuestionMessageData[]>>;
  variableData: ApprovalVariable[];
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [questionText, setQuestionText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [chosenGroupId, setChosenGroupId] = useState<string | null>(null);
  useEffect(() => {
    if (props.groupId) {
      setChosenGroupId(props.groupId);
    }
    setQuestionText("");
  }, [props.groupId]);

  return (
    <ClarifyCloseModal
      open={props.groupId !== null}
      setOpen={() => props.setGroupId(null)}
      classNames={"max-w-2xl overflow-visible"}
      shouldClarify={Boolean(questionText)}
    >
      <div className="w-full flex flex-col">
        <h1 className={"text-lg text-gray-200 mb-2"}>Add Question</h1>
        <input
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="rounded-md bg-gray-700 border-gray-400 text-gray-100 px-2 py-1 placeholder:text-gray-400"
          placeholder={"Question - include parameters like {parameter}"}
        />
        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        <div className="flex flex-row place-items-center gap-x-4 w-1/2 mt-4">
          <div className={"text-gray-300"}>Group:</div>
          <SelectBox
            options={props.groups}
            selected={chosenGroupId}
            setSelected={async (selected: string) => {
              setChosenGroupId(selected);
            }}
            theme={"dark"}
            includeNull={true}
          />
        </div>

        <div className={"flex flex-row justify-end gap-x-2 mt-2"}>
          <button
            className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
            onClick={() => props.setGroupId(null)}
          >
            Cancel
          </button>
          <button
            className={classNames(
              "rounded px-2 py-1 text-gray-50",
              !questionText || loading || !chosenGroupId
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 cursor-pointer",
            )}
            onClick={async () => {
              if (
                !profile?.org_id ||
                loading ||
                !chosenGroupId ||
                !questionText
              )
                return;
              const validateOut = validateVariablesValid(
                questionText,
                props.variableData,
              );
              if (!validateOut.isValid) {
                setError(validateOut.errorMessage);
                return;
              }
              // Otherwise, it's valid
              setError(null);
              setLoading(true);

              // Generate alternatives first
              const out = await fetch("/api/generate-alternative-questions", {
                method: "POST",
                body: JSON.stringify({
                  question_text: questionText,
                }),
              });
              if (!out.ok) {
                try {
                  const outJson = await out.json();
                  setError(
                    "Failed to generate alternative questions: " +
                      outJson.error,
                  );
                } catch (e) {
                  setError("Failed to generate alternative questions");
                }
                return;
              }
              const outJson = await out.json();

              // Embed & save alternatives to DB
              const embedRes = await fetch("/api/embed-questions", {
                method: "POST",
                body: JSON.stringify({
                  questions: [questionText, ...outJson.alternatives],
                }),
              });
              if (!out.ok) {
                try {
                  const outJson = await out.json();
                  setError("Failed to embed questions: " + outJson.error);
                } catch (e) {
                  setError("Failed to embed alternative questions");
                }
                return;
              }
              const embedJson = await embedRes.json();

              // Save in the DB
              const { data: answerData, error } = await supabase
                .from("approval_answers")
                .insert({
                  group_id: chosenGroupId,
                  org_id: profile.org_id,
                })
                .select()
                .single();
              if (error) {
                setError(`Failed to save question: ${error.message}`);
                console.error(`Failed to save question: ${error.message}`);
                return;
              }
              const { error: questionsError } = await supabase
                .from("approval_questions")
                .insert(
                  embedJson.data.map((toInsert: any) => ({
                    ...toInsert,
                    org_id: profile.org_id,
                    answer_id: answerData.id,
                  })),
                );
              if (questionsError) {
                setError(`Failed to save question: ${questionsError.message}`);
                console.error(
                  `Failed to save question: ${questionsError.message}`,
                );
                return;
              }
              props.setQuestions((prev) => [
                ...prev,
                {
                  text: questionText,
                  approval_answers: {
                    id: answerData.id,
                    group_id: chosenGroupId,
                    is_generating: true,
                    approved: false,
                    generation_failed: false,
                    approval_answer_groups: { name: "" },
                    approval_answer_messages: [],
                  },
                },
              ]);
              props.setGroupId(null);
              setLoading(false);

              // Generate answer
              void fetch("/api/v3/generate-answer-offline", {
                method: "POST",
                body: JSON.stringify({
                  answer_id: answerData.id,
                }),
              });
            }}
          >
            {loading ? (
              <LoadingSpinner classes={"h-5 w-5 mx-6"} />
            ) : (
              "Add Question"
            )}
          </button>
        </div>
        {loading && (
          <div
            className={
              "flex flex-row justify-end gap-x-2 mt-2 text-sm text-gray-500"
            }
          >
            Generating question, do not close this window.
          </div>
        )}
      </div>
    </ClarifyCloseModal>
  );
}

export function validateVariablesValid(
  questionText: string,
  variables: ApprovalVariable[],
): { isValid: true } | { isValid: false; errorMessage: string } {
  const questionVariableNames = (questionText.match(/{(.*?)}/g) ?? []).map(
    (v) => v.slice(1, -1),
  );
  const isValidArr = questionVariableNames.map((vName) =>
    variables.some((v) => v.name === vName),
  );
  if (isValidArr.every((v) => v)) return { isValid: true };
  return {
    isValid: false,
    errorMessage: `The following variables are invalid: ${questionVariableNames
      .filter((_, i) => !isValidArr[i])
      .join(", ")}`,
  };
}

export function EditQuestionModal(props: {
  open: boolean;
  close: () => void;
  editQuestionData: {
    text: string;
    approval_answers: Omit<
      UIQuestionMessageData["approval_answers"],
      "approval_answer_messages" | "approval_answer_groups"
    >;
  } | null;
  variableData: ApprovalVariable[];
  groups?: Pick<ApprovalAnswerGroup, "name" | "id">[];
  setQuestionText?: React.Dispatch<React.SetStateAction<string>>;
  setAlternatives?: (
    alternatives: { text: string; primary_question: boolean }[],
  ) => void;
  setQuestions?: React.Dispatch<React.SetStateAction<UIQuestionMessageData[]>>;
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [questionText, setQuestionText] = useState<string>("");
  const [allGroups, setAllGroups] = useState<
    Pick<ApprovalAnswerGroup, "name" | "id">[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (props.groups && props.groups.length > 0) {
      setAllGroups(props.groups);
    } else {
      (async () => {
        const { data: answerGroups, error: groupsError } = await supabase
          .from("approval_answer_groups")
          .select("*");
        if (groupsError) throw new Error(groupsError.message);
        setAllGroups(answerGroups ?? []);
      })();
    }
  }, [props.groups]);
  const [loading, setLoading] = useState<boolean>(false);
  const [chosenGroupId, setChosenGroupId] = useState<string | null>(null);
  useEffect(() => {
    if (props.editQuestionData !== null) {
      setChosenGroupId(props.editQuestionData.approval_answers.group_id);
      setQuestionText(props.editQuestionData.text);
    }
  }, [props.editQuestionData]);

  return (
    <ClarifyCloseModal
      open={props.open}
      setOpen={props.close}
      classNames={"max-w-2xl overflow-visible"}
      shouldClarify={Boolean(questionText)}
    >
      <div className="w-full flex flex-col">
        <h1 className={"text-lg text-gray-200 mb-2"}>Edit Question</h1>
        <input
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="rounded-md bg-gray-700 border-gray-400 text-gray-100 px-2 py-1 placeholder:text-gray-400"
          placeholder={"Question - include parameters like {parameter}"}
        />
        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        <div className="flex flex-row place-items-center gap-x-4 w-1/2 mt-4">
          <div className={"text-gray-300"}>Group:</div>
          <SelectBox
            options={allGroups}
            selected={chosenGroupId}
            setSelected={async (selected: string) => {
              setChosenGroupId(selected);
            }}
            theme={"dark"}
            includeNull={true}
          />
        </div>

        <div className={"flex flex-row justify-end gap-x-2 mt-2"}>
          <button
            className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
            onClick={props.close}
          >
            Cancel
          </button>
          <button
            className={classNames(
              "rounded px-2 py-1 text-gray-50",
              !questionText || loading || !chosenGroupId
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 cursor-pointer",
            )}
            onClick={async () => {
              if (
                !profile?.org_id ||
                loading ||
                !chosenGroupId ||
                !questionText ||
                !props.editQuestionData?.approval_answers.id ||
                (props.editQuestionData.text === questionText &&
                  props.editQuestionData.approval_answers.group_id ===
                    chosenGroupId)
              ) {
                return;
              }
              const validateOut = validateVariablesValid(
                questionText,
                props.variableData,
              );
              if (!validateOut.isValid) {
                setError(validateOut.errorMessage);
                return;
              }
              // Otherwise, it's valid
              setError(null);
              setLoading(true);

              // Question text hasn't changed
              if (props.editQuestionData.text === questionText) {
                // Update group_id
                const { error: groupError } = await supabase
                  .from("approval_answers")
                  .update({ group_id: chosenGroupId })
                  .match({ id: props.editQuestionData.approval_answers.id });
                if (groupError) {
                  setError(`Failed to update group: ${groupError.message}`);
                  console.error(
                    `Failed to update group: ${groupError.message}`,
                  );
                  return;
                }
                props.setQuestions &&
                  props.setQuestions((prev) => {
                    const newPrev = [...prev];
                    const idx = newPrev.findIndex(
                      (q) =>
                        q.approval_answers.id ===
                        props.editQuestionData?.approval_answers.id,
                    );
                    newPrev[idx].approval_answers.group_id = chosenGroupId;
                    newPrev[idx].approval_answers.approval_answer_groups.name =
                      allGroups.find((g) => g.id === chosenGroupId)?.name ?? "";
                    return newPrev;
                  });
                props.close();
                setLoading(false);
                return;
              }

              // Generate alternatives first
              const out = await fetch("/api/generate-alternative-questions", {
                method: "POST",
                body: JSON.stringify({
                  question_text: questionText,
                }),
              });
              if (!out.ok) {
                try {
                  const outJson = await out.json();
                  setError(
                    "Failed to generate alternative questions: " +
                      outJson.error,
                  );
                } catch (e) {
                  setError("Failed to generate alternative questions");
                }
                return;
              }
              const outJson = (await out.json()) as { alternatives: string[] };

              // Embed alternatives
              const embedRes = await fetch("/api/embed-questions", {
                method: "POST",
                body: JSON.stringify({
                  questions: [questionText, ...outJson.alternatives],
                }),
              });
              if (!out.ok) {
                try {
                  const outJson = await out.json();
                  setError("Failed to embed questions: " + outJson.error);
                } catch (e) {
                  setError("Failed to embed alternative questions");
                }
                return;
              }
              const embedJson = await embedRes.json();

              // Delete existing questions for this answer in the DB
              const { error: deleteError } = await supabase
                .from("approval_questions")
                .delete()
                .match({
                  answer_id: props.editQuestionData?.approval_answers.id,
                });
              if (deleteError) {
                setError(
                  `Failed to delete existing questions: ${deleteError.message}`,
                );
                console.error(
                  `Failed to delete existing questions: ${deleteError.message}`,
                );
                return;
              }

              // Save in the DB
              const { error: questionsError } = await supabase
                .from("approval_questions")
                .insert(
                  embedJson.data.map((toInsert: any) => ({
                    ...toInsert,
                    group_id: chosenGroupId,
                    org_id: profile.org_id,
                    answer_id: props.editQuestionData?.approval_answers.id,
                  })),
                );
              if (questionsError) {
                setError(`Failed to save question: ${questionsError.message}`);
                console.error(
                  `Failed to save question: ${questionsError.message}`,
                );
                return;
              }
              props.setQuestionText && props.setQuestionText(questionText);
              props.setQuestions &&
                props.setQuestions((prev) => {
                  const idx = prev.findIndex(
                    (q) =>
                      q.approval_answers.id ===
                      props.editQuestionData?.approval_answers.id,
                  );
                  prev[idx].text = questionText;
                  prev[idx].approval_answers.group_id = chosenGroupId;
                  return prev;
                });
              props.setAlternatives &&
                props.setAlternatives([
                  { text: questionText, primary_question: true },
                  ...outJson.alternatives.map((text) => ({
                    text,
                    primary_question: false,
                  })),
                ]);
              props.close();
              setLoading(false);

              // Generate answer
              void fetch("/api/v3/generate-answer-offline", {
                method: "POST",
                body: JSON.stringify({
                  answer_id: props.editQuestionData?.approval_answers.id,
                }),
              });
            }}
          >
            {loading ? (
              <LoadingSpinner classes={"h-5 w-5 mx-6"} />
            ) : (
              "Edit Question"
            )}
          </button>
        </div>
        {loading && (
          <div
            className={
              "flex flex-row justify-end gap-x-2 mt-2 text-sm text-gray-500"
            }
          >
            Doing smart stuff, do not close this window.
          </div>
        )}
      </div>
    </ClarifyCloseModal>
  );
}

export function AddGroupModal(props: {
  open: boolean;
  close: () => void;
  setGroups: React.Dispatch<
    React.SetStateAction<
      { name: string; id: string; questions: UIQuestionMessageData[] }[]
    >
  >;
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [groupName, setGroupName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  return (
    <ClarifyCloseModal
      open={props.open}
      setOpen={props.close}
      classNames={"max-w-xl overflow-visible"}
      shouldClarify={Boolean(groupName)}
    >
      <div className="w-full flex flex-col">
        <h1 className={"text-lg text-gray-200 mb-2"}>Add Question Group</h1>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="rounded-md bg-gray-700 border-gray-400 text-gray-100 px-2 py-1 placeholder:text-gray-400"
          placeholder={"E.g. Sales"}
        />
        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}

        <div className={"flex flex-row justify-end gap-x-2 mt-2"}>
          <button
            className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
            onClick={props.close}
          >
            Cancel
          </button>
          <button
            className={classNames(
              "rounded px-2 py-1 text-gray-50",
              !groupName
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 cursor-pointer",
            )}
            onClick={async () => {
              if (!profile?.org_id || !groupName) return;
              const { data, error } = await supabase
                .from("approval_answer_groups")
                .insert({
                  org_id: profile.org_id,
                  name: groupName,
                })
                .select()
                .single();
              if (error) {
                setError(`Failed to save group: ${error.message}`);
                console.error(`Failed to save group: ${error.message}`);
                return;
              }
              props.setGroups((prev) => [
                { name: groupName, id: data.id, questions: [] },
                ...prev,
              ]);
              props.close();
            }}
          >
            Add Group
          </button>
        </div>
      </div>
    </ClarifyCloseModal>
  );
}
