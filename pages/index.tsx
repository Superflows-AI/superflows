import Head from "next/head";
import { Navbar } from "../components/navbar";
import Playground from "../components/playground";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import React from "react";
import SignInComponent from "../components/signIn";

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
  const supabase = useSupabaseClient();

  return !session ? (
    <SignInComponent />
  ) : (
    <div>
      <div className="min-h-screen flex flex-col max-h-screen">
        <Navbar current={"Playground"} />
        <Playground />
      </div>
    </div>
  );
}
