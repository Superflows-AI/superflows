import Headers from "../components/headers";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useProfile } from "../components/contextManagers/profile";
import { Database } from "../lib/database.types";
import React, { useEffect } from "react";
import SignInComponent from "../components/signIn";
import { GetServerSidePropsContext } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import posthog from "posthog-js";

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
  const supabase = useSupabaseClient<Database>();
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (profile) {
      posthog.identify(profile.id, {
        name: profile.full_name,
        email: profile.email_address,
      });
    }
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
      }
    })();
  }, [profile, session, refreshProfile, supabase]);

  // TODO: Improve the way we generate join links for orgs
  // useEffect(() => {
  //   // If they have a query param, check and store the join link locally
  //   if (Object.keys(router.query).length > 0) {
  //     const { org_id } = router.query;
  //     if (org_id && typeof org_id === "string") {
  //       localStorage.setItem("org_id", org_id);
  //       router.push("/");
  //     }
  //   }
  // }, [router]);
  // useEffect(() => {
  //   // Once they're signed in, check if they have an org_id in localstorage
  //   const org_id = localStorage.getItem("org_id");
  //   console.log("WHAT", profile?.org_id);
  //   if (org_id !== null) {
  //     localStorage.removeItem("org_id");
  //     (async () => {
  //       const profileUpdateRes = await supabase
  //         .from("profiles")
  //         .update({ org_id: Number(org_id) })
  //         .eq("id", profile?.id);
  //       if (profileUpdateRes.error) throw profileUpdateRes.error;
  //       await refreshProfile();
  //       await router.push("/onboarding");
  //     })();
  //   }
  // }, [profile, router]);

  return <SignInComponent view={"sign_up"} />;
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx);

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If we are signed in, redirect to the onboarding page
  // if (session) {
  //   return {
  //     redirect: {
  //       destination: "/onboarding",
  //     },
  //   };
  // }

  return {
    props: {
      initialSession: session,
    },
  };
};
