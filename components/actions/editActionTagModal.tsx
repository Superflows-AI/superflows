import { Dialog } from "@headlessui/react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import React, { useRef } from "react";
import { classNames } from "../../lib/utils";
import FloatingLabelInput from "../floatingLabelInput";
import Modal from "../modal";
import { ActionTagJoin } from "../../lib/types";

export default function EditActionGroupModal(props: {
  actionTag: ActionTagJoin;
  close: () => void;
  setActionTag: (actionGroup: ActionTagJoin) => void;
}) {
  const saveRef = useRef(null);
  const [invalid, setInvalid] = React.useState<boolean | null>(null);
  const [localActionGroup, setLocalActionGroup] = React.useState<ActionTagJoin>(
    props.actionTag,
  );

  return (
    <Modal
      open={!!props.actionTag}
      setOpen={props.close}
      classNames={"max-w-xl"}
    >
      <div className="flex flex-row justify-between">
        <div className="flex flex-row place-items-center gap-x-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
            <PencilSquareIcon
              className="h-6 w-6 text-sky-600"
              aria-hidden="true"
            />
          </div>
          <div>
            <Dialog.Title as="h3" className="text-xl leading-6 text-gray-100">
              Edit Action Group
            </Dialog.Title>
            <p className="mt-1 text-sm text-gray-500">
              These are called <i>tags</i> in OpenAPI terminology.
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 mb-4">
        {localActionGroup.name.length > 30 && (
          <div
            className={classNames(
              "absolute top-4 text-xs -right-10 z-10",
              localActionGroup.name.length === 40
                ? "text-red-500"
                : "text-gray-500",
            )}
          >
            {localActionGroup.name.length}/40
          </div>
        )}
        <FloatingLabelInput
          className={classNames(
            "px-4 text-gray-900 border-gray-200 border focus:border-sky-500 focus:ring-sky-500 focus:ring-1 ",
            invalid && localActionGroup.name === ""
              ? "ring-2 ring-offset-1 ring-red-500"
              : "",
          )}
          floatingClassName={
            invalid && localActionGroup.name === ""
              ? "text-red-500 peer-focus:text-gray-400"
              : ""
          }
          label={"Name"}
          value={localActionGroup.name ?? ""}
          onChange={(e) => {
            setLocalActionGroup({
              ...localActionGroup,
              name: e.target.value.slice(0, 40),
            });
          }}
        />
        {invalid && localActionGroup.name === "" && (
          <div className="text-red-600 w-full text-center">
            Please enter a name.
          </div>
        )}
      </div>
      <div className="w-full relative mt-3">
        <textarea
          className="w-full bg-gray-50 peer resize-none overflow-y-clip text-gray-800 pl-4 pr-10 pt-4 pb-2 rounded border-gray-200 focus:border-sky-500 focus:ring-sky-500 whitespace-pre-line outline-0"
          value={
            localActionGroup.description ? localActionGroup.description : ""
          }
          onChange={(e) => {
            setLocalActionGroup({
              ...localActionGroup,
              description: e.target.value.slice(0, 300),
            });
          }}
          rows={Math.max(
            Math.ceil(localActionGroup.description.length / 90),
            2,
          )}
        />
        {localActionGroup.description &&
          localActionGroup.description.length > 250 && (
            <div
              className={classNames(
                "absolute bottom-2 text-xs right-3 z-10",
                localActionGroup.description.length >= 290
                  ? "text-red-500"
                  : "text-gray-500",
              )}
            >
              {localActionGroup.description.length}/300
            </div>
          )}
        {/* TODO: Can add a tooltip here */}
        {/*<div className="absolute top-3 right-3">*/}
        {/*  <QuestionMarkCircleIcon className="peer h-6 w-6 text-gray-400 hover:text-gray-500 transition rounded-full" />*/}
        {/*  <div className={classNames("right-0 -top-36 w-64 popup")}>*/}
        {/*    Give instructions & information to the AI writing the reply.*/}
        {/*    <br />*/}
        {/*    <br />*/}
        {/*    E.g. &ldquo;Book a call, my calendar link is:*/}
        {/*    https://calendly.com/...&rdquo;*/}
        {/*  </div>*/}
        {/*</div>*/}
        <div
          className={classNames(
            "absolute pointer-events-none left-4 top-3 peer-focus:scale-75 peer-focus:-translate-y-5/8 text-gray-400 select-none transition duration-300",
            localActionGroup.description
              ? "-translate-x-1/8 -translate-y-5/8 scale-75"
              : "peer-focus:-translate-x-1/8",
          )}
        >
          Description
        </div>
      </div>

      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          ref={saveRef}
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-sky-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:order-3 focus:ring-offset-2 sm:text-sm"
          onClick={(event) => {
            event.preventDefault();
            if (localActionGroup.name !== "") {
              props.setActionTag(localActionGroup);
              props.close();
            } else setInvalid(true);
          }}
        >
          Save
        </button>
        <button
          className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-500 px-4 py-2 text-base font-medium text-gray-200 shadow-sm bg-gray-500 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 sm:mt-0 sm:text-sm"
          onClick={props.close}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
