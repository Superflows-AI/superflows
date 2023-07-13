import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useProfile } from "../contextManagers/profile";
import { LoadingSpinner } from "../loadingspinner";

export default function CreateOrgScreen() {
  const [orgName, setOrgName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const { profile, refreshProfile } = useProfile();
  const supabase = useSupabaseClient();

  useEffect(() => {
    const org_id = localStorage.getItem("org_id");
    if (org_id !== null) {
      localStorage.removeItem("org_id");
      (async () => {
        const profileUpdateRes = await supabase
          .from("profiles")
          .update({ org_id: org_id })
          .eq("id", profile?.id);
        if (profileUpdateRes.error) throw profileUpdateRes.error;
        await refreshProfile();
      })();
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col max-h-screen justify-center place-items-center w-screen bg-gray-800 gap-y-8">
      <h1 className="text-3xl font-medium text-gray-200">
        Create an Organization
      </h1>
      <input
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
        className="bg-gray-100 border-2 border-gray-600 rounded-md p-2 w-96"
      />
      <button
        className="bg-pink-500 text-white rounded-md py-1.5 w-60 flex place-items-center justify-center"
        onClick={async () => {
          if (loading) return;
          setLoading(true);
          const res = await fetch("/api/create-org", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              org_name: orgName,
              user_id: profile?.id,
              // Set to mock api endpoint for now
              api_host: window.location.href + "api/mock",
            }),
          });
          setLoading(false);
          if (res.status !== 200)
            throw new Error("Failed to create org: " + res.statusText);
          await refreshProfile();
        }}
      >
        {loading ? (
          <LoadingSpinner classes={"my-0.5 h-5 w-5"} />
        ) : (
          "Create Organization"
        )}
      </button>
      <div className="h-40" />
    </div>
  );
}
