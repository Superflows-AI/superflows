import React, { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import classNames from "classnames";
import Flyout from "../Flyout";

export type Item = (
  | {
      onClick: () => void;
    }
  | {
      href: string;
    }
) & {
  name: string;
  Icon?: React.ReactNode;
};

export default function FlyoutMenu(props: {
  items: Item[];
  getClassName?: (open: boolean) => string;
  buttonClassName?: string;
  Icon?: React.ReactNode;
  popoverClassName?: string;
  title?: string;
}) {
  return (
    <Popover className={classNames("relative")}>
      {({ open }) => (
        <div className={props.getClassName ? props.getClassName(open) : ""}>
          <Popover.Button className={props.buttonClassName ?? ""}>
            {props.Icon ?? (
              <EllipsisHorizontalIcon
                className="h-9 w-9 p-1"
                aria-hidden="true"
              />
            )}
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
              <div
                className={classNames(
                  "shrink rounded-xl bg-white py-3 px-1 text-sm font-semibold leading-6 text-gray-900 shadow-lg ring-1 ring-gray-900/5",
                  props.popoverClassName ?? ""
                )}
              >
                {props.title && (
                  <h1 className="text-lg w-full text-center pb-1.5 pt-1 border-b font-base border-gray-300">
                    {props.title}
                  </h1>
                )}
                {props.items.map((item) => {
                  if ("onClick" in item)
                    return (
                      <button
                        key={item.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          item.onClick();
                        }}
                        className="p-2 hover:bg-gray-200 w-full text-left px-3 rounded flex flex-row gap-x-2 font-normal"
                      >
                        {item.Icon ?? ""}
                        {item.name}
                      </button>
                    );
                  else
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        className="p-2 hover:bg-gray-200 w-full text-left px-3 rounded flex flex-row gap-x-2 font-normal"
                      >
                        {item.Icon ?? ""}
                        {item.name}
                      </a>
                    );
                })}
              </div>
            </Popover.Panel>
          </Transition>
        </div>
      )}
    </Popover>
  );
}
