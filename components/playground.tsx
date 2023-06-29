import { CheckCircleIcon } from "@heroicons/react/24/outline";
import React, { ReactNode, useCallback, useEffect, useState } from "react";
import { Action, ActionGroupJoinActions } from "../lib/types";
import { classNames } from "../lib/utils";
import SelectBox from "./selectBox";
import { Api } from "../lib/swaggerTypes";
import PlaygroundChatbot from "./playgroundChatbot";
import { useProfile } from "./contextManagers/profile";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { MockAction, pageActions } from "../lib/rcMock";

const languageOptions: {
  id: string;
  name: "English" | "Espanol";
  icon: ReactNode;
}[] = [
  {
    id: "EN",
    name: "English",
    icon: <img alt="US" className="h-4 mr-2" src={"us.jpg"} />,
  },
  {
    id: "ES",
    name: "Espanol",
    icon: <img alt="Spain" className="h-4 mr-2" src={"spain.jpg"} />,
  },
];

export default function Playground() {
  const supabase = useSupabaseClient();
  const { profile } = useProfile();
  const [model, setModel] = useState("GPT4");
  const [language, setLanguage] = useState("EN");
  const [isError, setIsError] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");

  // const [actionGroups, setActionGroupsJoinActions] = useState<
  //   ActionGroupJoinActions[]
  // >([]);
  // const loadActions = useCallback(async () => {
  //   const actionGroupRes = await supabase
  //     .from("action_groups")
  //     .select("*, actions(*)")
  //     .eq("org_id", profile?.org_id);
  //   if (actionGroupRes.error) {
  //     setIsError(true);
  //     throw actionGroupRes.error;
  //   }
  //   if (actionGroupRes.data === null) {
  //     setIsError(true);
  //     throw new Error("No data returned");
  //   }
  //   setActionGroupsJoinActions(actionGroupRes.data);
  // }, [profile, supabase]);
  // useEffect(() => {
  //   if (!profile) return;
  //   loadActions();
  // }, [profile]);

  return (
    <>
      {/* Left sidebar */}
      {/*<div className="fixed bottom-0 top-16 z-50 flex w-72 flex-col border-t border-gray-700">*/}
      {/* Sidebar component, swap this element with another sidebar if you like */}
      {/*<div className="bg-gray-800 flex flex-1 flex-col gap-y-5 overflow-y-auto border-r border-gray-700 px-6 pb-4">*/}
      {/*    <div className="mt-6">*/}
      {/*      <h1 className="text-xl text-gray-50 pb-2">{""} Actions</h1>*/}
      {/*      <div className="flex flex-col overflow-y-auto gap-y-3 px-1 py-2">*/}
      {/*        {pageActions[0].actions.map((action, idx) => (*/}
      {/*          <Card*/}
      {/*            key={idx}*/}
      {/*            active={true}*/}
      {/*            handleStateChange={() => {}}*/}
      {/*            //   if (*/}
      {/*            //     !props.activeActions.find((item) => item === action.name)*/}
      {/*            //   ) {*/}
      {/*            //     props.setActiveActions([*/}
      {/*            //       ...props.activeActions,*/}
      {/*            //       action.name,*/}
      {/*            //     ]);*/}
      {/*            //   } else {*/}
      {/*            //     props.setActiveActions(*/}
      {/*            //       props.activeActions.filter(*/}
      {/*            //         (item) => item !== action.name*/}
      {/*            //       )*/}
      {/*            //     );*/}
      {/*            //   }*/}
      {/*            // }}*/}
      {/*            action={action}*/}
      {/*          />*/}
      {/*        ))}*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</div>*/}

      {/*<main className="fixed inset-x-72 top-16 bottom-0">*/}
      <main className="fixed left-0 right-72 top-16 bottom-0">
        <PlaygroundChatbot
          pageActions={pageActions}
          activeActions={pageActions[0].actions.map((action) => action.name)}
          page={"RControl"}
          setPage={() => {}}
          language={
            languageOptions.find((item) => item.id === language)?.name ??
            "English"
          }
          userApiKey={userApiKey}
        />
      </main>

      {/* Right sidebar */}
      <div className="fixed bottom-0 right-0 top-16 z-50 flex w-72 flex-col border-t border-gray-700">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="relative bg-gray-800 flex flex-1 flex-col gap-y-5 overflow-y-auto border-l border-gray-700 px-6 pb-4">
          <div className="mt-6">
            <SelectBox
              title="Model"
              options={[
                { id: "GPT4", name: "GPT4" },
                { id: "GPT3.5", name: "GPT3.5" },
              ]}
              theme={"dark"}
              selected={model}
              setSelected={setModel}
            />
          </div>
          <div className="">
            <SelectBox
              title="Language"
              options={languageOptions}
              theme={"dark"}
              selected={language}
              setSelected={setLanguage}
            />
          </div>
        </div>
        <div className="fixed bottom-0 right-0 w-72 bg-gray-900 py-6 px-4">
          <h2 className="text-gray-100 text-little font-semibold">
            Your API Key
          </h2>
          <p className="text-gray-400 text-sm">
            To call your API, we might need an API key. This is passed in the
            Authorization header.
          </p>
          <input
            className="rounded mt-2 px-2 py-1"
            value={userApiKey}
            onChange={(e) => setUserApiKey(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

function Card(props: {
  active: boolean;
  handleStateChange: (action: MockAction) => void;
  action: MockAction;
}) {
  return (
    <button
      onClick={() => props.handleStateChange(props.action)}
      className={classNames(
        props.active
          ? "border-purple-700 ring-2 ring-purple-700"
          : "border-gray-700",
        "relative flex cursor-pointer rounded-lg border p-2.5 shadow-sm focus:outline-none text-left bg-gray-900 hover:bg-gray-950"
      )}
    >
      <div className="flex flex-col w-full max-h-32 truncate">
        <span
          className="font-medium text-gray-200"
          style={{ maxWidth: "calc(100% - 2rem)" }}
        >
          {props.action.name}
        </span>
        <span className="mt-1 text-sm text-gray-400 truncate whitespace-pre-wrap">
          {props.action.description}
        </span>
      </div>
      <span className="flex-shrink-0 rounded-full bg-900">
        <CheckCircleIcon
          className={classNames(
            !props.active ? "invisible" : "",
            "h-5 w-5 text-purple-700"
          )}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
