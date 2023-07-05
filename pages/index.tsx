import Head from "next/head";
import { Navbar } from "../components/navbar";
import Playground from "../components/playground";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import React, { useEffect } from "react";
import SignInComponent from "../components/signIn";
import { useProfile } from "../components/contextManagers/profile";
import CreateOrgScreen from "../components/onboarding/createOrg";
import Headers from "../components/headers";
import { LoadingSpinner } from "../components/loadingspinner";
import { useRouter } from "next/router";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

function Dashboard() {
  const session = useSession();
  const router = useRouter();
  const { profile, refreshProfile } = useProfile();
  const supabase = useSupabaseClient();
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    (async () => {
      if (isDev && !session) {
        const res = await supabase.auth.signInWithPassword({
          email: "localuser@gmail.com",
          password: "password",
        });
        if (!res.data.session) {
          const res2 = await supabase.auth.signUp({
            email: "localuser@gmail.com",
            password: "password",
            options: { data: { full_name: "Local User" } },
          });
        }
        await refreshProfile();
      }
    })();
  }, [session, refreshProfile, supabase]);

  // TODO: Improve the way we generate join links for orgs
  useEffect(() => {
    if (Object.keys(router.query).length > 0) {
      const { org_id } = router.query;
      if (org_id && typeof org_id === "string") {
        localStorage.setItem("org_id", org_id);
        router.push("/");
      }
    }
  }, [router]);

  return !session ? (
    !isDev ? (
      <SignInComponent />
    ) : (
      <div className="bg-gray-800 h-screen w-screen flex justify-center place-items-center">
        <LoadingSpinner classes={"h-20 w-20 text-gray-300"} />
      </div>
    )
  ) : profile?.org_id === null ? (
    <CreateOrgScreen />
  ) : (
    <div>
      <div className="min-h-screen flex flex-col max-h-screen">
        <Navbar current={"Playground"} />
        <Playground />
      </div>
    </div>
  );
}
