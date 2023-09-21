import React, { Fragment, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { classNames } from "../lib/utils";

export default function WarningModal(props: {
  title: string;
  description: string;
  action: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  actionName?: string;
  actionColour?: string;
}) {
  const deleteButtonRef = useRef(null);

  // This is so that the title doesn't disappear when the modal is closed
  const [localTitle, setLocalTitle] = React.useState(props.title);
  useEffect(() => {
    if (props.title !== "") setLocalTitle(props.title);
    else setTimeout(() => setLocalTitle(props.title), 500);
  }, [props.title]);

  return (
    <Transition.Root show={props.open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        initialFocus={deleteButtonRef}
        onClose={props.setOpen}
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div
                    className={classNames(
                      "mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10",
                      props.actionColour === "purple"
                        ? "bg-purple-100"
                        : "bg-red-100",
                    )}
                  >
                    <ExclamationTriangleIcon
                      className={classNames(
                        "h-6 w-6",
                        props.actionColour === "purple"
                          ? "text-purple-600"
                          : "text-red-600",
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {localTitle}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {props.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className={classNames(
                      "inline-flex w-full justify-center rounded-md border border-transparent focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2",
                      props.actionColour === "purple"
                        ? "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500"
                        : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
                    )}
                    onClick={() => {
                      props.setOpen(false);
                      props.action();
                    }}
                  >
                    {props.actionName ? props.actionName : "Delete"}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={() => props.setOpen(false)}
                    ref={deleteButtonRef}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
