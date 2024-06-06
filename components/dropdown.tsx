import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import Checkbox from "./checkbox";

export interface SelectBoxWithDropdownOption {
  id: string | null;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function SelectBoxOptionDropdownWithCheckboxes(props: {
  title: string;
  items: SelectBoxWithDropdownOption[];
}) {
  return (
    <Menu as="div" className="relative inline-block text-left shrink-0">
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-gray-850 px-3 py-1.5 text-xs md:text-sm font-medium text-gray-300 shadow-sm ring-1 ring-inset ring-gray-600 hover:bg-gray-900">
          {props.title}
          <ChevronDownIcon
            className="-mr-1 w-4 h-4 md:w-5 md:h-5 text-gray-400"
            aria-hidden="true"
          />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          static
          className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-gray-850 shadow-lg ring-1 ring-black border border-gray-600 ring-opacity-5 focus:outline-none"
        >
          <div className="py-1 divide-y divide-gray-800">
            {props.items.map((item) => (
              <Menu.Item key={item.id}>
                <div
                  className="select-none cursor-pointer hover:bg-gray-900 hover:text-gray-50 text-gray-200 px-4 py-2 text-sm flex flex-row place-items-center gap-x-4"
                  onClick={(e) => {
                    e.preventDefault();
                    item.onChange(!item.checked);
                  }}
                >
                  <Checkbox
                    onChange={item.onChange}
                    checked={item.checked}
                    label={""}
                  />
                  {item.name}
                </div>
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
