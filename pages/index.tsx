import Head from "next/head";
// import ChatBotSlideover from "../components/chatBotSlideover";
import { Navbar } from "../components/navbar";
import Playground from "../components/playground";
import { Api } from "../lib/swaggerTypes";

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
  const api = new Api();

  return (
    <div>
      <div className="min-h-screen flex flex-col max-h-screen">
        <Navbar current={"Playground"} />
        <Playground api={api} />
      </div>
    </div>
  );
}
