import React, { Fragment, useEffect } from "react";
import { Listbox, Transition, Combobox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { classNames } from "../lib/utils";

export interface ComboboxOption {
  id: string | null;
  name: string;
  icon?: React.ReactNode;
  description?: string;
}

export default function ComboBox(props: {
  title?: string;
  options: ComboboxOption[];
  selected: ComboboxOption;
  setSelected: (selected: ComboboxOption) => void;
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

  const [query, setQuery] = React.useState("");

  const [filteredItems, setFilteredItems] = React.useState(props.options);
  useEffect(() => {
    setFilteredItems(
      query === ""
        ? props.options
        : props.options.filter((item) => {
            return item.name.toLowerCase().includes(query.toLowerCase());
          }),
    );
  }, [query]);

  return (
    <Combobox as={"div"} value={props.selected} onChange={props.setSelected}>
      {({ open }) => (
        <>
          {props.title && (
            <Combobox.Label
              className={classNames(
                "block font-medium leading-6",
                theme === "light" ? "text-gray-700" : "text-gray-200",
                size === "small" ? "text-sm" : size === "base" && "text-base",
              )}
            >
              {props.title}
            </Combobox.Label>
          )}
          <div className="relative flex-1">
            <Combobox.Button
              className={classNames(
                "w-full focus:outline-none focus:ring-0 focus:border-0",
              )}
            >
              <Combobox.Input
                className={classNames(
                  "relative border border-gray-300 w-full rounded-md py-1.5 pl-3 pr-10 text-left shadow-sm ring-0 ring-inset focus:outline-none focus:ring-2 focus:ring-purple-600 sm:leading-6 focus:border-transparent",
                  theme === "light"
                    ? "bg-gray-50 text-gray-900 ring-purple-300"
                    : props.selected === null
                    ? "bg-gray-600 text-gray-400 ring-gray-300"
                    : "bg-gray-700 text-gray-300 ring-gray-400",
                  size === "small"
                    ? "text-sm py-1.5"
                    : size === "base" && "text-base py-[0.6875rem]",
                )}
                onChange={(event) => {
                  props.setSelected({
                    id: event.target.value,
                    name: event.target.value,
                  });
                  setQuery(event.target.value);
                }}
                displayValue={(item: ComboboxOption) => item.name}
              />
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Combobox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Combobox.Options
                className={classNames(
                  "absolute z-10 mt-1 max-h-48 w-full py-1 overflow-auto rounded-md bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
                  size === "small" ? "text-sm" : size === "base" && "text-base",
                  filteredItems.length > 0 ? "py-1" : "",
                )}
              >
                {filteredItems
                  .filter((o) => o.id || props.includeNull)
                  .map((option, idx) => (
                    <Combobox.Option
                      key={idx}
                      className={({ active }) =>
                        classNames(
                          active ? "bg-purple-300 text-white" : "text-gray-50",
                          "relative cursor-default select-none py-2 pl-8 pr-4",
                        )
                      }
                      value={option}
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

                          {selected && (
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
                          )}
                        </>
                      )}
                    </Combobox.Option>
                  ))}
                {query.length > 0 && (
                  <Combobox.Option
                    value={{ id: query, name: query }}
                    className={({ active }) =>
                      classNames(
                        active ? "bg-purple-300 text-white" : "text-gray-50",
                        "relative cursor-default select-none py-2 pl-8 pr-4",
                      )
                    }
                  >
                    {query}
                  </Combobox.Option>
                )}
              </Combobox.Options>
            </Transition>
          </div>
        </>
      )}
    </Combobox>
  );
}
