import Head from "next/head";
import React, { useEffect, useState } from "react";
// import ChatBotSlideover from "../components/chatBotSlideover";
import { Navbar } from "../components/navbar";
import Playground from "../components/playground";
import { pageActions } from "../lib/totangoMock";

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
  const allActions = pageActions.flatMap((page) => page.actions);
  // obviously bad cos doesn't persist between page loads and doesn't
  // deal with actions being available on some pages but not others

  const [activeActions, setActiveActions] = useState<string[]>(
    allActions.map((action) => action.name)
  );

  return (
    <div className="min-h-screen flex flex-col max-h-screen">
      <Navbar current={"Playground"} />
      <Playground
        pageActions={pageActions}
        activeActions={activeActions}
        setActiveActions={setActiveActions}
      />
    </div>
  );
}
