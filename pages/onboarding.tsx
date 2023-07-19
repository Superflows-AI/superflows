import React, { useEffect } from "react";
import CreateOrgScreen from "../components/onboarding/createOrg";
import Headers from "../components/headers";
import { useProfile } from "../components/contextManagers/profile";
import posthog from "posthog-js";
import { LoadingPage } from "../components/loadingspinner";
import { useRouter } from "next/router";
import { pageGetServerSideProps } from "../components/getServerSideProps";

export default function Onboarding() {
  return (
    <>
      <Headers />
      <OnboardingContent />
    </>
  );
}

function OnboardingContent() {
  const { profile } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (profile?.organizations?.name) {
      posthog.identify(profile.id, {
        name: profile.full_name,
        email: profile.email_address,
        org: profile.organizations.name,
      });
      router.push("/actions");
    }
  }, [profile]);

  if (profile === null) {
    return <LoadingPage />;
  } else {
    // Create an organization
    return (
      <CreateOrgScreen
        completeStep={() => {
          router.push("/actions");
        }}
      />
    );
  }
}

export const getServerSideProps = pageGetServerSideProps;
