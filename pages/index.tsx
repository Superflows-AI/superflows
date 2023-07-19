import { Navbar } from "../components/navbar";
import Playground from "../components/playground";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import React, { useEffect } from "react";
import SignInComponent from "../components/signIn";
import { useProfile } from "../components/contextManagers/profile";
import Headers from "../components/headers";
import { LoadingPage } from "../components/loadingspinner";
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
    // If they have a query param, check and store the join link locally
    if (Object.keys(router.query).length > 0) {
      const { org_id } = router.query;
      if (org_id && typeof org_id === "string") {
        localStorage.setItem("org_id", org_id);
        router.push("/");
      }
    }
  }, [router]);
  useEffect(() => {
    // Once they're signed in, check if they have an org_id in localstorage
    const org_id = localStorage.getItem("org_id");
    if (org_id !== null) {
      localStorage.removeItem("org_id");
      (async () => {
        const profileUpdateRes = await supabase
          .from("profiles")
          .update({ org_id: org_id })
          .eq("id", profile?.id);
        if (profileUpdateRes.error) throw profileUpdateRes.error;
        await refreshProfile();
        await router.push("/onboarding");
      })();
    } else if (profile?.org_id === null) {
      router.push("/onboarding");
    }
  }, [profile, router]);

  if (!profile?.org_id) {
    if (!isDev) return <SignInComponent view={"sign_up"} />;
    else return <LoadingPage />;
  }

  return (
    <div>
      <div className="min-h-screen flex flex-col max-h-screen">
        <Navbar current={"Playground"} />
        <Playground />
      </div>
    </div>
  );
}
