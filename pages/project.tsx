import React, { useEffect, useState } from "react";
import { Navbar } from "../components/navbar";
import Headers from "../components/headers";
import { AutoGrowingTextArea } from "../components/autoGrowingTextarea";
import { useProfile } from "../components/contextManagers/profile";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import classNames from "classnames";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import SelectBox from "../components/selectBox";
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

function Dashboard() {
  const supabase = useSupabaseClient<Database>();
  const { profile, refreshProfile } = useProfile();
  const [localName, setLocalName] = useState<string>(
    profile?.organizations?.name || ""
  );
  const [localDescription, setLocalDescription] = useState<string>(
    profile?.organizations?.description || ""
  );
  const [apiHost, setApiHost] = React.useState<string>("");
  const [apiHostSavedFeedback, setApiHostSavedFeedback] = React.useState<
    boolean | null
  >(null);

  useEffect(() => {
    profile && setApiHost(profile?.organizations?.api_host || "");
  }, [profile]);

  return (
    <div className="min-h-screen bg-gray-800">
      <Navbar current={"Project"} />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 bg-gray-850 rounded-md px-6 py-4">
          <h1 className="text-xl text-gray-100">Project Info</h1>
          <p className="text-gray-400 mt-2">
            The Superflows AI uses this to tailor the AI to your project.
          </p>
          <div className="w-full h-px mt-6 mb-8 bg-gray-700" />
          <div className="grid grid-cols-3 gap-y-12 mt-4">
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Name</h2>
              <p className="text-gray-400 text-sm">
                E.g. Stripe Developer Dashboard
              </p>
            </div>
            <input
              className="bg-gray-800 text-lg text-gray-300 rounded-md px-3 py-1.5 border border-gray-500"
              placeholder="Project Name"
              value={localName}
              onChange={(e) => setLocalName(e.target.value.slice(0, 80))}
              onBlur={async () => {
                const res = await supabase
                  .from("organizations")
                  .update({ name: localName })
                  .eq("id", profile?.organizations?.id);
                if (res.error) throw res.error;
                await refreshProfile();
              }}
            />
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Description</h2>
              <p className="text-gray-400 text-sm">
                Describe what your product is and include useful information
                about how to use your API.
                <br />
                <br />
                E.g. Stripe is an API for payments. The dashboard is used by
                developers. To create a payment link, you need to have a product
                id and a price id...
              </p>
            </div>
            <AutoGrowingTextArea
              className={
                "col-span-2 resize-none overflow-hidden bg-gray-800 text-gray-300 rounded-md px-3 py-1.5 focus:ring-gray-200 focus:border-gray-900"
              }
              placeholder={"Project description"}
              value={localDescription}
              onChange={(e) =>
                setLocalDescription(e.target.value.slice(0, 1000))
              }
              onBlur={async () => {
                const res = await supabase
                  .from("organizations")
                  .update({ description: localDescription })
                  .eq("id", profile?.organizations?.id);
                if (res.error) throw res.error;
                await refreshProfile();
              }}
              minHeight={80}
            />
          </div>
          <div className="flex flex-col place-items-end">
            <div className="flex flex-row gap-x-3 mt-4 justify-end"></div>
          </div>
        </div>

        <div className="mt-6 bg-gray-850 rounded-md px-6 py-4 mb-40">
          <h2 className="text-xl text-gray-100">API Settings</h2>
          <p className="mt-1 text-gray-400">
            These are required to connect Superflows to your API so it can
            answer questions and take actions in your product.
          </p>
          <div className="w-full h-px mt-6 mb-8 bg-gray-700" />
          <div className="grid grid-cols-3 gap-y-10 mt-4">
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">API Host</h2>
              <p className="text-gray-400 text-sm">
                The url where your API is hosted.
                <br />
                E.g. https://api.stripe.com
              </p>
            </div>
            <div className="relative col-span-2 flex flex-row gap-x-3 mt-6 mb-3 justify-end">
              <div
                className={classNames(
                  "absolute top-1 left-32 flex flex-row place-items-center gap-x-1 text-gray-200",
                  apiHostSavedFeedback !== null ? "" : "invisible"
                )}
              >
                {apiHostSavedFeedback ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                {apiHostSavedFeedback ? "Saved" : "Save failed"}
              </div>
              <div className="relative flex flex-col w-[calc(50%+8rem)]">
                <input
                  className="border border-gray-300 rounded-md bg-gray-700 grow text-gray-200 px-5 py-1"
                  onChange={(e) => setApiHost(e.target.value)}
                  value={apiHost}
                  onBlur={async () => {
                    const res = await supabase
                      .from("organizations")
                      .update({ api_host: apiHost })
                      .eq("id", profile?.org_id);
                    if (res.error) throw res.error;
                    await refreshProfile();
                    setApiHostSavedFeedback(!res.error);
                    setTimeout(() => {
                      setApiHostSavedFeedback(null);
                    }, 2000);
                  }}
                />
                <p className="text-sm w-full mt-3 flex justify-center place-items-baseline text-gray-500">
                  This should probably start with{" "}
                  <code className="ml-1 rounded-md bg-gray-800 px-1 text-gray-500">
                    https://
                  </code>
                </p>
              </div>
            </div>

            {/* Authorization method */}
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Authentication header</h2>
              <p className="text-gray-400 text-sm">
                Set up how authentication headers are set on HTTP requests to
                your API.
              </p>
            </div>
            <div className="relative mb-4 col-span-2 flex flex-row place-items-center gap-x-3 mt-6 justify-end text-gray-200 text-xl">
              <SelectBox
                options={[
                  {
                    id: "Authorization",
                    name: "Authorization",
                  },
                  {
                    id: "Proxy-Authorization",
                    name: "Proxy-Authorization",
                  },
                  {
                    id: "x-api-key",
                    name: "x-api-key",
                  },
                  {
                    id: "apiKey",
                    name: "apiKey",
                  },
                ]}
                selected={profile?.organizations?.auth_header ?? null}
                setSelected={async (selected: string) => {
                  const res = await supabase
                    .from("organizations")
                    .update({ auth_header: selected })
                    .eq("id", profile?.org_id);
                  if (res.error) throw res.error;
                  await refreshProfile();
                }}
                theme="dark"
              />
              :
              <SelectBox
                options={[
                  {
                    id: null,
                    name: "None",
                  },
                  {
                    id: "Bearer",
                    name: "Bearer",
                  },
                  {
                    id: "Basic",
                    name: "Basic",
                  },
                  {
                    id: "app-token",
                    name: "app-token",
                  },
                  {
                    id: "Digest",
                    name: "Digest",
                  },
                  {
                    id: "HOBA",
                    name: "HOBA",
                  },
                  {
                    id: "Mutual",
                    name: "Mutual",
                  },
                  {
                    id: "VAPID",
                    name: "VAPID",
                  },
                  {
                    id: "SCRAM",
                    name: "SCRAM",
                  },
                ]}
                selected={profile?.organizations?.auth_scheme ?? null}
                setSelected={async (selected: string) => {
                  const res = await supabase
                    .from("organizations")
                    .update({ auth_scheme: selected })
                    .eq("id", profile?.org_id);
                  if (res.error) throw res.error;
                  await refreshProfile();
                }}
                theme={"dark"}
                includeNull={true}
              />
              <div className="relative h-16 flex place-items-center">
                <code className="flex justify-center place-items-center h-[2.25rem] font-mono bg-gray-900 px-9 text-gray-500 rounded-md text-base font-normal">
                  {"< AUTH PARAMETERS/API-KEY HERE >"}
                </code>
                <p className="absolute -bottom-3 text-sm w-full mt-3 flex text-center justify-center place-items-baseline text-gray-300">
                  These are sent in each request to the Superflows API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
