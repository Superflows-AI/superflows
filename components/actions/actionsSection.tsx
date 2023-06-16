import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import React, { Dispatch, SetStateAction } from "react";
import { Action, PageAction } from "../../lib/types";
import { classNames } from "../../lib/utils";
import WarningModal from "../warningModal";
import EditActionModal from "./editActionModal";

function ActionsSection(props: { actions: Action[] }) {
  const [editActionIndex, setEditActionIndex] = React.useState<number | null>(
    null
  );
  const [deleteActionIndex, setDeleteActionIndex] = React.useState<
    number | null
  >(null);

  const [actions, setActions] = React.useState<Action[]>(props.actions);
  return (
    <>
      <WarningModal
        title={
          deleteActionIndex !== null
            ? `Delete reply option: "${actions[deleteActionIndex!].name}"?`
            : ""
        }
        description={
          "Are you sure you want to delete this reply option? Once you delete it you can't get it back. There's no undo button."
        }
        action={() => {
          let examplesCopy = [...actions];
          examplesCopy.splice(deleteActionIndex!, 1);
          setActions(examplesCopy);
          setDeleteActionIndex(null);
        }}
        open={deleteActionIndex !== null}
        setOpen={(open: boolean) => {
          if (!open) setDeleteActionIndex(null);
        }}
      />
      {editActionIndex !== null && (
        <EditActionModal
          action={actions[editActionIndex]}
          setAction={(newAction: Action) => {
            actions[editActionIndex] = newAction;
            setActions(actions);
            setEditActionIndex(null);
          }}
          close={() => {
            if (
              actions[editActionIndex].name === "" &&
              actions.length === editActionIndex + 1
            ) {
              setActions(actions.slice(0, -1));
            }
            setEditActionIndex(null);
          }}
        />
      )}
      <div className="flex flex-row place-items-center gap-x-4 mt-2"></div>
      <ul
        role="list"
        className={classNames(
          "relative mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 rounded-md"
        )}
      >
        {actions.map((action, index) => (
          <li
            key={index}
            className="group col-span-1 rounded-lg bg-gray-900 border border-indigo-500 shadow cursor-pointer hover:shadow-md"
          >
            <div
              onClick={() => {
                setEditActionIndex(index);
              }}
              className="relative flex w-full items-center justify-between space-x-6 p-6"
            >
              <div className="flex-1">
                <h3 className="font-medium mr-8 whitespace-wrap text-gray-100">
                  {action.name}
                </h3>
                <p className="mt-1 truncate max-h-20 text-sm text-gray-500 whitespace-pre-line">
                  {action.description}
                </p>
              </div>
              <button
                type="button"
                className="invisible group-hover:visible absolute top-3 right-3 rounded-full border-0 bg-gray-900 p-1 text-gray-300 hover:bg-gray-800 hover:text-gray-200 outline-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteActionIndex(index);
                }}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </li>
        ))}
        <li
          onClick={() => {
            const exampleLen = actions.length;
            setActions([
              ...actions,
              {
                name: "",
                description: "",
                parameters: { type: "none", properties: {} },
                required: [],
              },
            ]);
            setEditActionIndex(exampleLen);
          }}
          className=" hover:bg-gray-600 rounded-lg cursor-pointer flex flex-col justify-center items-center py-6"
        >
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-md bg-gray-500 text-white sm:h-10 sm:w-10">
            <PlusIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-2 text-sm select-none font-medium text-gray-100">
            Add new
          </div>
        </li>
      </ul>
    </>
  );
}

export default function PageActionsSection(props: {
  pageActions: PageAction[];
  setActions: Dispatch<SetStateAction<PageAction[]>>;
}) {
  return (
    <div className="mt-5">
      {props.pageActions.map((pageAction, index) => (
        <div className="shadow-2xl px-6 py-4 m-5 border border-gray-600 rounded-lg" key={index}>
          <h2 className="text-white font-bold text-2xl">
            {pageAction.pageName}
          </h2>
          <ActionsSection actions={pageAction.actions} />
        </div>
      ))}
    </div>
  );
}
