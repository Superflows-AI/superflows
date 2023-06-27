import Head from "next/head";
import { Navbar } from "../components/navbar";
import Playground from "../components/playground";
import { useSession } from "@supabase/auth-helpers-react";
import React from "react";
import SignInComponent from "../components/signIn";
import { useProfile } from "../components/contextManagers/profile";
import CreateOrgScreen from "../components/onboarding/createOrg";
import Headers from "../components/headers";

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
  const { profile } = useProfile();

  return !session ? (
    <SignInComponent />
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
