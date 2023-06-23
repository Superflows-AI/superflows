import "../styles/globals.css";
import type { AppProps } from "next/app";
import React, {useEffect, useState} from "react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import {SessionContextProvider, Session, useUser} from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { ProfileContextProvider } from "../components/contextManagers/profile";
import {setUser} from "@sentry/nextjs";
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

const POSTHOG_ENABLED = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Check that PostHog is client-side (used to handle Next.js SSR)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug()
    }
  })
}
function SentryUserManager() {
  const user = useUser();

  useEffect(() => {
    if (user) {
      setUser({ id: user.id ?? undefined });
    }
  }, [user]);
  return null;
}

export default function App({
  Component,
  pageProps,
}: AppProps<{
  initialSession: Session;
}>) {
  const router = useRouter();
  // Create a new supabase browser client on every first render.
  const [supabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    // Track page views
    const handleRouteChange = () => POSTHOG_ENABLED ? posthog?.capture('$pageview') : ""
    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [])

  return (
    <ProfileContextProvider
      supabase={supabase}
      disabled={!!pageProps.initialSession}
    >

      <SessionContextProvider
        supabaseClient={supabase}
        initialSession={pageProps.initialSession}
      >
        {POSTHOG_ENABLED ? <PostHogProvider client={posthog}>
          <Component key={router.asPath} {...pageProps} />
          <SentryUserManager/>
        </PostHogProvider> : <>
          <Component key={router.asPath} {...pageProps} />
          <SentryUserManager/>
        </>}
      </SessionContextProvider>

    </ProfileContextProvider>
  );
}
