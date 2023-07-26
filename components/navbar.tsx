import React, { useEffect, useState } from "react";
import { Disclosure } from "@headlessui/react";
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { classNames } from "../lib/utils";
import Link from "next/link";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import FlyoutMenu from "./flyoutMenu";
import { GitHubIcon, SlackIcon } from "./icons";
import WarningModal from "./warningModal";
import { useProfile } from "./contextManagers/profile";
import { useRouter } from "next/router";
import { SuperflowsButton } from "superflows-chatui";
import { Database } from "../lib/database.types";

const navigation = [
  { name: "Playground", href: "/" },
  { name: "Actions", href: "/actions" },
  { name: "Project", href: "/project" },
  { name: "API", href: "/api-settings" },
  { name: "Usage", href: "/usage" },
  // { name: "Evaluation (coming soon)", href: "/team" },
];

export function Navbar(props: { current: string }) {
  const [warningOpen, setWarningOpen] = useState<boolean>(false);
  const supabase = useSupabaseClient<Database>();
  const { refreshProfile } = useProfile();
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
      <div className="fixed top-0 inset-x-0 border-b border-gray-700 z-10">
        <Disclosure as="nav" className="bg-gray-800">
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between  sm:px-0">
              <div className="flex items-center">
                <a
                  className="text-base sm:text-lg md:text-xl text-white font-medium"
                  href={"/"}
                >
                  Superflows
                </a>
                <div className="ml-6 md:ml-14 flex items-baseline gap-x-1 sm:gap-x-2 md:gap-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        item.name === props.current
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white",
                        "rounded-md px-2 md:px-3 py-2 text-xs sm:text-sm font-medium"
                      )}
                      aria-current={
                        item.name === props.current ? "page" : undefined
                      }
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="gap-x-10 flex pl-96 z-1">
                <SuperflowsButton
                  superflowsApiKey={process.env.NEXT_PUBLIC_SUPERFLOWS_API_KEY!}
                  AIname="Superflows"
                  buttonStyling="w-8 h-8 text-gray-400 hover:text-gray-200"
                  styling={{
                    brandColor: "rgb(17 24 39)",
                    sidebarHeaderTextColor: "light",
                  }}
                  hostname={process.env.NEXT_PUBLIC_SUPERFLOWS_HOST_NAME!}
                  testMode={true}
                  devMode={true}
                />
                <div className="ml-4 flex place-items-center justify-center gap-x-1.5 md:gap-x-4 md:ml-6">
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
                        href: "https://github.com/Superflows-AI/superflows",
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
          </div>
        </Disclosure>
      </div>
    </>
  );
}
