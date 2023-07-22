import React, { useEffect } from "react";
import { Navbar } from "../components/navbar";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Headers from "../components/headers";
import { useProfile } from "../components/contextManagers/profile";
import { pageGetServerSideProps } from "../components/getServerSideProps";
import Image from "next/image";
import { Profile } from "../lib/types";
import classNames from "classnames";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

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
  const [copyFeedback, setCopyFeedback] = React.useState<boolean>(false);
  const [teamMembers, setTeamMembers] = React.useState<
    Pick<Profile, "full_name" | "email_address" | "avatar_url">[]
  >([]);

  useEffect(() => {
    if (profile) {
      setToken(profile?.organizations?.join_link_id || "");
      (async () => {
        const res = await fetch("/api/team/?org_id=" + profile?.org_id, {
          method: "GET",
        });
        const json = await res.json();
        setTeamMembers(json);
      })();
    }
  }, [profile]);

  return (
    <div className="min-h-screen bg-gray-800">
      <Navbar current={""} />
      <div className="h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 bg-gray-850 rounded-md px-6 pt-4 pb-6">
          <div className="flex flex-row justify-between">
            <h2 className="text-xl text-gray-100">Members</h2>
            <div className="flex flex-row place-items-center gap-x-4">
              {copyFeedback && (
                <div className="text-gray-100 text-sm font-medium flex flex-row place-items-center gap-x-1">
                  <CheckCircleIcon className="text-green-300 h-6 w-6" /> Copied!
                </div>
              )}
              <button
                className={classNames(
                  "text-gray-100 hover:text-gray-50 bg-blue-600 hover:bg-blue-500 focus:ring-2 ring-offset-2 ring-blue-500 px-3 py-2 rounded-md"
                )}
                onClick={() => {
                  if (!token) return;
                  navigator.clipboard.writeText(
                    `${location.origin}/?join_id=${token}`
                  );
                  setCopyFeedback(true);
                  setTimeout(() => {
                    setCopyFeedback(false);
                  }, 2000);
                }}
              >
                Copy invite link
              </button>
            </div>
          </div>
          <div className="px-12">
            <div className="mt-6 flex flex-col rounded-lg text-lg overflow-hidden border border-gray-400 divide-y divide-gray-400">
              <div className="grid grid-cols-6 place-items-center">
                <div className="text-gray-300 bg-gray-700 w-full h-full text-center" />
                <div className="col-span-2 text-gray-300 bg-gray-700 w-full text-center font-medium py-2">
                  Name
                </div>
                <div className="text-gray-300 col-span-3 bg-gray-700 w-full text-center font-medium py-2">
                  Email
                </div>
              </div>
              {teamMembers.map((member, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-6 place-items-center w-full"
                >
                  <div className="text-gray-300 bg-gray-600 w-full h-full text-center flex justify-center place-items-center">
                    {member.avatar_url && (
                      <img
                        src={member.avatar_url}
                        className="rounded-full h-8 border border-gray-300"
                        alt={"Profile image"}
                      />
                    )}
                  </div>
                  <div className="col-span-2 text-gray-300 bg-gray-600 w-full text-center py-1.5">
                    {member.full_name}
                  </div>
                  <div className="text-gray-300 col-span-3 bg-gray-600 w-full text-center py-1.5">
                    {member.email_address}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
