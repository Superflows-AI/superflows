import React, { useEffect } from "react";
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

let allLLMsBase: SelectBoxOption[] = [
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

const openRouterBaseModels = [
  {
    id: "meta-llama/llama-2-70b-chat",
    name: "Llama 2 (Beta)",
    description: "In Beta, may be unstable",
  },
  {
    id: "anthropic/claude-2",
    name: "Anthropic - Claude 2 (Beta)",
    description: "In Beta, may be unstable",
  },
  {
    id: "google/palm-2-chat-bison",
    name: "Google - PaLM 2 Chat Bison (Beta)",
    description: "In Beta, may be unstable",
  },
];

const languages = [
  {
    id: "Detect Language",
    name: "Detect Language (recommended)",
    description: "Best for multilingual projects",
  },
  {
    id: "English",
    name: "English",
  },
  {
    id: "Spanish",
    name: "Spanish",
  },
  {
    id: "French",
    name: "French",
  },
  {
    id: "German",
    name: "German",
  },
  {
    id: "Portuguese",
    name: "Portuguese",
  },
  {
    id: "Chinese",
    name: "Chinese",
  },
  {
    id: "Russian",
    name: "Russian",
  },
  {
    id: "Arabic",
    name: "Arabic",
  },
];

function Dashboard() {
  const supabase = useSupabaseClient<Database>();
  const { profile, refreshProfile } = useProfile();
  const [allLLMs, setAllLLMs] = React.useState<SelectBoxOption[]>(() => {
    const finetunedGPTDefault = process.env.NEXT_PUBLIC_FINETUNED_GPT_DEFAULT
      ? [
          {
            id: process.env.NEXT_PUBLIC_FINETUNED_GPT_DEFAULT,
            name: "Fine-tuned GPT-3.5",
            description: "Speed: 3/3 | Accuracy: 2/3",
          },
        ]
      : [];

    const openRouterModels = process.env.NEXT_PUBLIC_OPENROUTER_ENABLED
      ? openRouterBaseModels
      : [];
    return [...finetunedGPTDefault, ...allLLMsBase, ...openRouterModels];
  });
  const [llm, setLlm] = React.useState<null | string>(
    profile?.organizations?.model ?? null,
  );
  const [loaded, setLoaded] = React.useState<boolean>(false);
  useEffect(() => {
    if (profile && !loaded) {
      setLoaded(true);
      setLlm(profile!.organizations!.model);
      setLlmLanguage(profile!.organizations!.language);
    }
  }, [profile]);

  useEffect(() => {
    if (
      profile?.organizations?.finetuned_models &&
      profile.organizations.finetuned_models.length > 0
    ) {
      setAllLLMs([
        ...profile.organizations?.finetuned_models
          .sort(
            (a, b) =>
              Number(new Date(b.created_at)) - Number(new Date(a.created_at)),
          )
          .map((model, idx, array) => ({
            id: model.openai_name,
            name: `Fine-tuned GPT 3.5 (${profile.organizations?.name}) ${
              array.length - idx
            }`,
            description: "Speed: 3/3 | Accuracy: 2.5/3",
          })),
        ...allLLMsBase,
      ]);
    }
  }, [profile?.organizations?.finetuned_models]);
  const [llmLanguage, setLlmLanguage] = React.useState<null | string>(
    profile?.organizations?.language ?? null,
  );

  return (
    <div className="min-h-screen bg-gray-800">
      <Navbar current={"AI"} />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 bg-gray-850 rounded-md px-6 py-4">
          <h1 className="text-xl text-gray-100">Language Model Settings</h1>
          <div className="w-full h-px mt-6 mb-4 bg-gray-700" />
          <div className="grid grid-cols-4 gap-y-12 mt-4">
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Language Model</h2>
              <p className="text-gray-400 text-sm">
                This determines which language model is used by your project.
                Typically there&apos;s a tradeoff between speed and accuracy.
              </p>
            </div>
            <div className="mt-4 col-start-3 col-span-2">
              <SelectBox
                options={allLLMs}
                theme={"dark"}
                selected={llm}
                setSelected={async (requestMethod) => {
                  setLlm(requestMethod);
                  const { error } = await supabase
                    .from("organizations")
                    .update({
                      model: requestMethod,
                    })
                    .eq("id", profile?.organizations?.id!);
                  if (error) throw error;
                  await refreshProfile();
                }}
                size={"base"}
              />
            </div>
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Language Used</h2>
              <p className="text-gray-400 text-sm">
                Only change from &ldquo;Detect Language&rdquo; if you only want
                to respond in one language.
              </p>
            </div>
            <div className="mt-4 col-start-3 col-span-2">
              <SelectBox
                options={languages}
                theme={"dark"}
                selected={llmLanguage}
                setSelected={async (language) => {
                  setLlmLanguage(language);
                  const { error } = await supabase
                    .from("organizations")
                    .update({ language })
                    .eq("id", profile?.organizations?.id!);
                  if (error) throw error;
                  await refreshProfile();
                }}
                size={"base"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
