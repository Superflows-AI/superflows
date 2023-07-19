import { Navbar } from "../components/navbar";
import Playground from "../components/playground";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import React, { useEffect } from "react";
import SignInComponent from "../components/signIn";
import { useProfile } from "../components/contextManagers/profile";
import Headers from "../components/headers";
import { LoadingPage } from "../components/loadingspinner";
import { useRouter } from "next/router";
import { Database } from "../lib/database.types";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { GetServerSidePropsContext } from "next";
import { pageGetServerSideProps } from "../components/getServerSideProps";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

function Dashboard() {
  const { profile } = useProfile();

  if (!profile?.org_id) return <LoadingPage />;

  return (
    <div>
      <div className="min-h-screen flex flex-col max-h-screen">
        <Navbar current={"Playground"} />
        <Playground />
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
