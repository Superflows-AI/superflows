import "../styles/globals.css";
import type { AppProps } from "next/app";
import React, { useState } from "react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider, Session } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { ProfileContextProvider } from "../components/contextManagers/profile";

export default function App({
  Component,
  pageProps,
}: AppProps<{
  initialSession: Session;
}>) {
  const router = useRouter();
  // Create a new supabase browser client on every first render.
  const [supabase] = useState(() => createBrowserSupabaseClient());

  return (
    <ProfileContextProvider
      supabase={supabase}
      disabled={!!pageProps.initialSession}
    >
      <SessionContextProvider
        supabaseClient={supabase}
        initialSession={pageProps.initialSession}
      >
        <Component key={router.asPath} {...pageProps} />
      </SessionContextProvider>
    </ProfileContextProvider>
  );
}
