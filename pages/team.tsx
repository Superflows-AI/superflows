import Head from "next/head";
import React, { useEffect, useState } from "react";
import ChatBotSlideover from "../components/chatBotSlideover";
import { Navbar } from "../components/navbar";
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
