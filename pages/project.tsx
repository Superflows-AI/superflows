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
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
