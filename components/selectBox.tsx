import { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { classNames } from "../lib/utils";

export default function SelectBox(props: { title: string, options: string[], theme: "light" | "dark", selected: string, setSelected: (selected: string) => void }) {

  return (
    <Listbox value={props.selected} onChange={props.setSelected}>
      {({ open }) => (
        <>
          {props.title && <Listbox.Label className={classNames(
              "block text-sm font-medium leading-6",
                props.theme === "light" ? "text-gray-700" : "text-gray-200"
          )}>
            {props.title}
          </Listbox.Label>}
          <div className="relative flex-1">
            <Listbox.Button className={classNames(
                "relative w-full cursor-default rounded-md py-1.5 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6",
                props.theme === "light" ? "bg-gray-50 text-gray-900 ring-indigo-300" : "bg-gray-700 text-gray-50 ring-gray-300"
            )}>
              <span className="block truncate">{props.selected}</span>
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
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {props.options.map((option, idx) => (
                  <Listbox.Option
                    key={idx}
                    className={({ active }) =>
                      classNames(
                        active ? "bg-indigo-300 text-white" : "text-gray-50",
                        "relative cursor-default select-none py-2 pl-8 pr-4"
                      )
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={classNames(
                            selected ? "font-semibold" : "font-normal",
                            "block truncate"
                          )}
                        >
                          {option}
                        </span>

                        {selected ? (
                          <span
                            className={classNames(
                              active ? "text-white" : "text-indigo-300",
                              "absolute inset-y-0 left-0 flex items-center pl-1.5"
                            )}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
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
