import Head from "next/head";
import React, { useEffect, useState } from "react";
// import ChatBotSlideover from "../components/chatBotSlideover";
import { getApiFromSwagger } from "../lib/utils";
import EditActionModal from "../components/actions/editActionModal";
import { SwaggerResult } from "../lib/types";

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

interface Action {
  route: string;
}

function Dashboard() {
  const [swagger, setSwagger] = useState<SwaggerResult>();

  useEffect(() => {
    async function fetchData() {
      const result = await getApiFromSwagger();
      setSwagger(result);
    }
    fetchData();
  }, []);

  return (
    <div>
      <pre>
        {JSON.stringify(swagger?.paths["/api/v1/Access"] ?? {}, null, 2)}
      </pre>
    </div>
  );
}
