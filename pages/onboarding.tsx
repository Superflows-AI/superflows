import React, { useEffect } from "react";
import CreateOrgScreen from "../components/onboarding/createOrg";
import Headers from "../components/headers";
import { useProfile } from "../components/contextManagers/profile";
import posthog from "posthog-js";
import { LoadingPage } from "../components/loadingspinner";
import { useRouter } from "next/router";
import { pageGetServerSideProps } from "../components/getServerSideProps";
import DefaultOrCustom from "../components/onboarding/defaultOrCustomize";
import ChoosePreset from "../components/onboarding/choosePreset";

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
  const [onboardingStep, setOnboardingStep] = React.useState<number>(0);
  const [usingPreset, setUsingPreset] = React.useState<boolean>(false);

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      posthog.identify(profile.id, {
        name: profile.full_name,
        email: profile.email_address,
        org: profile.organizations?.name ?? undefined,
      });
    }
    if (profile?.organizations?.name && !usingPreset) {
      router.push("/actions", undefined, { shallow: true });
    }
  }, [profile]);

  if (profile === undefined || profile?.organizations?.name) {
    return <LoadingPage />;
  } else if (onboardingStep === 0) {
    return (
      <DefaultOrCustom
        setUsePreset={setUsingPreset}
        nextStep={() => setOnboardingStep(1)}
      />
    );
  } else if (onboardingStep === 1 && !usingPreset) {
    // Create an organization
    return (
      <CreateOrgScreen
        completeStep={() => {
          router.push("/actions");
        }}
        onBackClick={() => setOnboardingStep(0)}
      />
    );
  } else {
    return <ChoosePreset onBackClick={() => setOnboardingStep(0)} />;
  }
}

export const getServerSideProps = pageGetServerSideProps;
