import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import { useProfile } from "./contextManagers/profile";
import PlaygroundChatbot from "./playgroundChatbot";
import Toggle from "./toggle";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { classNames } from "../lib/utils";

export default function Playground() {
  const supabase = useSupabaseClient();
  const [userDescription, setUserDescription] = useState<string>("");
  const [userApiKey, setUserApiKey] = useState<string>("");
  const [testModeEnabled, setTestModeEnabled] = useState<boolean | null>(null);

  const { profile } = useProfile();
  const [numActions, setNumActions] = useState<number>(0);

  useEffect(() => {
    setTestModeEnabled(localStorage.getItem("testMode") === "true");
    localStorage.getItem("userApiKey") &&
      setUserApiKey(localStorage.getItem("userApiKey") as string);
    localStorage.getItem("userDescription") &&
      setUserDescription(localStorage.getItem("userDescription") as string);
  }, []);

  useEffect(() => {
    if (testModeEnabled !== null)
      localStorage.setItem("testMode", testModeEnabled.toString());
  }, [testModeEnabled]);

  useEffect(() => {
    (async () => {
      if (profile) {
        const res2 = await supabase
          .from("actions")
          .select("*", { head: true, count: "exact" })
          .eq("org_id", profile.org_id)
          .is("active", true);
        if (res2.error) throw res2.error;
        setNumActions(res2.count ?? 0);
      }
    })();
  }, [profile]);

  return (
    <>
      <div className="fixed bottom-0 left-0 top-16 z-10 flex w-40 md:w-56 lg:w-72 flex-col border-t border-gray-700">
        <div className="relative bg-gray-800 flex flex-1 flex-col gap-y-5 overflow-y-auto border-l border-gray-700 px-6 pb-4">
          <div className="mt-6">
            <h2 className="text-gray-200 font-medium">User description</h2>
            <p className="text-gray-400 text-sm">
              With each API request, you can provide a description of the user
              who is asking the question, any useful information for accessing
              your API (e.g. user id) and instructions on how to address them.
            </p>
            <textarea
              className="mt-4 w-full h-96 bg-gray-700 border border-gray-600 rounded-md focus:border-purple-700 focus:ring-purple-700 placeholder:text-gray-400 text-gray-200 px-3 py-2 text-sm resize-none"
              placeholder="E.g. Bill is a salesperson at Acme Corp. His project id is f35ahe2g1p. He's not comfortable with statistical terms, instead use plain English to answer his questions."
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              onBlur={() => {
                localStorage.setItem("userDescription", userDescription);
              }}
            />
          </div>
        </div>
      </div>
      <main className="fixed inset-x-40 md:inset-x-56 lg:inset-x-72 top-16 bottom-0">
        <PlaygroundChatbot
          userApiKey={userApiKey}
          userDescription={userDescription}
          submitErrorMessage={
            !numActions ||
            (!profile?.organizations?.api_host && !testModeEnabled)
              ? `You need to add${numActions ? "" : " actions (Actions tab)"}${
                  numActions ||
                  profile?.organizations?.api_host ||
                  testModeEnabled
                    ? ""
                    : " and"
                }${
                  profile?.organizations?.api_host || testModeEnabled
                    ? "."
                    : " an API host (Project tab) or enable test mode."
                }`
              : ""
          }
          testMode={!!testModeEnabled}
        />
      </main>
      <div className="absolute z-0 bottom-0 right-0 top-16 flex w-40 md:w-56 lg:w-72 flex-col border-t border-gray-700">
        <div className="relative bg-gray-800 flex flex-1 flex-col gap-y-5 overflow-y-auto border-l border-gray-700 px-6 pt-6 pb-4">
          <div className="relative">
            <div className="peer flex flex-col place-items- gap-y-1 text-sm text-gray-200 font-bold">
              <div className="flex flex-row gap-x-1 place-items-center">
                Test mode
                <QuestionMarkCircleIcon className="h-4 w-4 text-gray-300" />
              </div>
              <div className="flex place-items-center justify-center bg-gray-700 rounded-md p-2.5 border border-gray-300 w-full">
                {testModeEnabled !== null && (
                  <Toggle
                    enabled={testModeEnabled}
                    size={"sm"}
                    setEnabled={setTestModeEnabled}
                    sr={"Test mode"}
                  />
                )}
              </div>
            </div>
            <div className="popup top-20 font-normal text-sm">
              Test mode mocks the API response, so you can use the playground
              without connecting to your API.
            </div>
          </div>
        </div>
        <div
          className={classNames(
            "fixed bottom-0 right-0 w-40 md:w-56 lg:w-72 bg-gray-900 py-4 px-4 transition-opacity",
            testModeEnabled ? "opacity-0" : "opacity-100"
          )}
        >
          <h2 className="text-gray-100 text-little font-semibold">
            Your API Key
          </h2>
          <p className="text-gray-400 text-sm">
            To call your API, we might need an API key. This is passed in the
            Authorization header.
          </p>
          <input
            className="rounded mt-2 px-2 py-1 w-full"
            value={userApiKey}
            onChange={(e) => setUserApiKey(e.target.value)}
            onBlur={() => {
              localStorage.setItem("userApiKey", userApiKey);
            }}
          />
          <p className="w-full text-center text-gray-300 mt-0.5 text-sm">
            We never store this in our database.
          </p>
        </div>
      </div>
    </>
  );
}
