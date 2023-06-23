import { DocumentArrowUpIcon, PlusIcon } from "@heroicons/react/24/outline";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Action, ActionGroup, ActionGroupJoinActions } from "../../lib/types";
import { classNames } from "../../lib/utils";
import WarningModal from "../warningModal";
import EditActionModal from "./editActionModal";
import UploadModal from "./uploadModal";
import { Database } from "../../lib/database.types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import FlyoutMenu from "../flyoutMenu";
import Checkbox from "../checkbox";
import { useProfile } from "../contextManagers/profile";
import EditActionGroupModal from "./editActionGroupModal";

export default function PageActionsSection(props: {
  actionGroups: ActionGroupJoinActions[];
  setActionGroups: Dispatch<
    SetStateAction<ActionGroupJoinActions[] | undefined>
  >;
  loadActions: () => Promise<void>;
}) {
  const supabase = useSupabaseClient();
  const { profile } = useProfile();
  const [open, setUploadModalOpen] = useState<boolean>(false);
  const [includeInactive, setIncludeInactive] = useState<boolean>(true);

  return (
    <>
      <UploadModal
        open={open}
        setOpen={setUploadModalOpen}
        loadActions={props.loadActions}
      />
      <div className="mt-5 mx-5 mb-20">
        <div className="flex w-full place-items-end justify-between gap-x-2">
          <Checkbox
            onChange={(checked) => {
              setIncludeInactive(checked);
            }}
            checked={includeInactive}
            label={"Show inactive"}
          />
          <div className="flex flex-row gap-x-2 place-items-center">
            {profile && (
              <button
                className="flex flex-row place-items-center gap-x-1 bg-green-900 text-white font-medium text-sm py-1.5 px-2 rounded hover:bg-green-800 focus:ring-2"
                onClick={async () => {
                  const res = await supabase
                    .from("action_groups")
                    .insert({
                      name: "New",
                      // description: "New",
                      org_id: profile.org_id,
                    })
                    .select("*");
                  if (res.error) throw res.error;
                  if (res.data === null) throw new Error("No data returned");
                  const newActionGroups = [
                    {
                      ...res.data[0],
                      actions: [],
                    },
                    ...props.actionGroups,
                  ];
                  props.setActionGroups(newActionGroups);
                }}
              >
                <PlusIcon className="text-gray-200 w-5 h-5" /> Add
              </button>
            )}
            <button
              className="flex flex-row place-items-center gap-x-2 bg-gray-900 text-white font-medium text-sm py-1.5 px-4 rounded hover:bg-gray-950 focus:ring-2"
              onClick={() => setUploadModalOpen(true)}
            >
              <DocumentArrowUpIcon className="text-gray-200 w-5 h-5" /> Upload
            </button>
          </div>
        </div>
        {props.actionGroups.length > 0 ? (
          props.actionGroups
            .filter((actionGroup) => {
              if (includeInactive) return true;
              return actionGroup.actions.some((action) => action.active);
            })
            .map((actionGroup: ActionGroupJoinActions) => (
              <ActionsSection
                key={actionGroup.id}
                actionGroupJoinActions={actionGroup}
                setActionGroup={(actionGroup: ActionGroupJoinActions) => {
                  const copy = [...props.actionGroups];
                  const agIndex = props.actionGroups.findIndex(
                    (ag) => ag.id === actionGroup.id
                  );
                  copy[agIndex] = actionGroup;
                  props.setActionGroups(copy);
                }}
                deleteActionGroup={async () => {
                  const copy = [...props.actionGroups];
                  const agIndex = props.actionGroups.findIndex(
                    (ag) => ag.id === actionGroup.id
                  );
                  copy.splice(agIndex, 1);
                  props.setActionGroups(copy);
                  const res = await supabase
                    .from("action_groups")
                    .delete()
                    .match({ id: actionGroup.id });
                  if (res.error) throw res.error;
                }}
              />
            ))
        ) : (
          <div className="mt-10 h-96 text-gray-400 text-center text-lg rounded-lg border border-gray-500 border-dashed bg-gray-850 flex flex-col justify-center place-items-center">
            <h2 className={"text-2xl text-gray-300 font-medium mb-4"}>
              You have no actions.
            </h2>
            <p>
              Add them manually or{" "}
              <button
                className="inline text-sky-500 hover:underline"
                onClick={() => setUploadModalOpen(true)}
              >
                upload an OpenAPI API specification.
              </button>
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function ActionsSection(props: {
  actionGroupJoinActions: ActionGroupJoinActions;
  setActionGroup: (actionGroup: ActionGroupJoinActions) => void;
  deleteActionGroup: () => void;
}) {
  const supabase = useSupabaseClient();

  const [editActionIndex, setEditActionIndex] = React.useState<number | null>(
    null
  );
  const [editActionGroup, setEditActionGroup] = React.useState<boolean>(false);
  const [deleteActionGroup, setDeleteActionGroup] =
    React.useState<boolean>(false);
  const [deleteActionIndex, setDeleteActionIndex] = React.useState<
    number | null
  >(null);
  const [actions, setActions] = React.useState<Action[]>(
    props.actionGroupJoinActions.actions
  );

  useEffect(() => {
    setActions(props.actionGroupJoinActions.actions);
  }, [props.actionGroupJoinActions.actions]);

  return (
    <>
      <WarningModal
        title={
          deleteActionIndex !== null
            ? `Delete action: "${actions[deleteActionIndex!].name}"?`
            : ""
        }
        description={
          "Are you sure you want to delete this action? Once you delete it you can't get it back. There's no undo button."
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
      <WarningModal
        title={`Delete action group and all its actions: "${props.actionGroupJoinActions.name}"?`}
        description={
          "Are you sure you want to delete this action group and all its actions? Once you delete it you can't get it back. There's no undo button."
        }
        action={props.deleteActionGroup}
        open={deleteActionGroup}
        setOpen={setDeleteActionGroup}
      />
      {editActionGroup && (
        <EditActionGroupModal
          actionGroup={props.actionGroupJoinActions}
          setActionGroup={async (actionGroup: ActionGroup) => {
            props.setActionGroup({
              ...props.actionGroupJoinActions,
              ...actionGroup,
            });
            const res = await supabase
              .from("action_groups")
              .update(actionGroup)
              .match({ id: actionGroup.id });
            if (res.error) throw res.error;
          }}
          close={() => setEditActionGroup(false)}
        />
      )}
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
      <div
        className="relative shadow-2xl px-6 py-4 my-5 border border-gray-600 rounded-lg"
        id={props.actionGroupJoinActions.name}
      >
        <div className="flex flex-col w-full">
          <div className="flex flex-row justify-between place-items-start">
            <div
              className={
                props.actionGroupJoinActions.actions.some((a) => a.active)
                  ? ""
                  : "opacity-60"
              }
            >
              {props.actionGroupJoinActions.actions.length > 0 && (
                <Checkbox
                  checked={props.actionGroupJoinActions.actions.some(
                    (a) => a.active
                  )}
                  onChange={async (checked: boolean) => {
                    const newActionGroup = { ...props.actionGroupJoinActions };
                    newActionGroup.actions = newActionGroup.actions.map(
                      (a) => ({
                        ...a,
                        active: checked,
                      })
                    );
                    props.setActionGroup(newActionGroup);
                    const res = await supabase
                      .from("actions")
                      .update({ active: checked })
                      .eq("action_group", props.actionGroupJoinActions.id)
                      .select();
                    if (res.error) throw res.error;
                    if (res.data === null || res.data.length === 0)
                      throw new Error(
                        "Expected >0 rows to be updated" +
                          JSON.stringify(res.data)
                      );
                  }}
                  label={"Active"}
                />
              )}
            </div>

            <FlyoutMenu
              items={[
                {
                  name: "Edit",
                  onClick: () => setEditActionGroup(true),
                },
                {
                  name: "Delete",
                  onClick: () => {
                    setDeleteActionGroup(true);
                  },
                },
              ]}
              getClassName={(open) => {
                if (open) return "";
                return !props.actionGroupJoinActions.actions.some(
                  (a) => a.active
                )
                  ? "opacity-60"
                  : "";
              }}
            />
          </div>
        </div>
        <h2
          className={classNames(
            "font-bold text-2xl w-60",
            props.actionGroupJoinActions.actions.some((a) => a.active)
              ? "text-gray-200"
              : "text-gray-600"
          )}
        >
          {props.actionGroupJoinActions.name}
        </h2>
        <p
          className={classNames(
            "mt-2",
            props.actionGroupJoinActions.actions.some((a) => a.active)
              ? "text-gray-300"
              : "text-gray-700"
          )}
        >
          {props.actionGroupJoinActions.description}
        </p>
        <ul
          role="list"
          className={classNames(
            "relative mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 rounded-md"
          )}
        >
          {actions.map((action, index) => (
            <li
              key={index}
              className={classNames(
                "group col-span-1 rounded-lg border cursor-pointer",
                action.active
                  ? "bg-gray-900 border-purple-500 shadow shadow-purple-800/60 hover:shadow-md hover:shadow-purple-800/60"
                  : "bg-gray-850 border-gray-700 hover:border-gray-400 hover:shadow-md hover:shadow-gray-300/20"
              )}
            >
              <div
                onClick={async () => {
                  // TODO: Old version - edit on click
                  // setEditActionIndex(index);
                  // TODO: New version - enable/disable on click
                  const newActionGroup = { ...props.actionGroupJoinActions };
                  newActionGroup.actions[index].active =
                    !newActionGroup.actions[index].active;
                  props.setActionGroup(newActionGroup);
                  const res = await supabase
                    .from("actions")
                    .update({ active: newActionGroup.actions[index].active })
                    .eq("id", action.id)
                    .select();
                  if (res.error) throw res.error;
                  if (res.data === null || res.data.length === 0)
                    throw new Error("Expected >0 rows to be updated");
                }}
                className="relative flex max-w-full w-full items-center justify-between space-x-6 p-6"
              >
                <div className="flex flex-col select-none max-w-[calc(100%-3.75rem)]">
                  <h3
                    className={classNames(
                      "font-medium whitespace-wrap break-words",
                      action.active ? "text-gray-100" : "text-gray-400"
                    )}
                  >
                    {action.name}
                  </h3>
                  <p className="mt-1 truncate max-h-20 text-sm text-gray-500 whitespace-pre-line">
                    {action.description}
                  </p>
                </div>
                {/*<button*/}
                {/*  type="button"*/}
                {/*  className="invisible group-hover:visible absolute top-3 right-3 rounded-md border-0 bg-gray-900 p-1 text-gray-300 hover:bg-gray-800 hover:text-gray-200 outline-0"*/}
                {/*  onClick={(e) => {*/}
                {/*    e.stopPropagation();*/}
                {/*    setDeleteActionIndex(index);*/}
                {/*  }}*/}
                {/*>*/}
                {/*  <TrashIcon className="w-5 h-5" />*/}
                {/*</button>*/}
                <FlyoutMenu
                  getClassName={(open: boolean) =>
                    open ? "visible" : "invisible group-hover:visible"
                  }
                  items={[
                    {
                      name: "Edit",
                      onClick: () => {
                        setEditActionIndex(index);
                      },
                    },
                    {
                      name: "Delete",
                      onClick: () => {
                        setDeleteActionIndex(index);
                      },
                    },
                  ]}
                />
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
      </div>
    </>
  );
}
