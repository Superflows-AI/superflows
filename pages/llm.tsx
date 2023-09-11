import React from "react";
import { Navbar } from "../components/navbar";
import Headers from "../components/headers";
import { useProfile } from "../components/contextManagers/profile";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import SelectBox, { SelectBoxOption } from "../components/selectBox";
import { Database } from "../lib/database.types";
import { pageGetServerSideProps } from "../components/getServerSideProps";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

const allLLMs: SelectBoxOption[] = [
  {
    id: null,
    name: "Select an LLM",
  },
  {
    id: "gpt-4-0613",
    name: "GPT-4",
    description: "Speed: 1/3 | Accuracy: 3/3",
  },
];

if (process.env.NEXT_PUBLIC_FINETUNED_GPT_DEFAULT) {
  allLLMs.unshift({
    id: process.env.NEXT_PUBLIC_FINETUNED_GPT_DEFAULT,
    name: "Fine-tuned GPT-3.5",
    description: "Speed: 3/3 | Accuracy: 2/3",
  });
}

function Dashboard() {
  const supabase = useSupabaseClient<Database>();
  const { profile, refreshProfile } = useProfile();

  return (
    <div className="min-h-screen bg-gray-800">
      <Navbar current={"LLM"} />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 bg-gray-850 rounded-md px-6 py-4">
          <h1 className="text-xl text-gray-100">Language Model Settings</h1>
          <div className="w-full h-px mt-6 mb-8 bg-gray-700" />
          <div className="grid grid-cols-3 gap-y-12 mt-4">
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Language Model</h2>
              <p className="text-gray-400 text-sm">
                This determines which language model is used by your project.
                Typically there&apos;s a tradeoff between speed and accuracy.
              </p>
            </div>
            <div />
            <SelectBox
              options={allLLMs}
              theme={"dark"}
              selected={profile ? profile!.organizations!.model : "gpt-4-0613"}
              setSelected={async (requestMethod) => {
                const { error } = await supabase
                  .from("organizations")
                  .update({
                    model: requestMethod,
                  })
                  .eq("id", profile?.organizations?.id);
                if (error) throw error;
                await refreshProfile();
              }}
              size={"base"}
            />
          </div>
          <div className="flex flex-col place-items-end">
            <div className="flex flex-row gap-x-3 mt-4 justify-end"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
