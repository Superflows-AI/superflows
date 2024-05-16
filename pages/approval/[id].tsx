import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "../../components/navbar";
import Headers from "../../components/headers";
import { useProfile } from "../../components/contextManagers/profile";
import { pageGetServerSideProps } from "../../components/getServerSideProps";
import classNames from "classnames";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { LoadingPage, LoadingSpinner } from "../../components/loadingspinner";
import Link from "next/link";
import Fuse from "fuse.js";
import { reformatFromFuse } from "../../lib/utils";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import { GroupedUIQuestionData, groupItems } from "./index";
import { VerifyQuestionScreen } from "../../components/approval/verifyAnswerScreen";
import { GetServerSidePropsContext } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import QuestionText from "../../components/approval/question";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

export default function App(props: {
  data: {
    id: string;
    is_generating: boolean;
    approved: boolean;
    generation_failed: boolean;
    approval_answer_groups: { name: string }[];
    group_id: string;
  };
}) {
  const { profile } = useProfile();
  if (!profile) return <LoadingPage />;
  return (
    <>
      <Headers />
      <div className="min-h-screen bg-gray-800">
        <Navbar current={""} />
        <div className="h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto pb-10">
          <div className="flex justify-between w-full">
            <LeftHandSearchSidebar
              answerId={props.data.id}
              group_id={props.data.group_id}
            />
            <VerifyQuestionScreen {...props} />
          </div>
        </div>
      </div>
    </>
  );
}

