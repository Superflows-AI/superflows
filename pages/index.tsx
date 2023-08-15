import { Navbar } from "../components/navbar";
import Playground from "../components/playground";
import React from "react";
import { useProfile } from "../components/contextManagers/profile";
import Headers from "../components/headers";
import { LoadingPage } from "../components/loadingspinner";
import { useRouter } from "next/router";
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
  const router = useRouter();

  if (profile === undefined) return <LoadingPage />;
  else if (!profile?.org_id) {
    router.push("/onboarding");
    return <LoadingPage />;
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

export const getServerSideProps = pageGetServerSideProps;
