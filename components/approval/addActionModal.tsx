import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import React, { useEffect, useState } from "react";
import { ApprovalVariable } from "../../lib/types";
import { ClarifyCloseModal } from "../warningModal";
import SelectBox from "../selectBox";
import { useProfile } from "../contextManagers/profile";
import { classNames } from "../../lib/utils";
import { LoadingSpinner } from "../loadingspinner";
import { UIQuestionMessageData } from "../../pages/approval";

export function AddActionModal(props: {
  group_id: string;
  setGroupId: (actionGroupId: string) => void;
  groups: { name: string; id: string }[];
  setGroups: React.Dispatch<
    React.SetStateAction<
      { name: string; id: string; questions: UIQuestionMessageData[] }[]
    >
  >;
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [questionText, setQuestionText] = useState<string>("");
  const [variableData, setVariableData] = useState<ApprovalVariable[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data: answerVariableData, error: variableError } = await supabase
        .from("approval_variables")
        .select("*");
      if (variableError) throw new Error(variableError.message);
      setVariableData(answerVariableData ?? []);
    })();
  }, []);
  const [loading, setLoading] = useState<boolean>(false);
  const [chosenGroupId, setChosenGroupId] = useState<string>("");
  useEffect(() => {
    if (props.group_id) setChosenGroupId(props.group_id);
  }, [props.group_id]);

  return (
    <ClarifyCloseModal
      open={Boolean(props.group_id)}
      setOpen={() => props.setGroupId("")}
      classNames={"max-w-4xl overflow-visible"}
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
            onClick={() => props.setGroupId("")}
          >
            Cancel
          </button>
          <button
            className={classNames(
              "rounded px-2 py-1 text-gray-50",
              loading ? "bg-gray-600" : "bg-green-600",
            )}
            onClick={async () => {
              if (!profile?.org_id || loading) return;
              const validateOut = validateVariablesValid(
                questionText,
                variableData,
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
              props.setGroups((prev) =>
                prev.map((g) => {
                  if (g.id === chosenGroupId) {
                    return {
                      ...g,
                      questions: [
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
                        ...g.questions,
                      ],
                    };
                  }
                  return g;
                }),
              );
              props.setGroupId("");
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
