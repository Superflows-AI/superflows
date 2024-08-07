import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "../../components/navbar";
import Headers from "../../components/headers";
import { useProfile } from "../../components/contextManagers/profile";
import { pageGetServerSideProps } from "../../components/getServerSideProps";
import classNames from "classnames";
import {
  CheckCircleIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { LoadingPage, LoadingSpinner } from "../../components/loadingspinner";
import Link from "next/link";
import Fuse from "fuse.js";
import { reformatFromFuse } from "../../lib/utils";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import { ApprovalAnswer, ApprovalVariable } from "../../lib/types";
import QuestionText from "../../components/approval/question";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import FlyoutMenu from "../../components/flyoutMenu";
import WarningModal, { WarningModalData } from "../../components/warningModal";
import {
  AddQuestionModal,
  AddGroupModal,
  EditQuestionModal,
} from "../../components/approval/addQuestionModal";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}
export type UIQuestionMessageData = {
  text: string;
  approval_answers: Pick<
    ApprovalAnswer,
    "id" | "group_id" | "approved" | "is_generating" | "generation_failed"
  > & {
    approval_answer_groups: { name: string };
    approval_answer_messages: { id: string }[];
  };
};

function Dashboard() {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [searchText, setSearchText] = useState<string>("");
  const [allQuestions, setAllQuestions] = useState<UIQuestionMessageData[]>([]);
  const [groupsOfQuestions, setGroupsOfQuestions] = useState<
    { name: string; id: string; questions: UIQuestionMessageData[] }[]
  >([]);
  const [showQuestionGroup, setShowQuestionGroup] = useState<Record<
    string,
    boolean
  > | null>(null);
  const [warningModalData, setWarningModalData] = useState<WarningModalData>({
    title: "",
    description: "",
    actionColour: "red",
    open: false,
    action: () => {},
    setOpen: () => setWarningModalData((p) => ({ ...p, open: false })),
    actionName: "Regenerate Answer",
  });
  const [fuse, setFuse] = useState<Fuse<any> | null>(null);
  const [addActionGroupId, setAddActionGroupId] = useState<string | null>(null);
  const [showAddGroupModal, setShowAddGroupModal] = useState<boolean>(false);
  const [questionGroups, setQuestionGroups] = useState<
    { name: string; id: string }[]
  >([]);
  const [editQuestionData, setEditQuestionData] =
    useState<UIQuestionMessageData | null>(null);

  useEffect(() => {
    if (profile) {
      (async () => {
        const { data: allQuestionsFromDB, error } = await supabase
          .from("approval_questions")
          .select(
            "text, approval_answers!inner(id,group_id,approved,is_generating,generation_failed,approval_answer_groups(name),approval_answer_messages(id))",
          )
          .match({ primary_question: true, org_id: profile.org_id })
          .eq("approval_answers.is_docs", false);
        if (error) throw new Error(error.message);
        if (!allQuestionsFromDB) throw new Error("No questions found");
        if (allQuestionsFromDB.some((q) => q.approval_answers === null))
          throw new Error("Questions missing approval answers");
        const { data: questionGroupsFromDB, error: groupError } = await supabase
          .from("approval_answer_groups")
          .select("*")
          .match({ org_id: profile.org_id });
        if (groupError) throw new Error(groupError.message);
        setQuestionGroups(questionGroupsFromDB);
        // @ts-ignore
        const items = groupItems(allQuestionsFromDB, questionGroupsFromDB);
        setGroupsOfQuestions(items);
        setShowQuestionGroup(
          Object.assign({}, ...items.map((v) => ({ [v.id]: true }))),
        );
        setFuse(
          new Fuse(allQuestionsFromDB, {
            keys: ["text", "approval_answers.approval_answer_groups.name"],
            threshold: 0.6,
          }),
        );
        // @ts-ignore
        setAllQuestions(allQuestionsFromDB);
      })();
    }
  }, [profile]);
  useEffect(() => {
    console.log("All questions changed");
    if (allQuestions.length > 0) {
      setGroupsOfQuestions(groupItems(allQuestions, questionGroups));
    }
  }, [allQuestions]);
  const [variableData, setVariableData] = useState<ApprovalVariable[]>([]);
  useEffect(() => {
    (async () => {
      const { data: answerVariableData, error: variableError } = await supabase
        .from("approval_variables")
        .select("*");
      if (variableError) throw new Error(variableError.message);
      setVariableData(answerVariableData ?? []);
    })();
  }, []);

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchText(value);
      if (!value) {
        setGroupsOfQuestions(groupItems(allQuestions, questionGroups));
        return;
      }
      if (fuse) {
        const searchedItems = reformatFromFuse(fuse.search(value));
        setGroupsOfQuestions(groupItems(searchedItems, questionGroups));
      }
    },
    [fuse],
  );
  if (!profile) return <LoadingPage />;

  return (
    <div className="min-h-screen bg-gray-800">
      <Navbar current={"Approval"} />
      <AddQuestionModal
        groupId={addActionGroupId}
        setGroupId={setAddActionGroupId}
        groups={groupsOfQuestions}
        setQuestions={setAllQuestions}
        variableData={variableData}
      />
      <EditQuestionModal
        open={editQuestionData !== null}
        close={() => setEditQuestionData(null)}
        editQuestionData={editQuestionData}
        variableData={variableData}
        groups={groupsOfQuestions}
        setQuestions={setAllQuestions}
      />
      <AddGroupModal
        open={showAddGroupModal}
        close={() => setShowAddGroupModal(false)}
        setGroups={setGroupsOfQuestions}
      />
      <WarningModal {...warningModalData} />
      <div className="h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-6xl pb-10 px-4 sm:px-6 lg:px-8">
        <div className="mt-3 mb-3">
          <div className="w-full flex flex-col mb-2">
            <div className="px-32">
              <input
                className="w-full bg-gray-50 text-little rounded py-1"
                value={searchText}
                placeholder={"Search for a question"}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="mt-2 w-full flex flex-row justify-end gap-x-1.5 text-sm">
              <button
                className={
                  "px-3 py-1 rounded-md bg-purple-700 text-gray-200 hover:bg-purple-600"
                }
                onClick={() => setAddActionGroupId("")}
              >
                Add question
              </button>
              <button
                className={
                  "px-3 py-1 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600"
                }
                onClick={() => setShowAddGroupModal(true)}
              >
                Add group
              </button>
            </div>
          </div>
          <div className="h-[calc(100vh-10rem)] overflow-y-auto overflow-x-hidden">
            {groupsOfQuestions.map((questionGroup, idx) => (
              <div
                key={idx}
                className={classNames(
                  "mb-3",
                  showQuestionGroup &&
                    !showQuestionGroup[questionGroup.id] &&
                    "border-b border-b-gray-500",
                )}
              >
                <div className="w-full flex flex-row justify-between">
                  <div className="">
                    <button
                      className="flex flex-row gap-x-2 place-items-center w-fit ml-auto text-gray-400"
                      onClick={() =>
                        setShowQuestionGroup({
                          ...showQuestionGroup,
                          [questionGroup.id]:
                            !showQuestionGroup![questionGroup.id],
                        })
                      }
                    >
                      <h2 className="ml-4 pt-3 mb-1.5 text-xl text-gray-200">
                        {questionGroup.name}
                      </h2>
                      <ChevronDownIcon
                        className={classNames(
                          "mt-2 h-5 w-5 text-gray-400 transition",
                          showQuestionGroup &&
                            !showQuestionGroup[questionGroup.id] &&
                            "rotate-90",
                        )}
                      />
                    </button>
                  </div>

                  {showQuestionGroup &&
                    showQuestionGroup[questionGroup.id] &&
                    (questionGroup.questions.length > 0 ? (
                      <div
                        className={
                          "flex place-items-end py-1 pr-1 text-sm text-gray-400 mr-10"
                        }
                      >
                        Approved
                      </div>
                    ) : (
                      <button
                        className="h-8 mr-2 px-2 py-1 rounded-md flex flex-row place-items-center gap-x-1 text-gray-400 text-sm hover:text-gray-300 hover:bg-gray-700"
                        onClick={async () => {
                          const { error } = await supabase
                            .from("approval_answer_groups")
                            .delete()
                            .match({ id: questionGroup.id });
                          if (error) throw new Error(error.message);
                          setGroupsOfQuestions((prev) =>
                            prev.filter((g) => g.id !== questionGroup.id),
                          );
                          setQuestionGroups((prev) =>
                            prev.filter((g) => g.id !== questionGroup.id),
                          );
                        }}
                      >
                        <TrashIcon className={"h-4 w-4"} /> Delete
                      </button>
                    ))}
                </div>
                {showQuestionGroup &&
                  showQuestionGroup[questionGroup.id] &&
                  questionGroup.questions.map((item, i) => (
                    <div key={i} className="relative">
                      <Link
                        href={`/approval/${item.approval_answers.id}`}
                        className={classNames(
                          "border-x border-x-gray-500 flex items-center justify-between px-4 py-1 bg-gray-850 text-gray-200 border-b border-b-gray-500 hover:bg-gray-800",
                          i % 2 === 0 ? "" : "",
                          i === 0 && "border-t border-t-gray-500",
                        )}
                      >
                        <QuestionText questionText={item.text} />
                        <div
                          className={"flex flex-row place-items-center gap-x-4"}
                        >
                          {item.approval_answers.generation_failed ? (
                            <XCircleIcon
                              className={"h-5 w-5 text-red-400 mr-2"}
                            />
                          ) : item.approval_answers.is_generating ? (
                            <LoadingSpinner
                              classes={"h-5 w-5 text-gray-400 mr-2"}
                            />
                          ) : item.approval_answers.approval_answer_messages
                              .length === 0 ? undefined : item.approval_answers
                              .approved ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <p className="text-xs text-gray-200">Ready</p>
                          )}
                          <FlyoutMenu
                            items={[
                              {
                                name: "Edit",
                                Icon: <PencilSquareIcon className="h-4 w-4" />,
                                onClick: () => setEditQuestionData(item),
                              },
                              {
                                name: "Delete",
                                Icon: <TrashIcon className="h-4 w-4" />,
                                onClick: () => {
                                  setWarningModalData((p) => ({
                                    ...p,
                                    title: "Delete Question",
                                    description:
                                      "Are you sure you want to delete this question? This can't be reversed",
                                    actionColour: "red",
                                    open: true,
                                    actionName: "Delete",
                                    action: async () => {
                                      const { error } = await supabase
                                        .from("approval_answers")
                                        .delete()
                                        .match({
                                          id: item.approval_answers.id,
                                        });
                                      if (error) throw new Error(error.message);
                                      setGroupsOfQuestions((prev) => {
                                        const newGroups = JSON.parse(
                                          JSON.stringify(prev),
                                        );
                                        const groupIdx = newGroups.findIndex(
                                          (g: any) => g.id === questionGroup.id,
                                        );
                                        newGroups[groupIdx].questions =
                                          newGroups[groupIdx].questions.filter(
                                            (q: any) =>
                                              q.approval_answers.id !==
                                              item.approval_answers.id,
                                          );
                                        return newGroups;
                                      });
                                    },
                                  }));
                                },
                              },
                            ]}
                            getClassName={() => "h-6"}
                            buttonClassName={
                              "h-6 w-6 hover:bg-gray-750 rounded-md border border-transparent hover:border-gray-500"
                            }
                            Icon={
                              <EllipsisHorizontalIcon
                                className="h-6 w-6 p-0.5"
                                aria-hidden="true"
                              />
                            }
                            popoverClassName={"mr-14"}
                          />
                        </div>
                      </Link>
                      {item.approval_answers.approval_answer_messages.length ===
                        0 &&
                        !item.approval_answers.is_generating && (
                          <button
                            className="absolute right-1 top-1.5 text-gray-300 text-xs py-0.5 px-1.5 rounded border border-gray-500 bg-blue-800 hover:bg-blue-700 hover:border-gray-400"
                            onClick={async (e) => {
                              // Update the question to be generating
                              setGroupsOfQuestions((prev) => {
                                const newGroups = JSON.parse(
                                  JSON.stringify(prev),
                                );
                                const groupIdx = newGroups.findIndex(
                                  (g: any) => g.id === questionGroup.id,
                                );
                                newGroups[groupIdx].questions[i] = {
                                  ...item,
                                  approval_answers: {
                                    ...item.approval_answers,
                                    is_generating: true,
                                  },
                                };
                                return newGroups;
                              });
                              // Grab API key from localstorage
                              const userApiKey =
                                localStorage.getItem("userApiKey");
                              if (!userApiKey) {
                                // TODO: Handle this much better
                                console.error("No userApiKey in localstorage!");
                                return;
                              }
                              // Generate the answer
                              const res = await fetch(
                                "/api/v3/generate-answer-offline",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    answer_id: item.approval_answers.id,
                                    user_api_key: userApiKey,
                                  }),
                                },
                              );
                              if (!res.ok) {
                                try {
                                  const resJson = await res.json();
                                  console.error("ERROR:", resJson);
                                } catch (e) {
                                  console.error(
                                    `ERROR: ${res.status} ${res.statusText}`,
                                  );
                                }
                                return;
                              }
                            }}
                          >
                            Generate
                          </button>
                        )}
                    </div>
                  ))}
                {showQuestionGroup && showQuestionGroup[questionGroup.id] && (
                  <div
                    className={
                      "border-x border-x-gray-500 flex items-center justify-between bg-gray-750 hover:bg-gray-700 text-gray-300 border-b border-b-gray-500"
                    }
                  >
                    <button
                      className="w-full flex place-items-center justify-center gap-x-2 px-4 py-1 font-normal"
                      onClick={() => setAddActionGroupId(questionGroup.id)}
                    >
                      <PlusIcon className={"h-5 w-5 text-gray-400"} /> Add
                      question
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export type GroupedUIQuestionData = {
  name: string;
  id: string;
  questions: UIQuestionMessageData[];
};

export function groupItems(
  items: UIQuestionMessageData[],
  variables: { id: string; name: string }[],
): GroupedUIQuestionData[] {
  /** TODO: This is absurd - instead of querying the database properly, we're doing this */
  const out = items
    .filter(
      (item, idx) =>
        items.findIndex(
          (i) => i.approval_answers.id === item.approval_answers.id,
        ) === idx,
    )
    .reduce((acc, item) => {
      const verifiedAnswerGroup =
        item.approval_answers.approval_answer_groups.name;
      const group = acc.find((group) => group.name === verifiedAnswerGroup);
      if (group) {
        group.questions.push(item);
      } else {
        acc.push({
          name: verifiedAnswerGroup,
          id: item.approval_answers.group_id,
          questions: [item],
        });
      }
      return acc;
    }, [] as GroupedUIQuestionData[])
    .map((group) => ({
      ...group,
      questions: group.questions.sort((a, b) => scoreItem(a) - scoreItem(b)),
    }));
  variables.forEach((variable) => {
    if (out.find((group) => group.id === variable.id)) return;
    out.push({
      name: variable.name,
      id: variable.id,
      questions: [],
    });
  });
  return out;
}

function scoreItem(item: any) {
  return item.approval_answers.approved
    ? 0
    : item.approval_answers.is_generating
    ? -1
    : item.approval_answers.generation_failed
    ? -3
    : -2;
}

export const getServerSideProps = pageGetServerSideProps;
