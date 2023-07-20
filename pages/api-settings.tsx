import React, { useEffect } from "react";
import { Navbar } from "../components/navbar";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Headers from "../components/headers";
import { useProfile } from "../components/contextManagers/profile";
import {
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import classNames from "classnames";
import { generateApiKey } from "../lib/apiKey";
import WarningModal from "../components/warningModal";
import { pageGetServerSideProps } from "../components/getServerSideProps";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

function Dashboard() {
  const { profile } = useProfile();
  const supabase = useSupabaseClient();
  const [token, setToken] = React.useState<string>("");
  const [showKey, setShowKey] = React.useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = React.useState<boolean>(false);
  const [warningOpen, setWarningOpen] = React.useState<boolean>(false);

  useEffect(() => {
    if (profile) {
      setToken(profile?.organizations?.api_key || "");
    }
  }, [profile]);

  return (
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
            .update({ api_key: key })
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
          <div className="mt-12 bg-gray-850 rounded-md px-6 pt-4 pb-6">
            <h2 className="text-xl text-gray-100">Superflows API key</h2>
            <p className="mt-1 text-gray-400">
              The Superflows API is secured behind a gateway which requires an
              API Key for every request.
              <br />
              This is a secret and should not be shared with anyone.
            </p>
            <div className="flex flex-col place-items-end">
              <div className="flex flex-row gap-x-3 mt-4 justify-end">
                {token && (
                  <div className="font-mono rounded font-bold bg-red-700 text-gray-100 text-sm px-1.5 py-1 h-fit">
                    secret
                  </div>
                )}
                <div className="relative border border-gray-600 rounded-md bg-gray-800 text-gray-400 px-20 py-0.5 text-center">
                  {showKey ? token : "sfk-********-****-****-****-************"}
                  <div className="absolute left-1.5 top-0.5">
                    <button
                      className={
                        "rounded-md px-0.5 py-0.5 text-gray-300 bg-gray-800 hover:bg-gray-700"
                      }
                      onClick={() => setShowKey(!showKey)}
                    >
                      {!showKey ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-500" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {token && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(token);
                        setCopyFeedback(true);
                        setTimeout(() => {
                          setCopyFeedback(false);
                        }, 2000);
                      }}
                      className="absolute right-0.5 top-0.5 border border-gray-500 rounded-md px-2 text-little text-gray-300 bg-purple-800 hover:bg-purple-700"
                    >
                      {!copyFeedback ? "Copy" : "Copied!"}
                    </button>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setWarningOpen(true);
                  }}
                  className={classNames(
                    "border border-gray-600 rounded-md px-2 py-0.5 text-gray-300 flex flex-row gap-x-1 place-items-center bg-gray-800"
                  )}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Regenerate key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = pageGetServerSideProps;
