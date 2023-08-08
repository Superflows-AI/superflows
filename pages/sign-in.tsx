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
import { LoadingPage } from "../components/loadingspinner";

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

  // When the page loads, check if they have a join_id query param and store in localStorage
  useEffect(() => {
    // If they have a query param, check and store the join link locally
    if (Object.keys(router.query).length > 0) {
      Object.entries(router.query).forEach(([key, value]) => {
        if (value && typeof value === "string") {
          localStorage.setItem(key, value);
        }
      });
      // Redirect to remove the query params from the URL
      router.push("/sign-in", undefined, { shallow: true });
    }
    // Oddly this is needed for sign up from Google on Firefox. Don't know why, but
    // oauth params aren't grabbed from the URL automagically like on other browsers
    void supabase.auth.getSession();
  }, [router]);

  // When they sign in, check if they have a join_id in localStorage and join the org if they do
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN") {
        await refreshProfile();
        if (!profile?.org_id) {
          if (!localStorage.getItem("join_id")) {
            await router.push("/onboarding");
            return;
          } else {
            const join_id = localStorage.getItem("join_id");
            await fetch("/api/join-org", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                join_id,
                user_id: session?.user.id,
              }),
            });
            localStorage.removeItem("join_id");
          }
        }
        await router.push("/");
      } else if (event === "USER_UPDATED") {
        // Only called if the user updates their password
        await router.push("/");
      }
    });
  }, []);

  // Auto-sign in as local user in dev mode
  useEffect(() => {
    if (profile && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.identify(profile.id, {
        name: profile.full_name,
        email: profile.email_address,
      });
    }
    if (isDev && !session) {
      (async () => {
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
      })();
    }
  }, [profile, session, refreshProfile, supabase]);

  if (isDev) return <LoadingPage />;
  return <SignInComponent view={"sign_up"} />;
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx);

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    props: {
      initialSession: session,
    },
  };
};
