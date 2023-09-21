import React, { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { classNames } from "../lib/utils";

export interface SelectBoxOption {
  id: string | null;
  name: string;
  icon?: React.ReactNode;
  description?: string;
}

export default function SelectBox(props: {
  title?: string;
  options: SelectBoxOption[];
  selected: string | null;
  setSelected: (selected: string) => void;
  theme?: "light" | "dark";
  size?: "small" | "base";
  includeNull?: boolean;
}) {
  /**
   * selected: the id of the selected option
   * setSelected: a function that takes the id of the selected option
   */
  // Defaults
  const theme = props.theme ?? "light";
  const size = props.size ?? "small";

  return (
    <Listbox value={props.selected} onChange={props.setSelected}>
      {({ open }) => (
        <>
          {props.title && (
            <Listbox.Label
              className={classNames(
                "block font-medium leading-6",
                theme === "light" ? "text-gray-700" : "text-gray-200",
                size === "small" ? "text-sm" : size === "base" && "text-base",
              )}
            >
              {props.title}
            </Listbox.Label>
          )}
          <div className="relative flex-1">
            <Listbox.Button
              className={classNames(
                "relative w-full cursor-default rounded-md py-1.5 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-purple-600 sm:leading-6",
                theme === "light"
                  ? "bg-gray-50 text-gray-900 ring-purple-300"
                  : props.selected === null
                  ? "bg-gray-700 text-gray-400 ring-gray-300"
                  : "bg-gray-700 text-gray-50 ring-gray-300",
                size === "small"
                  ? "text-sm py-1.5"
                  : size === "base" && "text-base py-[0.6875rem]",
              )}
            >
              <div className="flex flex-row place-items-center gap-x-1">
                {props.options.find((o) => props.selected === o.id)?.icon}
                <span className="block truncate">
                  {props.options.find((o) => props.selected === o.id)?.name ??
                    "Select an option"}
                </span>
              </div>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options
                className={classNames(
                  "absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md bg-gray-700 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
                  size === "small" ? "text-sm" : size === "base" && "text-base",
                )}
              >
                {props.options
                  .filter((o) => o.id || props.includeNull)
                  .map((option, idx) => (
                    <Listbox.Option
                      key={idx}
                      className={({ active }) =>
                        classNames(
                          active ? "bg-purple-300 text-white" : "text-gray-50",
                          "relative cursor-default select-none py-2 pl-8 pr-4",
                        )
                      }
                      value={option.id}
                    >
                      {({ selected, active }) => (
                        <>
                          <div className="flex flex-row place-items-center gap-x-1">
                            {option.icon ?? ""}
                            <div className="flex flex-col">
                              <span
                                className={classNames(
                                  selected ? "font-semibold" : "font-normal",
                                  "block truncate",
                                )}
                              >
                                {option.name}
                              </span>
                              {option.description && (
                                <span
                                  className={classNames(
                                    active ? "text-gray-600" : "text-gray-300",
                                    "block text-xs truncate",
                                  )}
                                >
                                  {option.description}
                                </span>
                              )}
                            </div>
                          </div>

                          {selected ? (
                            <span
                              className={classNames(
                                active ? "text-white" : "text-purple-300",
                                "absolute inset-y-0 left-0 flex items-center pl-1.5",
                              )}
                            >
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
              </Listbox.Options>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  );
}
