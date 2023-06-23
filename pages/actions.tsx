import Head from "next/head";
import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "../components/navbar";
import { LoadingSpinner } from "../components/loadingspinner";
import { classNames } from "../lib/utils";
import PageActionsSection from "../components/actions/actionsSection";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useProfile } from "../components/contextManagers/profile";
import SignInComponent from "../components/signIn";
import { ActionGroupJoinActions } from "../lib/types";

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
  const session = useSession();

  return !session ? (
    <SignInComponent />
  ) : (
    <div className="min-h-screen bg-gray-800">
      <Navbar current={"Actions"} />
      <div className="h-[calc(100%-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-full rounded px-6">
          <RepliesPage />
        </div>
      </div>
    </div>
  );
}

export function RepliesPage() {
  const supabase = useSupabaseClient();
  const { profile } = useProfile();
  const [isError, setIsError] = useState(false);

  const [actionGroup, setActionGroupsJoinActions] = useState<
    ActionGroupJoinActions[] | undefined
  >(undefined);
  const loadActions = useCallback(async () => {
    const actionGroupRes = await supabase
      .from("action_groups")
      .select("*, actions(*)")
      .eq("org_id", profile?.org_id);
    if (actionGroupRes.error) {
      setIsError(true);
      throw actionGroupRes.error;
    }
    if (actionGroupRes.data === null) {
      setIsError(true);
      throw new Error("No data returned");
    }
    setActionGroupsJoinActions(actionGroupRes.data);
  }, [profile, supabase]);
  useEffect(() => {
    if (!profile) return;
    loadActions();
  }, [profile]);

  return (
    <div className={classNames("w-full relative h-full")}>
      {actionGroup ? (
        <PageActionsSection
          actionGroups={actionGroup}
          setActionGroups={setActionGroupsJoinActions}
          loadActions={loadActions}
        />
      ) : !isError ? (
        <div className="flex flex-col gap-y-4 text-xl place-items-center justify-center h-full w-full text-gray-300 mt-40">
          <LoadingSpinner classes="h-20 w-20" />
          Loading...
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
