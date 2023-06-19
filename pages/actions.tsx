import Head from "next/head";
import React, { useEffect, useState } from "react";
// import ChatBotSlideover from "../components/chatBotSlideover";
import { Navbar } from "../components/navbar";
import { LoadingSpinner } from "../components/loadingspinner";
import { classNames } from "../lib/utils";
import PageActionsSection from "../components/actions/actionsSection";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../lib/database.types";
import {useProfile} from "../components/contextManagers/profile";

export default function App() {
  return (
    <>
      <Head>
        <title>Add an AI Assistant to your SaaS Platform | Superflows</title>
        <link rel="icon" href="/favicon.png" />
      </Head>
      <Dashboard />
    </>
  );
}

function Dashboard() {
  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState(false);
  return (
    <div className="h-full bg-gray-800">
      <Navbar current={"Actions"} />
      <div className="flex flex-col gap-y-4 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="min-h-full rounded px-6">
          <RepliesPage />
        </div>
      </div>
    </div>
  );
}

type ActionGroup = Database["public"]["Tables"]["action_groups"]["Insert"];

export function RepliesPage() {
  const supabase = useSupabaseClient();
  const { profile } = useProfile();

  const [userPageActions, setActions] = useState<ActionGroup[]>([]);
  useEffect(() => {
    (async () => {
      const actionGroupRes = await supabase
        .from("action_groups")
        .select("*, actions(*)")
        .eq("org_id", 1);
      if (actionGroupRes.error) throw new Error(actionGroupRes.error);
    })();
  }, []);

  return (
    <div className={classNames("w-full relative")}>
      {userPageActions ? (
        <PageActionsSection
          pageActions={userPageActions}
          setActions={setActions}
        />
      ) : userPageActions !== undefined ? (
        <div className="flex flex-col gap-y-4 text-lg place-items-center justify-center h-120 w-full">
          <LoadingSpinner classes="h-20 w-20" />
          Sprinkling magic dust...
        </div>
      ) : (
        <div className="flex flex-col gap-y-4 text-lg place-items-center justify-center h-120 w-full">
          <p className="font-semibold text-3xl">Something has gone wrong...</p>
          <div className="inline max-w-md text-center">
            Please reach out to Henry at{" "}
            <a
              className="inline underline text-cyan-500 hover:text-cyan-600"
              href="mailto:henry@superflows.ai?cc=matthew@superflows.ai,james@superflows.ai"
            >
              henry@superflows.ai
            </a>{" "}
            and he&apos;ll try and help you out. :)
          </div>
        </div>
      )}
    </div>
  );
}
