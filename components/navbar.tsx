import { CheckIcon } from "@heroicons/react/20/solid";
import {
  ArrowRightOnRectangleIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { classNames } from "../lib/utils";
import { useProfile } from "./contextManagers/profile";
import Flyout from "./flyout";
import FlyoutMenu from "./flyoutMenu";
import { GitHubIcon, SlackIcon } from "./icons";
import WarningModal from "./warningModal";

const navigation = [
  { name: "Playground", href: "/" },
  { name: "Actions", href: "/actions" },
  { name: "AI", href: "/ai-settings" },
  { name: "Project", href: "/project" },
  { name: "Transcripts", href: "/analytics" },
  { name: "Usage", href: "/usage" },
  { name: "Chat to Docs", href: "/chat-to-docs" },
];

const onboardingSteps = [
  {
    name: "Upload your API spec",
    link: "/actions",
  },
  {
    name: "Connect to your API",
    link: "/actions",
  },
  {
    name: "Use the playground",
    link: "/",
  },
  {
    name: "Integrate into your product",
    link: "https://docs.superflows.ai/docs/integration-guide/react",
  },
];

export function Navbar(props: { current: string }) {
  const [warningOpen, setWarningOpen] = useState<boolean>(false);
  const supabase = useSupabaseClient();
  const { profile, refreshProfile } = useProfile();
  const router = useRouter();

  return (
    <>
      <WarningModal
        title={"Sign out"}
        description={
          "Are you sure you want to sign out of your Superflows account?"
        }
        action={async () => {
          await supabase.auth.signOut();
          await refreshProfile();
          await router.push("/sign-in");
        }}
        actionColour={"purple"}
        actionName={"Sign out"}
        open={warningOpen}
        setOpen={setWarningOpen}
      />
      <div className="w-full h-16" />
      <nav className="fixed top-0 inset-x-0 bg-gray-800 border-b border-gray-700 z-20">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between px-4 sm:px-0">
            <div className="flex items-center">
              <Link
                className="text-base sm:text-lg md:text-xl text-white font-medium"
                href={"/"}
              >
                Superflows
              </Link>
              <div className="ml-6 md:ml-14 flex items-center gap-x-1 sm:gap-x-2 md:gap-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={classNames(
                      item.name === props.current
                        ? "bg-gray-900 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white",
                      "rounded-md px-2 md:px-3 py-2 text-xs sm:text-sm font-medium",
                    )}
                    aria-current={
                      item.name === props.current ? "page" : undefined
                    }
                    shallow
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="ml-4 flex place-items-center justify-center gap-x-1.5 md:gap-x-4 md:ml-6">
              <Flyout
                Button={
                  <div
                    className={classNames(
                      "flex justify-center place-items-center rounded-full h-7 w-7 mt-2 hover:bg-gray-700 focus:border-0 focus:outline-0 focus:ring-0",
                      profile &&
                        `progress-bar-${
                          profile?.onboarding_steps.filter(Boolean).length
                        }/4`,
                    )}
                  />
                }
              >
                <div className="flex flex-col gap-y-2 bg-white rounded-md min-w-max px-4 pt-4 pb-6 border shadow">
                  <h2 className="text-lg pb-1 font-medium border-b border-gray-300">
                    Setup checklist
                  </h2>
                  {onboardingSteps.map((step, idx) => (
                    <div key={idx}>
                      {!profile?.onboarding_steps[idx] ? (
                        <Link
                          className="flex flex-row place-items-center gap-x-2 group"
                          href={step.link}
                          target={step.link.startsWith("/") ? "" : "_blank"}
                          rel="noopener noreferrer"
                        >
                          <div className="h-4 w-4 bg-transparent border border-gray-300 rounded-full" />
                          <div className="group-hover:text-blue-500 group-hover:underline">
                            {step.name}
                          </div>
                        </Link>
                      ) : (
                        <div className="flex flex-row place-items-center gap-x-2 cursor-default">
                          <div className="h-4 w-4 bg-transparent overflow-visible border border-gray-300 rounded-full flex justify-center place-items-center">
                            <CheckIcon className="ml-1 mb-1 min-h-[1.25rem] min-w-[1.25rem] text-green-500" />
                          </div>
                          <div className={""}>{step.name}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Flyout>
              <a
                href={
                  "https://docs.superflows.ai/docs/category/integration-guide"
                }
                target={"_blank"}
                rel={"noopener noreferrer"}
                className="rounded-md px-2 py-1 hover:bg-gray-900 text-gray-400 hover:text-gray-200 mt-[0.1875rem] text-sm flex flex-row place-items-center"
              >
                <BookOpenIcon className={"h-5 w-5 m-1"} /> Integration Guide
              </a>
              <FlyoutMenu
                items={[
                  {
                    name: "Read the docs",
                    href: "https://docs.superflows.ai",
                    Icon: (
                      <DocumentTextIcon
                        className="h-6 w-6"
                        aria-hidden="true"
                      />
                    ),
                  },
                  {
                    name: "Ask in Slack",
                    href: "https://join.slack.com/t/superflowsusers/shared_invite/zt-1z8ls9rp3-bSohOrMKOsX8zJOUcDy07g",
                    Icon: <SlackIcon aria-hidden="true" />,
                  },
                  {
                    name: "Add a Github issue",
                    href: "https://github.com/Superflows-AI/superflows/issues/new",
                    Icon: <GitHubIcon aria-hidden="true" />,
                  },
                ]}
                getClassName={() =>
                  "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                }
                buttonClassName={
                  "rounded-md px-2 py-1 hover:bg-gray-900 text-gray-400 hover:text-gray-200 mt-[0.1875rem]"
                }
                Icon={
                  <div className="flex flex-row place-items-center gap-x-1 text-sm">
                    <QuestionMarkCircleIcon
                      className="h-5 w-5 md:h-6 md:w-6"
                      aria-hidden="true"
                    />
                    Help
                  </div>
                }
                popoverClassName={"w-48 z-50"}
                title={"Support"}
              />
              {process.env.NODE_ENV !== "development" && (
                <FlyoutMenu
                  items={[
                    {
                      name: "Manage team",
                      href: "/team",
                      Icon: (
                        <UsersIcon className="h-6 w-6" aria-hidden="true" />
                      ),
                    },
                    {
                      name: "Sign out",
                      onClick: () => setWarningOpen(true),
                      Icon: (
                        <ArrowRightOnRectangleIcon
                          className="h-6 w-6"
                          aria-hidden="true"
                        />
                      ),
                    },
                  ]}
                  getClassName={() =>
                    "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                  }
                  buttonClassName={
                    "rounded-full p-1 hover:bg-gray-900 text-gray-400 hover:text-gray-200 mt-[0.1875rem]"
                  }
                  Icon={
                    <Cog6ToothIcon
                      className="h-5 w-5 md:h-6 md:w-6"
                      aria-hidden="true"
                    />
                  }
                  popoverClassName={"w-48 z-50"}
                />
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
