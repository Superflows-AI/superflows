import React, { useState } from "react";
import { useProfile } from "../contextManagers/profile";
import { LoadingSpinner } from "../loadingspinner";
import { AutoGrowingTextArea } from "../autoGrowingTextarea";
import classNames from "classnames";

export default function CreateOrgScreen(props: { completeStep: () => void }) {
  const [orgName, setOrgName] = useState<string>("");
  const [orgDescription, setOrgDescription] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const { profile, refreshProfile } = useProfile();

  return (
    <div className="relative min-h-screen flex flex-col max-h-screen justify-center place-items-center w-screen bg-gray-800 gap-y-8 px-3 md:px-8">
      <p className="absolute top-5 left-5 text-center sm:text-lg lg:text-xl text-white">
        Superflows
      </p>
      <div className="flex flex-col place-items-center">
        <h1 className="text-4xl font-medium text-white">Create Project</h1>
      </div>
      <div className="bg-gray-850 rounded-md px-6 py-4 max-w-5xl">
        {/*<h1 className="text-xl text-gray-100">Create project</h1>*/}
        <p className="text-gray-400 mt-2">
          This information is used by the AI to understand how it should respond
          to users. You can change this later
        </p>
        <div className="w-full h-px mt-6 mb-8 bg-gray-700" />
        <div className="grid grid-cols-3 gap-y-12 mt-4">
          <div className="col-start-1 flex flex-col place-items-start pr-4">
            <h2 className="text-lg text-gray-200">Name</h2>
            <p className="text-gray-400 text-sm">
              E.g. Stripe Developer Dashboard
            </p>
          </div>
          <div className="flex flex-col gap-y-2">
            <input
              className={classNames(
                "bg-gray-800 text-base text-gray-300 rounded-md px-3 py-1.5 border",
                isError ? "border-red-500" : "border-gray-500"
              )}
              placeholder="Project name"
              value={orgName}
              onChange={(e) => {
                setIsError(false);
                setOrgName(e.target.value.slice(0, 80));
              }}
            />
            {isError && (
              <p className="text-red-500 w-full text-left px-2 text-sm">
                You need to enter a project name.
              </p>
            )}
          </div>
          <div className="col-start-1 flex flex-col place-items-start pr-4">
            <h2 className="text-lg text-gray-200">Description (optional)</h2>
            <p className="text-gray-400 text-sm">
              E.g. Stripe is an API for payments. The dashboard is used by
              developers.
            </p>
          </div>
          <AutoGrowingTextArea
            className={
              "col-span-2 resize-none overflow-hidden bg-gray-800 text-gray-300 rounded-md px-3 py-1.5 focus:ring-gray-200 focus:border-gray-900"
            }
            placeholder={"Project description"}
            value={orgDescription}
            onChange={(e) => setOrgDescription(e.target.value.slice(0, 1000))}
            minHeight={80}
          />
        </div>
        <div className="w-full flex flex-row justify-end pt-6 place-items-center gap-x-6">
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-md py-1.5 w-52 flex place-items-center justify-center"
            onClick={async () => {
              if (loading) return;
              if (orgName.length < 2) {
                setIsError(true);
                return;
              }
              setLoading(true);
              props.completeStep();
              await refreshProfile();
              const res = await fetch("/api/create-org", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  org_name: orgName,
                  description: orgDescription,
                  user_id: profile?.id,
                }),
              });
              setLoading(false);
              if (res.status !== 200)
                throw new Error("Failed to create org: " + res.statusText);
              await refreshProfile();
            }}
          >
            {loading ? <LoadingSpinner classes={"my-0.5 h-5 w-5"} /> : "Create"}
          </button>
        </div>
      </div>
      <div className="h-32" />
    </div>
  );
}
