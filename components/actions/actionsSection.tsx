import {
  DocumentArrowUpIcon,
  EllipsisHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  SupabaseClient,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Database } from "../../lib/database.types";
import { Action, ActionTag, ActionTagJoinActions } from "../../lib/types";
import { classNames } from "../../lib/utils";
import Checkbox from "../checkbox";
import { useProfile } from "../contextManagers/profile";
import DropdownWithCheckboxes, {
  SelectBoxWithDropdownOption,
} from "../dropdown";
import FlyoutMenu from "../flyoutMenu";
import WarningModal from "../warningModal";
import EditActionModal from "./editActionModal";
import EditActionTagModal from "./editActionTagModal";
import UploadModal from "./uploadModal";
import { LoadingSpinner } from "../loadingspinner";
import { PRESETS } from "../../lib/consts";

export default function PageActionsSection(props: {
  actionTags: ActionTagJoinActions[];
  setActionTags: Dispatch<SetStateAction<ActionTagJoinActions[] | undefined>>;
  loadActions: () => Promise<void>;
}) {
  const supabase = useSupabaseClient<Database>();
  const { profile, refreshProfile } = useProfile();
  const [open, setUploadModalOpen] = useState<boolean>(false);
  const [showInactive, setShowInactive] = useState<boolean>(true);
  const [numActiveActions, setNumActiveActions] = useState<number>(0);
  const [deleteAllActionsModelOpen, setDeleteAllActionsModalOpen] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  useEffect(() => {
    setNumActiveActions(
      props.actionTags
        .map((tag) => tag.actions)
        .flat()
        .filter((action) => action.active).length
    );
  }, [props.actionTags]);

  if (isLoading)
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex place-items-center justify-center">
        <LoadingSpinner classes={"h-20 w-20 text-gray-500"} />
      </div>
    );
  return (
    <>
      {numActiveActions > 20 && (
        <div
          className="bg-yellow-200 border-l-4 border-yellow-500 text-yellow-700 p-4"
          role="alert"
        >
          <p className="font-bold">Warning</p>
          <p>
            {`${numActiveActions} actions are enabled. Superflows performs best
            with fewer than 20.`}
          </p>
        </div>
      )}
      <UploadModal
        open={open}
        setOpen={setUploadModalOpen}
        loadActions={props.loadActions}
      />
      <WarningModal
        title={`Delete all actions?`}
        description={
          "Are you sure you want to delete all actions? Once you delete them you can't get it back. There's no undo button."
        }
        action={async () => {
          props.setActionTags([]);
          const res = await supabase
            .from("action_tags")
            .delete()
            .match({ org_id: profile?.org_id });
          if (res.error) throw res.error;
        }}
        open={deleteAllActionsModelOpen}
        setOpen={setDeleteAllActionsModalOpen}
      />

      <div className="mt-5 mx-5 mb-20">
        <div className="flex w-full place-items-end justify-between gap-x-2">
          <div className="flex flex-row gap-x-6 place-items-center">
            <Checkbox
              onChange={(checked) => {
                setShowInactive(checked);
              }}
              checked={showInactive}
              label={"Show inactive"}
            />
            {props.actionTags.length > 0 && (
              <DropdownWithCheckboxes
                title={"Set active by HTTP method"}
                items={actionTagsToToggleItems(
                  props.actionTags,
                  props.setActionTags,
                  supabase
                )}
              />
            )}
          </div>
          <div className="flex flex-row gap-x-2 place-items-center">
            {profile && (
              <button
                className={classNames(
                  "flex flex-row place-items-center gap-x-1 text-white font-medium text-xs md:text-sm py-1.5 px-2 rounded focus:ring-2",
                  "bg-gray-900 hover:bg-gray-950"
                )}
                onClick={async () => {
                  const res = await supabase
                    .from("action_tags")
                    .insert({
                      name: "New Tag",
                      org_id: profile.org_id,
                    })
                    .select("*");
                  if (res.error) throw res.error;
                  if (res.data === null) throw new Error("No data returned");
                  const newActionTags = [
                    {
                      ...res.data[0],
                      actions: [],
                    },
                    ...props.actionTags,
                  ];
                  props.setActionTags(newActionTags);
                }}
              >
                <PlusIcon className="text-gray-200 w-4 h-4 md:w-5 md:h-5" />
                Add group
              </button>
            )}
            <button
              className="flex flex-row place-items-center gap-x-2 bg-gray-900 text-white font-medium text-xs md:text-sm py-1.5 px-4 rounded hover:bg-gray-950 focus:ring-2"
              onClick={() => setUploadModalOpen(true)}
            >
              <DocumentArrowUpIcon className="text-gray-200 w-4 h-4 md:w-5 md:h-5" />{" "}
              Upload
            </button>
            <button
              className={classNames(
                "flex flex-row place-items-center gap-x-1 bg-gray-900 text-red-700 font-medium text-xs md:text-sm py-1.5 px-4 rounded  ",
                props.actionTags.length > 0
                  ? "hover:text-white hover:bg-red-700 focus:ring-2"
                  : "cursor-not-allowed opacity-50"
              )}
              onClick={() =>
                props.actionTags.length > 0 &&
                setDeleteAllActionsModalOpen(true)
              }
            >
              <TrashIcon className=" w-4 h-4 md:w-5 md:h-5" />
              Delete all
            </button>
          </div>
        </div>
        {props.actionTags.length > 0 ? (
          props.actionTags
            .filter((actionTag) => {
              if (showInactive) return true;
              return actionTag.actions.some((action) => action.active);
            })
            .map((actionTag: ActionTagJoinActions) => (
              <ActionsSection
                key={actionTag.id}
                actionTagJoinActions={actionTag}
                showInactive={showInactive}
                setActionTag={(actionTag: ActionTagJoinActions) => {
                  const copy = [...props.actionTags];
                  const agIndex = props.actionTags.findIndex(
                    (ag) => ag.id === actionTag.id
                  );
                  copy[agIndex] = actionTag;
                  props.setActionTags(copy);
                }}
                deleteActionTag={async () => {
                  const copy = [...props.actionTags];
                  const agIndex = props.actionTags.findIndex(
                    (ag) => ag.id === actionTag.id
                  );
                  copy.splice(agIndex, 1);
                  props.setActionTags(copy);
                  const res = await supabase
                    .from("action_tags")
                    .delete()
                    .match({ id: actionTag.id });
                  if (res.error) throw res.error;
                }}
              />
            ))
        ) : (
          <div className="mt-10 h-96 text-gray-400 text-center text-lg rounded-lg border border-gray-500 border-dashed bg-gray-850 flex flex-col justify-center place-items-center">
            <h2 className={"text-2xl text-gray-300 font-medium mb-8"}>
              You have no actions
            </h2>
            <div className="grid grid-cols-2 gap-x-4 px-3 md:px-6">
              <div className="border border-gray-500 rounded-md py-4 px-8">
                <h3 className="text-xl text-gray-300 mb-4">
                  Configure your API
                </h3>
                <p>
                  <button
                    className="inline text-sky-500 hover:underline pt-6"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    Upload your OpenAPI specification
                  </button>
                </p>
              </div>
              <div className="border border-gray-500 rounded-md py-4 px-2 sm:px-4 md:px-8">
                <h3 className="text-xl text-gray-300 mb-4">
                  Use a preset configuration
                </h3>
                <div className="mt-8 grid grid-cols-2 gap-x-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className="px-4 md:px-10 py-4 bg-gray-900 hover:bg-gray-800 text-base md:text-lg text-gray-400 rounded-md border border-gray-600"
                      onClick={async () => {
                        // Add spec
                        if (isLoading || !profile) return;
                        setIsLoading(true);
                        const specRes = await fetch(
                          `/presets/${preset.id}/demo-openapi-spec.json`
                        );
                        const spec = await specRes.json();
                        await fetch("/api/swagger-to-actions", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            org_id: profile.org_id,
                            swagger: spec,
                          }),
                        });

                        // Enable all actions
                        await supabase
                          .from("actions")
                          .update({ active: true })
                          .eq("org_id", profile.org_id);
                        await props.loadActions();

                        // If not already set, set the org name & description
                        let toUpdate: Record<string, any> = {};
                        if (!profile.organizations?.name) {
                          toUpdate.name = spec.info.title;
                        }
                        if (!profile.organizations?.description) {
                          toUpdate.description = spec.info.description;
                        }
                        if (Object.keys(toUpdate).length > 0) {
                          await supabase
                            .from("organizations")
                            .update(toUpdate)
                            .eq("id", profile.org_id);
                        }

                        // Set user description
                        const userDescRes = await fetch(
                          `/presets/${preset.id}/user_description.json`
                        );
                        // If the file doesn't exist, don't set the user description
                        if (userDescRes.status === 200) {
                          const userDesc = (await userDescRes.json()) as string;
                          localStorage.setItem("userDescription", userDesc);
                        }

                        // Set test mode to true
                        localStorage.setItem("testMode", "true");

                        // Add preset suggestions
                        const suggRes = await fetch(
                          `/presets/${preset.id}/suggestions.json`
                        );
                        const suggestions = (await suggRes.json()) as string[];
                        const convRes = await supabase
                          .from("conversations")
                          // Match number of new conversations to the number of suggestions in the file
                          .insert(
                            suggestions.map((_) => ({
                              org_id: profile.org_id!,
                            }))
                          )
                          .select();
                        if (convRes.error) throw convRes.error;
                        const chatRes = await supabase
                          .from("chat_messages")
                          .insert(
                            convRes.data.map((conv, idx) => ({
                              org_id: conv.org_id,
                              conversation_id: conv.id,
                              role: "user",
                              content: suggestions[idx],
                              conversation_index: 0,
                            }))
                          );
                        if (chatRes.error) throw chatRes.error;
                        await refreshProfile();

                        setIsLoading(false);
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ActionsSection(props: {
  actionTagJoinActions: ActionTagJoinActions;
  setActionTag: (actionTag: ActionTagJoinActions) => void;
  deleteActionTag: () => void;
  showInactive: boolean;
}) {
  const supabase = useSupabaseClient();

  const [editActionIndex, setEditActionIndex] = React.useState<number | null>(
    null
  );
  const [editActionTag, setEditActionTag] = React.useState<boolean>(false);
  const [deleteActionTag, setDeleteActionTag] = React.useState<boolean>(false);
  const [deleteActionIndex, setDeleteActionIndex] = React.useState<
    number | null
  >(null);
  const [actions, setActions] = React.useState<Action[]>(
    props.actionTagJoinActions.actions
  );
  const { profile } = useProfile();

  useEffect(() => {
    setActions(props.actionTagJoinActions.actions);
  }, [props.actionTagJoinActions.actions]);

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
        action={async () => {
          let examplesCopy = [...actions];
          examplesCopy.splice(deleteActionIndex!, 1);
          setActions(examplesCopy);

          setDeleteActionIndex(null);
          await supabase
            .from("actions")
            .delete()
            .match({ id: actions[deleteActionIndex!].id });
        }}
        open={deleteActionIndex !== null}
        setOpen={(open: boolean) => {
          if (!open) setDeleteActionIndex(null);
        }}
      />
      <WarningModal
        title={`Delete action group and all its actions: "${props.actionTagJoinActions.name}"?`}
        description={
          "Are you sure you want to delete this action group and all its actions? Once you delete it you can't get it back. There's no undo button."
        }
        action={props.deleteActionTag}
        open={deleteActionTag}
        setOpen={setDeleteActionTag}
      />
      {editActionTag && (
        <EditActionTagModal
          actionTag={props.actionTagJoinActions}
          setActionTag={async (actionTag: ActionTag) => {
            props.setActionTag({
              ...props.actionTagJoinActions,
              ...actionTag,
            });
            const res = await supabase
              .from("action_tags")
              .update(actionTag)
              .match({ id: actionTag.id });
            if (res.error) throw res.error;
          }}
          close={() => setEditActionTag(false)}
        />
      )}
      {editActionIndex !== null && (
        <EditActionModal
          action={actions[editActionIndex]}
          setAction={async (
            newAction: Database["public"]["Tables"]["actions"]["Row"]
          ) => {
            actions[editActionIndex] = newAction;
            setActions(actions);
            await supabase.from("actions").upsert(newAction);
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
        className={classNames(
          "relative px-6 py-4 my-5 border border-gray-600 rounded-lg",
          props.actionTagJoinActions.actions.some((a) => a.active)
            ? "shadow-xl"
            : ""
        )}
        id={props.actionTagJoinActions.name}
      >
        <div className="flex flex-col w-full">
          <div className="flex flex-row justify-between place-items-start">
            <div
              className={
                props.actionTagJoinActions.actions.some((a) => a.active)
                  ? ""
                  : "opacity-60"
              }
            >
              {props.actionTagJoinActions.actions.length > 0 && (
                <Checkbox
                  label={"Active"}
                  checked={props.actionTagJoinActions.actions.some(
                    (a) => a.active
                  )}
                  onChange={async (checked: boolean) => {
                    const newActionTag = { ...props.actionTagJoinActions };
                    newActionTag.actions = newActionTag.actions.map((a) => ({
                      ...a,
                      active: checked,
                    }));
                    props.setActionTag(newActionTag);
                    const res = await supabase
                      .from("actions")
                      .update({ active: checked })
                      .eq("tag", props.actionTagJoinActions.id)
                      .select();
                    if (res.error) throw res.error;
                    if (res.data === null || res.data.length === 0)
                      throw new Error(
                        "Expected >0 rows to be updated" +
                          JSON.stringify(res.data)
                      );
                  }}
                />
              )}
            </div>
            <FlyoutMenu
              items={[
                {
                  name: "Edit Group",
                  onClick: () => setEditActionTag(true),
                },
                {
                  name: "Delete Group",
                  onClick: () => {
                    setDeleteActionTag(true);
                  },
                },
              ]}
              buttonClassName={
                "inline-flex items-center gap-x-1 text-sm font-semibold text-gray-100 hover:bg-gray-950 rounded-md transition"
              }
              Icon={
                <EllipsisHorizontalIcon
                  className="h-9 w-9 p-1"
                  aria-hidden="true"
                />
              }
              getClassName={(open) => {
                if (open) return "";
                return !props.actionTagJoinActions.actions.some((a) => a.active)
                  ? "opacity-60"
                  : "";
              }}
              popoverClassName={"w-40"}
            />
          </div>
        </div>
        <h2
          className={classNames(
            "font-bold text-2xl",
            props.actionTagJoinActions.actions.some((a) => a.active)
              ? "text-gray-200"
              : "text-gray-600"
          )}
        >
          {props.actionTagJoinActions.name}
        </h2>
        <p
          className={classNames(
            "mt-2",
            props.actionTagJoinActions.actions.some((a) => a.active)
              ? "text-gray-300"
              : "text-gray-700"
          )}
        >
          {props.actionTagJoinActions.description}
        </p>
        <ul
          role="list"
          className={classNames(
            "relative mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 rounded-md"
          )}
        >
          {actions
            .filter((a) => props.showInactive || a.active)
            .map((action, index) => (
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
                    const newActionTag = { ...props.actionTagJoinActions };

                    newActionTag.actions[index].active =
                      !newActionTag.actions[index].active;
                    props.setActionTag(newActionTag);
                    const res = await supabase
                      .from("actions")
                      .update({ active: newActionTag.actions[index].active })
                      .eq("id", action.id)
                      .select();
                    if (res.error) throw res.error;
                    if (res.data === null || res.data.length === 0)
                      throw new Error("Expected >0 rows to be updated");
                  }}
                  className="relative flex max-w-full w-full items-center justify-between gap-x-1 md:gap-x-3 p-3 md:p-6"
                >
                  <div className="flex flex-col select-none max-w-[calc(100%-3.75rem)]">
                    <p
                      className={classNames(
                        "truncate max-h-20 text-xs font-mono whitespace-pre-line",
                        action.active ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      {action.request_method?.toUpperCase()} {action.path}
                    </p>
                    <h3
                      className={classNames(
                        "font-medium whitespace-wrap break-words",
                        action.active ? "text-gray-100" : "text-gray-400"
                      )}
                    >
                      {action.name}
                    </h3>
                    {action.description !==
                      `${action.request_method?.toUpperCase()} ${
                        action.path
                      }` && (
                      <p className="mt-1 truncate max-h-20 text-sm text-gray-500 whitespace-pre-line">
                        {action.description}
                      </p>
                    )}
                  </div>
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
                    buttonClassName={
                      "inline-flex items-center gap-x-1 text-sm font-semibold text-gray-100 hover:bg-gray-950 rounded-md transition"
                    }
                    Icon={
                      <EllipsisHorizontalIcon
                        className="h-8 w-8 p-0.5 md:h-9 md:w-9 md:p-1"
                        aria-hidden="true"
                      />
                    }
                    popoverClassName={"w-40"}
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
                  tag: props.actionTagJoinActions.id,
                  name: "new_action",
                  description: "",
                  action_type: "http",
                  active: true,
                  org_id: profile?.org_id,
                })
                .select();
              if (resp.error) throw resp.error;
              if (resp.data.length !== 1)
                throw new Error("Expected 1 row to be inserted");
              setActions([...actions, resp.data[0]]);
              props.setActionTag({
                ...props.actionTagJoinActions,
                actions: [...props.actionTagJoinActions.actions, resp.data[0]],
              });
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

function actionTagsToToggleItems(
  actionTags: ActionTagJoinActions[],
  setActionTags: (actionTags: ActionTagJoinActions[]) => void,
  supabase: SupabaseClient<Database>
): SelectBoxWithDropdownOption[] {
  const allActions = actionTags.map((actionTag) => actionTag.actions).flat();

  const updateActiveStatus = async (checked: boolean, m: any) => {
    const newActionTags = [...actionTags];
    newActionTags.forEach((actionTag) => {
      actionTag.actions.forEach((action) => {
        if (action.request_method === m) action.active = checked;
      });
    });
    setActionTags(newActionTags);
    await supabase
      .from("actions")
      .update({ active: checked })
      .eq("request_method", m);
  };

  return [...new Set(allActions.map((a) => a.request_method))]
    .filter((m) => !!m)
    .map((m) => ({
      id: m,
      name: m!.toUpperCase(),
      onChange: (checked: boolean) => {
        updateActiveStatus(checked, m);
      },
      checked: allActions
        .filter((a) => a.active)
        .some((a) => a.request_method === m),
    }));
}
