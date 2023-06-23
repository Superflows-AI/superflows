import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import {
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import classNames from "classnames";

export interface Item {
  name: string;
  onClick: () => void;
}

export default function FlyoutMenu(props: {
  items: Item[];
  getClassName?: (open: boolean) => string;
}) {
  return (
    <Popover className={classNames("relative")}>
      {({ open }) => (
        <div className={props.getClassName ? props.getClassName(open) : ""}>
          <Popover.Button className="inline-flex items-center gap-x-1 text-sm font-semibold text-gray-100 hover:bg-gray-950 rounded-md transition">
            <EllipsisHorizontalIcon
              className="h-9 w-9 p-1"
              aria-hidden="true"
            />
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
              <div className="w-40 shrink rounded-xl bg-white py-4 px-1 text-sm font-semibold leading-6 text-gray-900 shadow-lg ring-1 ring-gray-900/5">
                {props.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                    }}
                    className="block p-2 hover:bg-gray-200 w-full text-left px-3 rounded"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </Popover.Panel>
          </Transition>
        </div>
      )}
    </Popover>
  );
}
