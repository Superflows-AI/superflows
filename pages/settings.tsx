import React, { useEffect } from "react";
import { Navbar } from "../components/navbar";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import SignInComponent from "../components/signIn";
import Headers from "../components/headers";
import { useProfile } from "../components/contextManagers/profile";
import {
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import classNames from "classnames";
import { generateApiKey, hash } from "../lib/apiKey";
import WarningModal from "../components/warningModal";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

function Dashboard() {
  const session = useSession();
  const { profile } = useProfile();
  const supabase = useSupabaseClient();
  const [token, setToken] = React.useState<string>("");
  const [copyFeedback, setCopyFeedback] = React.useState<boolean>(false);
  const [warningOpen, setWarningOpen] = React.useState<boolean>(false);
  const [previousKey, setPreviousKey] = React.useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (profile) {
        const res = await supabase
          .from("organizations")
          .select("hashed_api_key")
          .eq("id", profile?.org_id);
        if (res.error) throw res.error;
        if (res.data[0]) {
          setPreviousKey(true);
        }
      }
    })();
  }, [profile]);
  useEffect(() => {
    if (copyFeedback) {
      setTimeout(() => {
        setCopyFeedback(false);
      }, 2000);
    }
  }, [copyFeedback]);

  return !session ? (
    <SignInComponent />
  ) : (
    <>
      <WarningModal
        title={"Deactivate previous API key?"}
        description={
          "By regenerating the organization's API key, you deactivate the previous one. Are you sure you want to do this?"
        }
        action={async () => {
          const key = generateApiKey();
          setToken(key);
          const res = await supabase
            .from("organizations")
            .update({ hashed_api_key: hash(key) })
            .eq("id", profile?.org_id);
          if (res.error) throw res.error;
        }}
        actionColour={"purple"}
        actionName={"Deactivate previous key"}
        open={warningOpen}
        setOpen={setWarningOpen}
      />
      <div className="min-h-screen bg-gray-800">
        <Navbar current={"API"} />
        <div className="h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-12 bg-gray-850 rounded-md px-6 py-4">
            <div className="">
              <h2 className="text-lg text-gray-200">Project API key</h2>
              <p className="mt-1 text-gray-400">
                Your API is secured behind an API gateway which requires an API
                Key for every request.
                <br />
                This is a secret and should not be shared with anyone.
              </p>
            </div>
            <div className="flex flex-col place-items-end">
              <div className="flex flex-row gap-x-3 mt-4 justify-end">
                {(previousKey || token) && (
                  <div className="font-mono rounded font-bold bg-red-700 text-gray-100 text-sm px-1.5 py-1 h-fit">
                    secret
                  </div>
                )}
                <div className="relative border border-gray-600 rounded-md bg-gray-800 text-gray-400 px-20 py-0.5 text-center">
                  {token || "sfk-********-****-****-****-************"}
                  <div className="absolute left-2 top-1">
                    {!token ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  {token && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(token);
                        setCopyFeedback(true);
                      }}
                      className="absolute right-1 top-0.5 border border-gray-500 rounded-md px-2 text-little text-gray-300 bg-purple-800 hover:bg-purple-700"
                    >
                      {!copyFeedback ? "Copy" : "Copied!"}
                    </button>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (previousKey) setWarningOpen(true);
                    else {
                      // If no previous key, just generate a new one
                      const key = generateApiKey();
                      setToken(key);
                      const res = await supabase
                        .from("organizations")
                        .update({ hashed_api_key: hash(key) })
                        .eq("id", profile?.org_id);
                      if (res.error) throw res.error;
                    }
                  }}
                  className={classNames(
                    "border border-gray-600 rounded-md px-2 py-0.5 text-gray-300 flex flex-row gap-x-1 place-items-center",
                    previousKey || token
                      ? "bg-gray-800"
                      : "bg-purple-800 hover:bg-purple-700"
                  )}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  {previousKey ? "Regenerate key" : "Generate key"}
                </button>
              </div>
              <p
                className={classNames(
                  token ? "text-gray-400" : "text-transparent",
                  "mt-3"
                )}
              >
                Copy this key now,{" "}
                <b>you won&apos;t be able to access it again</b>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
