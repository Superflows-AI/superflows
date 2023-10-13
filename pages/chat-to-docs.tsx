import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import { useProfile } from "../components/contextManagers/profile";
import { pageGetServerSideProps } from "../components/getServerSideProps";
import Headers from "../components/headers";
import { Navbar } from "../components/navbar";
import Toggle from "../components/toggle";
import { Database } from "../lib/database.types";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

function ChatToDocsPage() {
  const supabase = useSupabaseClient<Database>();
  const { profile } = useProfile();

  const [orgHasDocs, setOrgHasDocs] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("docs")
        .select("*")
        .eq("org_id", profile?.organizations?.id!)
        .limit(1);
      if (data && data.length === 1) setOrgHasDocs(true);

      const { data: data2 } = await supabase
        .from("organizations")
        .select("chat_to_docs_enabled")
        .eq("id", profile?.organizations?.id!)
        .single();

      if (data2) setEnabled(data2.chat_to_docs_enabled);
    })();
  }, [profile, supabase]);

  useEffect(() => {
    (async () => {
      if (enabled === null) return;
      const { error } = await supabase
        .from("organizations")
        .update({ chat_to_docs_enabled: enabled })
        .eq("id", profile?.organizations?.id!);
      if (error) throw new Error(error.message);
    })();
  }, [enabled, profile, supabase]);

  return (
    <div className="min-h-screen bg-gray-800">
      <Navbar current={"Chat to docs"} />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 bg-gray-850 rounded-md px-6 py-4">
          <h1 className="text-xl text-gray-100">Chat to docs</h1>
          <p className="text-gray-400 mt-2">
            Upload your documentation so that the AI can refer to it when
            answering user questions
          </p>
          <div className="w-full h-px mt-6 mb-8 bg-gray-700" />
          {orgHasDocs ? (
            <div className="grid grid-cols-2 gap-y-2 mt-4 w-1/2  items-center">
              <div className="col-start-1 flex flex-col place-items-start">
                <h2 className="text-lg text-gray-200 ">Enable Chat to Docs</h2>
              </div>
              <Toggle
                enabled={enabled || false}
                setEnabled={setEnabled}
                size="md"
              />
            </div>
          ) : (
            <h2 className="text-lg text-gray-500 mt-8">
              To upload your organization&apos;s docs, please reach out to
              henry@superflows.ai
            </h2>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { profile } = useProfile();
  if (
    process.env.NODE_ENV === "development" ||
    profile?.organizations?.is_paid[0]?.is_premium
  ) {
    return (
      <>
        <ChatToDocsPage />
      </>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Navbar current={"Chat to docs"} />
      <main className="flex flex-col items-center justify-start py-20 flex-1 px-20 text-center bg-gray-800 w-screen h-screen">
        <div className="bg-gray-850 rounded-md px-20 lg:px-40 py-10">
          <h1 className="text-4xl text-gray-200 font-medium">
            Upgrade to use Chat to Docs
          </h1>
          <h2 className="text-xl text-gray-400 font-medium mt-2">
            Chat to Docs allows Superflows to refer to your documentation to
            answer user questions
          </h2>
          <p className="mt-4 text-xl text-gray-400">
            View{" "}
            <a
              href="https://superflows.ai/pricing"
              className="text-blue-600 hover:underline"
            >
              pricing page
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
