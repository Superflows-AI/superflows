import {
  DocumentArrowUpIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Action, ActionGroupJoinActions } from "../../lib/types";
import { classNames } from "../../lib/utils";
import WarningModal from "../warningModal";
import EditActionModal from "./editActionModal";
import UploadModal from "./uploadModal";
import { Database } from "../../lib/database.types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import FlyoutMenu from "../flyoutMenu";
import Checkbox from "../checkbox";

function ActionsSection(props: {
  actionGroupJoinActions: ActionGroupJoinActions;
}) {
  const supabase = useSupabaseClient();
  const [editActionIndex, setEditActionIndex] = React.useState<number | null>(
    null
  );
  const [deleteActionIndex, setDeleteActionIndex] = React.useState<
    number | null
  >(null);

  const [actions, setActions] = React.useState<
    Database["public"]["Tables"]["actions"]["Row"][]
  >(props.actionGroupJoinActions.actions);

  useEffect(() => {
    setActions(props.actionGroupJoinActions.actions);
  }, [props.actionGroupJoinActions.actions]);

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
          setAction={(
            newAction: Database["public"]["Tables"]["actions"]["Row"]
          ) => {
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
            className={classNames(
              "group col-span-1 rounded-lg bg-gray-900 border cursor-pointer",
              action.active
                ? "border-purple-500 shadow shadow-purple-800/60 hover:shadow-md hover:shadow-purple-800/60"
                : "opacity-60 border-gray-700 hover:border-purple-500 hover:shadow-md hover:shadow-purple-800/40"
            )}
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
                className="invisible group-hover:visible absolute top-3 right-3 rounded-md border-0 bg-gray-900 p-1 text-gray-300 hover:bg-gray-800 hover:text-gray-200 outline-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteActionIndex(index);
                }}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
                <FlyoutMenu items={[{
                    name: "Edit",
                    onClick: () => {
                        setEditActionIndex(index);
                    },
                    }, {
                    name: "Delete",
                    onClick: () => {
                        setDeleteActionIndex(index);
                    },
                    }]} />
            </div>
          </li>
        ))}
        <li
          onClick={async () => {
            const exampleLen = actions.length;
            const resp = await supabase
              .from("actions")
              .insert({
                action_group: props.actionGroupJoinActions.id,
                name: "",
                description: "",
              })
              .select();
            if (resp.error) throw resp.error;
            if (resp.data.length !== 1)
              throw new Error("Expected 1 row to be inserted");
            setActions([...actions, resp.data[0]]);
            setEditActionIndex(exampleLen);
          }}
          className=" hover:bg-gray-600 rounded-lg cursor-pointer flex flex-col justify-center items-center py-2.5"
        >
          <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md bg-gray-500 text-white">
            <PlusIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-1 text-sm select-none font-medium text-gray-200">
            Add new
          </div>
        </li>
      </ul>
    </>
  );
}

export default function PageActionsSection(props: {
  pageActions: ActionGroupJoinActions[];
  setActions: Dispatch<SetStateAction<ActionGroupJoinActions[]>>;
  loadActions: () => Promise<void>;
}) {
  const supabase = useSupabaseClient();
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <UploadModal
        open={open}
        setOpen={setOpen}
        loadActions={props.loadActions}
      />
      <div className="mt-5 mx-5">
        <div className="flex w-full place-items-center justify-end">
          <button
            className="flex flex-row place-items-center gap-x-2 bg-gray-900 text-white font-bold py-2 px-4 rounded hover:bg-gray-950 focus:ring-2"
            onClick={() => setOpen(true)}
          >
            <DocumentArrowUpIcon className="text-gray-200 w-5 h-5" /> Upload
          </button>
        </div>
        {props.pageActions.map((pageAction, index) => (
          <div
            key={index}
            className="relative shadow-2xl px-6 py-4 my-5 border border-gray-600 rounded-lg"
            id={pageAction.name}
          >
            <h2
              className={classNames(
                "font-bold text-2xl",
                pageAction.actions.some((a) => a.active)
                  ? "text-gray-200"
                  : "text-gray-600"
              )}
            >
              {pageAction.name}
            </h2>
            <div className="absolute top-3 right-8 flex flex-row gap-x-3 place-items-center">
              <Checkbox
                checked={pageAction.actions.some((a) => a.active)}
                onChange={async (e) => {
                  console.log(e.target.checked);
                  props.setActions((actions) => {
                    const newActions = [...actions];
                    newActions[index].actions = newActions[index].actions.map(
                      (a) => ({
                        ...a,
                        active: e.target.checked,
                      })
                    );
                    return newActions;
                  });
                  const res = await supabase
                    .from("actions")
                    .update({ active: e.target.checked })
                    .eq("action_group", pageAction.id)
                    .select();
                  if (res.error) throw res.error;
                  if (res.data === null || res.data.length === 0)
                    throw new Error("Expected >0 rows to be updated");
                }}
                label={"Enabled"}
              />
              {/*<FlyoutMenu items={[{*/}
              {/*  name: "Disable",*/}
              {/*  onClick: async () => {*/}
              {/*      await supabase.from("")*/}
              {/*  }*/}
              {/*}]}/>*/}
            </div>
            <ActionsSection actionGroupJoinActions={pageAction} />
          </div>
        ))}
      </div>
    </>
  );
}
