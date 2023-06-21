import React, { useEffect, useState } from "react";
import { Disclosure } from "@headlessui/react";
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { classNames } from "../lib/utils";
import Link from "next/link";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const navigation = [
  { name: "Playground", href: "/" },
  { name: "Actions", href: "/actions" },
  { name: "Evaluation", href: "/team" },
  { name: "Team", href: "/team" },
];

export function Navbar(props: { current: string }) {
  const [open, setOpen] = useState(false);
  const supabase = useSupabaseClient();

  return (
    <>
      <div className="w-full h-16" />
      <div className="fixed top-0 inset-x-0 border-b border-gray-700 z-10">
        <Disclosure as="nav" className="bg-gray-800">
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <button
              className={"fixed top-2 left-2 hover:bg-gray-700 rounded-md p-2"}
              onClick={() => setOpen(true)}
            >
              <SparklesIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
            <div className="">
              <div className="flex h-16 items-center justify-between px-4 sm:px-0">
                <div className="flex items-center">
                  <div className="ml-10 flex items-baseline space-x-4">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={classNames(
                          item.name === props.current
                            ? "bg-gray-900 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white",
                          "rounded-md px-3 py-2 text-sm font-medium"
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
                <div className="hidden md:block">
                  <div className="ml-4 flex items-center gap-x-4 md:ml-6">
                    <button
                      type="button"
                      className="rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                    >
                      <span className="sr-only">View notifications</span>
                      <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                      onClick={async () => {
                        await supabase.auth.signOut();
                      }}
                    >
                      <span className="sr-only">Sign out</span>
                      <ArrowRightOnRectangleIcon
                        className="h-6 w-6"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Disclosure>
      </div>
    </>
  );
}
