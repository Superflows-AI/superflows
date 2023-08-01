import Modal from "../modal";
import { Action } from "../../lib/types";
import { Dialog, Switch } from "@headlessui/react";
import { Dashboard as UppyDashboard } from "@uppy/react";
import { LoadingSpinner } from "../loadingspinner";
import React, { useState } from "react";
import getMessages, { getActionDescriptions } from "../../lib/prompts/chatBot";
import { useProfile } from "../contextManagers/profile";
import Toggle from "../toggle";

const items = [
  {
    name: "System",
    description: (
      <>
        Below is the full &apos;system&apos; prompt (this contains the actions
        description). This is passed to the AI to describe your organization and
        what actions the AI has available to it.
        <br />
        <br />
        If the text is very long, it may help to disable some actions.
      </>
    ),
  },
  {
    name: "Actions",
    description: (
      <>
        Below is the description of the actions that is passed to the AI. Use
        this to debug issues associated with poor performance.
        <br />
        <br />
        <b>Hint:</b> Think of the AI like a person. If given the text below,
        would you expect someone to quickly be able to decide which action to
        take when given your query?
        <br />
        <br />
        If the text is very long, it may help to disable some actions.
      </>
    ),
  },
];

export default function ViewSystemPromptModal(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
  actions: Action[];
}) {
  const { profile } = useProfile();
  const [viewSystemPrompt, setViewSystemPrompt] = useState<boolean>(false);

  return (
    <Modal open={props.open} setOpen={props.setOpen} classNames="max-w-7xl">
      <div className="relative mt-3 text-center sm:mt-5">
        <Dialog.Title
          as="h3"
          className="text-2xl font-semibold leading-6 text-gray-100 flex flex-row gap-x-2 justify-center place-items-center"
        >
          {viewSystemPrompt ? "System Prompt" : "Actions Description"}
        </Dialog.Title>

        <div className="flex flex-row justify-center">
          <p className="mt-4 text-gray-300 whitespace-pre-wrap text-center max-w-2xl">
            {viewSystemPrompt ? items[0].description : items[1].description}
          </p>
        </div>
        <div className="absolute top-2 left-3 flex flex-row gap-x-3 text-sm place-items-center text-gray-400">
          Actions description
          <Toggle
            enabled={viewSystemPrompt}
            setEnabled={setViewSystemPrompt}
            size={"sm"}
            sr={"View System Prompt"}
          />
          System prompt
        </div>
        <p className="mt-4 text-gray-200 bg-gray-700 rounded-md px-4 py-3 whitespace-pre-wrap text-left">
          {viewSystemPrompt
            ? addTabsToVariables(
                getMessages(
                  [],
                  props.actions,
                  "<USER DESCRIPTION GOES HERE>",
                  {
                    name: profile?.organizations?.name ?? "<ORG NAME>",
                    description:
                      profile?.organizations?.description ??
                      "<ORG DESCRIPTION>",
                  },
                  "English"
                )[0].content
              )
            : addTabsToVariables(getActionDescriptions(props.actions))}
        </p>
      </div>
      <div className="px-6 py-4 flex place-items-center justify-center"></div>
    </Modal>
  );
}

function addTabsToVariables(str: string): string {
  /** This is purely for human readability sake **/
  return str.replace(/(\n)(\t*- )/g, "$1\t$2");
}
