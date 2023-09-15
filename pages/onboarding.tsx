import React, { useEffect, useRef, useState } from "react";
import Headers from "../components/headers";
import { useProfile } from "../components/contextManagers/profile";
import posthog from "posthog-js";
import { LoadingPage } from "../components/loadingspinner";
import { useRouter } from "next/router";
import { pageGetServerSideProps } from "../components/getServerSideProps";
import UploadSpec from "../components/onboarding/uploadSpec";
import { Api } from "../lib/types";
import ConfirmAuth from "../components/onboarding/confirmAuth";
import ProgressBar from "../components/onboarding/progressBar";

export default function Onboarding() {
  return (
    <>
      <Headers />
      <OnboardingContent />
    </>
  );
}

function OnboardingContent() {
  const { profile, refreshProfile } = useProfile();
  const router = useRouter();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [api, setApi] = useState<Api | null>(null);
  const [onboardingStep, setOnboardingStep] = React.useState<number>(0);
  const alreadyRun = useRef(false);

  useEffect(() => {
    if (profile) {
      posthog.identify(profile.id, {
        name: profile.full_name,
        email: profile.email_address,
        org: profile.organizations?.name ?? undefined,
      });
    }
    if (profile?.organizations?.name) {
      router.push("/", undefined, { shallow: true });
      return;
    }
    if (!profile || orgId || alreadyRun.current) return;
    alreadyRun.current = true;
    (async () => {
      let orgId = profile.org_id;
      if (!orgId) {
        const createOrgRes = await fetch("/api/create-org", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Set as empty for now
            org_name: "",
            description: "",
            user_id: profile?.id,
          }),
        });
        if (createOrgRes.status !== 200) {
          throw new Error("Failed to create org: " + createOrgRes.statusText);
        }
        const createOrgJson = await createOrgRes.json();
        orgId = createOrgJson.data.id;
      }
      setOrgId(orgId);
    })();
  }, [profile]);

  if (profile === undefined || !orgId || profile?.organizations?.name) {
    return <LoadingPage />;
  }
  return (
    <>
      {onboardingStep === 0 ? (
        <UploadSpec
          nextStep={() => setOnboardingStep(1)}
          orgId={orgId}
          setApi={setApi}
        />
      ) : (
        <ConfirmAuth
          api={api!}
          setApi={setApi}
          nextStep={() => {
            setOnboardingStep(2);
            (async () => {
              await refreshProfile();
              await router.push("/", undefined, { shallow: true });
            })();
          }}
        />
      )}
      <ProgressBar step={onboardingStep + 1} />
    </>
  );
}

export const getServerSideProps = pageGetServerSideProps;