function LeftHandSearchSidebar(props: { answerId: string; group_id: string }) {
  const { profile } = useProfile();
  const [show, setShow] = useState<boolean>(true);
  const supabase = useSupabaseClient<Database>();
  const [searchText, setSearchText] = useState<string>("");
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [groupsOfQuestions, setGroupsOfQuestions] = useState<
    GroupedUIQuestionData[]
  >([]);
  const [showQuestionGroup, setShowQuestionGroup] = useState<Record<
    string,
    boolean
  > | null>(null);
  const [fuse, setFuse] = useState<Fuse<any> | null>(null);

  useEffect(() => {
    if (profile) {
      (async () => {
        let { data: allQuestionsFromDB, error } = await supabase
          .from("approval_questions")
          .select(
            "text, approval_answers(id,group_id,approved,is_generating,generation_failed,approval_answer_groups(name),approval_answer_messages(id))",
          )
          .match({ primary_question: true, org_id: profile.org_id });
        if (error) throw new Error(error.message);
        if (!allQuestionsFromDB || allQuestionsFromDB.length === 0) {
          return;
        }
        allQuestionsFromDB = allQuestionsFromDB.filter(
          (q) => q.approval_answers!.id !== props.answerId,
        );
        //@ts-ignore
        const items = groupItems(allQuestionsFromDB);
        setGroupsOfQuestions(
          // Order so the current group is top
          items.sort(
            (a, b) =>
              Number(b.id === props.group_id) - Number(a.id === props.group_id),
          ),
        );
        setShowQuestionGroup(
          Object.assign({}, ...items.map((v) => ({ [v.id]: true }))),
        );

        setFuse(
          new Fuse(allQuestionsFromDB, {
            keys: ["text", "approval_answers.approval_answer_groups.name"],
            threshold: 0.6,
          }),
        );
        setAllQuestions(allQuestionsFromDB);
      })();
    }
  }, [profile]);

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchText(value);
      if (!value) {
        setGroupsOfQuestions(groupItems(allQuestions));
        return;
      }
      if (fuse) {
        const searchedItems = reformatFromFuse(fuse.search(value));
        setGroupsOfQuestions(groupItems(searchedItems));
      }
    },
    [fuse],
  );

  return (
    <>
      {show ? (
        <div className="z-10 pt-2 w-80 bg-gray-800 border-r border-r-gray-700">
          <div className={"w-full mb-1"}>
            <Link
              href={"/approval"}
              className="w-fit group flex flex-row place-items-center text-sm text-blue-500 hover:underline"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-1 ease-in-out duration-200 ml-1 mr-0.5" />
              Back to Search
            </Link>
          </div>
          <div className="w-full flex mb-2">
            <input
              className="w-full bg-gray-50 text-sm rounded mx-2 py-1.5"
              value={searchText}
              placeholder={"Search for a question"}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button
              className="rounded-md border border-gray-700 hover:border-gray-600 px-1 py-1 mr-1"
              onClick={() => setShow(!show)}
            >
              <ChevronLeftIcon className={"h-5 w-5 text-gray-400"} />
            </button>
          </div>
          <div className="h-[calc(100vh-8.75rem)] overflow-auto">
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
                <div className="w-full flex flex-row">
                  <h2 className="ml-2 pt-3 mb-1.5 text-lg text-gray-100">
                    {questionGroup.name}
                  </h2>
                  <button
                    className="w-fit ml-auto mr-2 text-gray-400"
                    onClick={() =>
                      setShowQuestionGroup({
                        ...showQuestionGroup,
                        [questionGroup.id]:
                          !showQuestionGroup![questionGroup.id],
                      })
                    }
                  >
                    <ChevronDownIcon
                      className={classNames(
                        "h-5 w-5 text-gray-400 transition",
                        showQuestionGroup &&
                          !showQuestionGroup[questionGroup.id] &&
                          "rotate-90",
                      )}
                    />
                  </button>
                </div>
                {showQuestionGroup &&
                  showQuestionGroup[questionGroup.id] &&
                  questionGroup.questions.map((item, i) => (
                    <div key={i} className="relative group">
                      <Link
                        href={`/approval/${item.approval_answers.id}`}
                        className={classNames(
                          "text-little flex items-center justify-between px-2.5 py-1 text-gray-200 border-b border-b-gray-500 group-hover:bg-gray-750",
                          i % 2 === 0 ? "" : "",
                          i === 0 && "border-t border-t-gray-500",
                        )}
                      >
                        <QuestionText questionText={item.text} />
                        <div className={"flex flex-row pl-10"}>
                          {item.approval_answers.generation_failed ? (
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                          ) : item.approval_answers.is_generating ? (
                            <LoadingSpinner classes={"h-5 w-5 text-gray-400"} />
                          ) : item.approval_answers.approval_answer_messages
                              .length === 0 ? undefined : item.approval_answers
                              .approved ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <p className="text-xs text-gray-400">Ready</p>
                          )}
                        </div>
                      </Link>
                      {item.approval_answers.approval_answer_messages.length ===
                        0 &&
                        !item.approval_answers.is_generating && (
                          <div className="flex place-items-center absolute right-1 inset-y-2 my-auto bg-gray-800 group-hover:bg-gray-750">
                            <button
                              className=" text-gray-300 text-xs py-0.5 px-1 rounded border border-gray-500 hover:bg-gray-700 hover:border-gray-400"
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
                                  console.error(
                                    "No userApiKey in localstorage!",
                                  );
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
                          </div>
                        )}
                    </div>
                  ))}

                {/*<div*/}
                {/*  className={*/}
                {/*    "flex items-center justify-between bg-gray-750 hover:bg-gray-700 text-gray-200 border-b border-b-gray-500"*/}
                {/*  }*/}
                {/*>*/}
                {/*  <button className="w-full flex place-items-center justify-center px-4 py-1">*/}
                {/*    <PlusIcon className={"h-5 w-5 text-gray-400"} />*/}
                {/*  </button>*/}
                {/*</div>*/}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="z-10 bg-gray-800 w-8">
          <button
            className="mt-3 rounded-md border border-gray-700 hover:border-gray-600 px-1 py-1 mr-1"
            onClick={() => setShow(!show)}
          >
            <ChevronRightIcon className={"h-5 w-5 text-gray-400"} />
          </button>
        </div>
      )}
    </>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const signInProps = await pageGetServerSideProps(ctx);
  if (signInProps.redirect) return signInProps;

  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx);

  const { data, error } = await supabase
    .from("approval_answers")
    .select(
      "id,is_generating,generation_failed,approved,group_id, approval_answer_groups(name)",
    )
    .eq("id", ctx.query.id)
    .single();
  if (error) {
    return {
      redirect: {
        // Below redirects, taking into account the join_id
        destination: "/approval",
        permanent: false,
      },
    };
  }
  return { props: { data, ...signInProps.props } };
};
