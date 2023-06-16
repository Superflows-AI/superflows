import Head from "next/head";
import React, { useEffect, useState } from "react";
import ChatBotSlideover from "../components/chatBotSlideover";
import { Navbar } from "../components/navbar";

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
  // const [open, setOpen] = useState(true);
  // const [hidden, setHidden] = useState(false);
  return (
    <>
      <Navbar current={"Team"} />
      {/*<ChatBotSlideover open={open} setOpen={setOpen} />*/}
      <div className="min-h-full bg-gray-800"></div>
    </>
  );
}
