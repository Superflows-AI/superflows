import { useRouter } from "next/router";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { PRESETS } from "../../lib/consts";
import { useProfile } from "../contextManagers/profile";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import { LoadingPage } from "../loadingspinner";

export default function ChoosePreset(props: { onBackClick: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { profile, refreshProfile } = useProfile();
  const supabase = useSupabaseClient<Database>();

  if (isLoading) return <LoadingPage />;
  return (
    <div className="relative bg-gray-800 h-screen w-screen flex flex-col justify-center place-items-center">
      <p className="absolute top-5 left-5 text-center sm:text-lg lg:text-xl text-white">
        Superflows
      </p>
      <button
        className="absolute bottom-10 left-10 rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 border border-gray-500 flex flex-row place-items-center gap-x-1 p-3"
        onClick={props.onBackClick}
      >
        <ChevronLeftIcon className="h-5 w-5" /> Back
      </button>
      <h1 className="text-gray-100 font-bold text-3xl">Choose a Preset</h1>
      <p className="mt-3 text-gray-300 max-w-md text-center">
        The presets have a set of API endpoints for made-up products. They are
        for demo purposes.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-x-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            className="px-20 py-8 bg-gray-700 hover:bg-gray-600 text-gray-100 text-xl rounded-md border border-gray-400"
            onClick={async () => {
              if (isLoading || !profile) return;
              setIsLoading(true);
              // Create new org
              const res = await fetch("/api/create-org", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  org_name: "",
                  description: "",
                  user_id: profile?.id,
                }),
              });
              if (res.status !== 200) {
                console.error("Failed to create org");
                setIsLoading(false);
                return;
              }
              const json = await res.json();
              const orgId = json.data.id;
              // So the new org shows in the profile
              await refreshProfile();

              // Add spec
              const presetLoc = `/presets/${preset.id}`;
              const specRes = await fetch(
                `${presetLoc}/demo-openapi-spec.json`
              );
              const spec = await specRes.json();
              await fetch("/api/swagger-to-actions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  org_id: orgId,
                  swagger: spec,
                }),
              });

              // Enable all actions
              await supabase
                .from("actions")
                .update({ active: true })
                .eq("org_id", orgId);

              // If not already set, set the org name & description
              let toUpdate: Record<string, any> = {};
              if (!profile.organizations?.name) {
                toUpdate.name = spec.info.title;
              }
              if (!profile.organizations?.description) {
                toUpdate.description = spec.info.description;
              }
              if (Object.keys(toUpdate).length > 0) {
                await supabase
                  .from("organizations")
                  .update(toUpdate)
                  .eq("id", orgId);
              }

              // Set user description
              const userDescRes = await fetch(
                `${presetLoc}/user_description.json`
              );
              // If the file doesn't exist, don't set the user description
              if (userDescRes.status === 200) {
                const userDesc = (await userDescRes.json()) as string;
                localStorage.setItem("userDescription", userDesc);
              }

              // Set test mode to true
              localStorage.setItem("testMode", "true");

              // Add preset suggestions
              const suggRes = await fetch(`${presetLoc}/suggestions.json`);
              const suggestions = (await suggRes.json()) as string[];
              const convRes = await supabase
                .from("conversations")
                // Match number of new conversations to the number of suggestions in the file
                .insert(
                  suggestions.map((_) => ({
                    org_id: orgId!,
                  }))
                )
                .select();
              if (convRes.error) throw convRes.error;
              const chatRes = await supabase.from("chat_messages").insert(
                convRes.data.map((conv, idx) => ({
                  org_id: orgId,
                  conversation_id: conv.id,
                  role: "user",
                  content: suggestions[idx],
                  conversation_index: 0,
                }))
              );
              if (chatRes.error) throw chatRes.error;
              await refreshProfile();
              await router.push("/");
            }}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <p className="mt-10 text-center w-full text-little sm:text-base text-gray-400 max-w-md">
        You can test other presets or configure your own API later.
      </p>
    </div>
  );
}
