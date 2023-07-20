import React, { useEffect } from "react";
import CreateOrgScreen from "../components/onboarding/createOrg";
import Headers from "../components/headers";
import { useProfile } from "../components/contextManagers/profile";
import posthog from "posthog-js";
import ActionsExplanationPage from "../components/onboarding/actionsExplanation";
import { LoadingPage } from "../components/loadingspinner";
import { useRouter } from "next/router";

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
  const [onboardingStep, setOnboardingStep] = React.useState<number>(1);
  const router = useRouter();
  // TODO: Add when there are presets
  // const [isOwnAPI, setIsOwnAPI] = React.useState<boolean>(false);

  useEffect(() => {
    if (profile?.organizations?.name) {
      // setOnboardingStep(2);
      posthog.identify(profile.id, {
        name: profile.full_name,
        org: profile.organizations.name,
      });
      router.push("/actions");
    }
  }, [profile]);

  if (!profile) {
    return <LoadingPage />;
  } else if (onboardingStep === 1) {
    // Create an organization
    return (
      <CreateOrgScreen
        completeStep={() => {
          router.push("/actions");
        }}
      />
    );
  } else {
    // Explanation of how Superflows works
    return <ActionsExplanationPage />;
  }
}
