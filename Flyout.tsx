import { Popover, Transition } from "@headlessui/react";
import React, { Fragment } from "react";

export default function Flyout(props: {
  children: React.ReactNode;
  Button?: React.ReactNode;
}) {
  return (
    <Popover className={"relative"}>
      {({ open }) => (
        <div>
          <Popover.Button className="focus:outline-0 focus:ring-0">
            {props.Button}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-1/2 z-10 flex w-screen max-w-min -translate-x-1/2 px-4">
              {props.children}
            </Popover.Panel>
          </Transition>
        </div>
      )}
    </Popover>
  );
}
