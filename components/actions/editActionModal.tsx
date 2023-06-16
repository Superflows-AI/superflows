import { Dialog, Menu, Transition } from "@headlessui/react";
import {
  ArchiveBoxIcon,
  ArrowRightCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  HeartIcon,
  TrashIcon,
  UserPlusIcon,
  GlobeAltIcon,
  CodeBracketSquareIcon,
  CursorArrowRippleIcon,
} from "@heroicons/react/20/solid";
import {
  PencilSquareIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";
import React, { Fragment, useRef, useState } from "react";
import { Action } from "../../lib/types";
import { classNames } from "../../lib/utils";
import FloatingLabelInput from "../floatingLabelInput";

export default function EditActionModal(props: {
  action: Action;
  close: () => void;
  setAction: (action: Action) => void;
}) {
  const saveRef = useRef(null);
  const [invalid, setInvalid] = React.useState<boolean | null>(null);
  const [localAction, setLocalAction] = React.useState<Action>(props.action);

  return (
    <Transition.Root show={!!props.action} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={props.close}
        initialFocus={saveRef}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform  rounded-lg bg-white  pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl lg:max-w-2xl sm:p-6">
                <button
                  onClick={props.close}
                  className="absolute rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-600 top-2 right-2 p-1"
                >
                  <XMarkIcon className="w-6 h-6 " />
                </button>

                <form>
                  <div className="flex flex-row justify-between">
                    <div className="flex flex-row place-items-center gap-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                        <PencilSquareIcon
                          className="h-6 w-6 text-sky-600"
                          aria-hidden="true"
                        />
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg leading-6 text-gray-900"
                        pb-
                        pb-11
                      >
                        Edit Action
                      </Dialog.Title>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 ">
                    <div className="my-4 col-span-3">
                      <div className="max-w-88 relative">
                        {localAction.name.length > 30 && (
                          <div
                            className={classNames(
                              "absolute top-4 text-xs -right-10 z-10",
                              localAction.name.length === 40
                                ? "text-red-500"
                                : "text-gray-500"
                            )}
                          >
                            {localAction.name.length}/40
                          </div>
                        )}
                        <div className="absolute top-3 right-3 z-10">
                          <QuestionMarkCircleIcon className="peer h-6 w-6 text-gray-400 hover:text-gray-500 transition rounded-full hover:bg-gray-50" />
                          <div
                            className={classNames("-top-8 left-12 w-64 popup")}
                          >
                            The AI uses this to write this 1-click reply - be
                            descriptive. E.g.{" "}
                            <img src="/actionNames.png" className="rounded" />
                          </div>
                        </div>
                        <FloatingLabelInput
                          className={classNames(
                            "px-4 text-gray-900 border-gray-200 border focus:border-sky-500 focus:ring-sky-500 focus:ring-1 border ",
                            invalid && localAction.name === ""
                              ? "ring-2 ring-offset-1 ring-red-500"
                              : ""
                          )}
                          floatingClassName={
                            invalid && localAction.name === ""
                              ? "text-red-500 peer-focus:text-gray-400"
                              : ""
                          }
                          label={"Name"}
                          value={localAction.name ?? ""}
                          onChange={(e) => {
                            setLocalAction({
                              ...localAction,
                              name: e.target.value.slice(0, 40),
                            });
                          }}
                        />
                        {invalid && localAction.name === "" && (
                          <div className="text-red-600 w-full text-center">
                            Please enter a name.
                          </div>
                        )}
                      </div>
                    </div>
                    <Dropdown />
                  </div>
                  <div className="w-full relative mt-3">
                    <div className="min-w-full text-white min-h-10 whitespace-pre-line outline-0 px-4 pt-4 pb-2 select-none">
                      {localAction.description
                        ? localAction.description
                        : "No additional information"}
                      <br />I
                    </div>
                    <textarea
                      className="peer absolute inset-0 resize-none overflow-y-clip text-gray-800 pl-4 pr-10 pt-4 pb-2 rounded bg-transparent border-gray-200 focus:border-sky-500 focus:ring-sky-500 whitespace-pre-line outline-0"
                      value={
                        localAction.description ? localAction.description : ""
                      }
                      onChange={(e) => {
                        setLocalAction({
                          ...localAction,
                          description: e.target.value.slice(0, 1000),
                        });
                      }}
                    />
                    {localAction.description &&
                      localAction.description.length > 950 && (
                        <div
                          className={classNames(
                            "absolute bottom-2 text-xs right-3 z-10",
                            localAction.description.length >= 990
                              ? "text-red-500"
                              : "text-gray-500"
                          )}
                        >
                          {localAction.description.length}/1000
                        </div>
                      )}
                    <div className="absolute top-3 right-3">
                      <QuestionMarkCircleIcon className="peer h-6 w-6 text-gray-400 hover:text-gray-500 transition rounded-full" />
                      <div className={classNames("right-0 -top-36 w-64 popup")}>
                        Give instructions & information to the AI writing the
                        reply.
                        <br />
                        <br />
                        E.g. &ldquo;Book a call, my calendar link is:
                        https://calendly.com/...&rdquo;
                      </div>
                    </div>
                    <div
                      className={classNames(
                        "absolute pointer-events-none left-4 top-3 peer-focus:scale-75 peer-focus:-translate-y-5/8 text-gray-400 select-none transition duration-300",
                        localAction.description
                          ? "-translate-x-1/8 -translate-y-5/8 scale-75"
                          : "peer-focus:-translate-x-1/8"
                      )}
                    >
                      Description
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      ref={saveRef}
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-sky-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:order-3 focus:ring-offset-2 sm:text-sm"
                      onClick={(event) => {
                        event.preventDefault();
                        if (localAction.name !== "") {
                          props.setAction(localAction);
                        } else setInvalid(true);
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 sm:mt-0 sm:text-sm"
                      onClick={props.close}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

function Dropdown() {
  const [actionType, setActionType] = useState("Action type");

  const handleMenuClick = (text: string) => {
    setActionType(text);
  };

  return (
    <Menu
      as="div"
      className="relative inline-block text-left pt-4 pb-1 col-span-2"
    >
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-sm bg-white px-3 py-2.5 text-md  text-gray-400  ring-1 ring-inset ring-gray-200 hover:bg-gray-50 ">
          {actionType}
          <ChevronDownIcon
            className="-mr-1 h-5 w-5 mt-1 text-gray-400 mt-0.5"
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
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <Menu.Item>
            {({ active }) => (
              <a
                href="#"
                className={classNames(
                  active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                  "group flex items-center px-4 py-2 text-sm"
                )}
                onClick={() => handleMenuClick("HTTP request")}
              >
                <GlobeAltIcon
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  aria-hidden="true"
                />
                HTTP request
              </a>
            )}
          </Menu.Item>

          <Menu.Item>
            {({ active }) => (
              <a
                href="#"
                className={classNames(
                  active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                  "group flex items-center px-4 py-2 text-sm"
                )}
                onClick={() => handleMenuClick("Trigger a function callback")}
              >
                <CodeBracketSquareIcon
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  aria-hidden="true"
                />
                Trigger a callback
              </a>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <a
                href="#"
                className={classNames(
                  active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                  "group flex items-center px-4 py-2 text-sm"
                )}
                onClick={() => handleMenuClick("Simulate a click")}
              >
                <CursorArrowRippleIcon
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  aria-hidden="true"
                />
                Simulate a click
              </a>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
