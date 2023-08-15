import {
  ChatBubbleBottomCenterTextIcon,
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
import { Action, ActionTagJoin, Api } from "../../lib/types";
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
import ViewSystemPromptModal from "./viewPromptModal";
import APITabs from "./APITabs";

export default function PageActionsSection(props: {
  actionTags: ActionTagJoin[];
  setActionTags: Dispatch<SetStateAction<ActionTagJoin[] | undefined>>;
  loadActions: () => Promise<void>;
  apis: Api[];
  setApis: Dispatch<SetStateAction<Api[] | undefined>>;
}) {
  const supabase = useSupabaseClient<Database>();
  const { profile, refreshProfile } = useProfile();
  const [open, setUploadModalOpen] = useState<boolean>(false);
  const [showInactive, setShowInactive] = useState<boolean>(true);
  const [numActiveActions, setNumActiveActions] = useState<number>(0);
  const [deleteAllActionsModelOpen, setDeleteAllActionsModalOpen] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [viewPromptOpen, setViewPromptOpen] = React.useState<boolean>(false);
  const [selectedApiTab, setSelectedApiTab] = React.useState<Api | undefined>(
    props.apis.length > 0 ? props.apis[0] : undefined
  );

  useEffect(() => {
    setNumActiveActions(
      props.actionTags
        .map((tag) => tag.actions)
        .flat()
        .filter((action) => action.active).length
    );
  }, [props.actionTags]);

  // This is the api id that selectedApiTab should be changed to
  const [updateSelectedTo, setUpdateSelectedTo] = useState<
    string | undefined | null
  >(null);
  useEffect(() => {
    // Null means do nothing
    if (updateSelectedTo === null) return;
    if (updateSelectedTo === undefined && props.apis.length > 0) {
      setSelectedApiTab({ ...props.apis[0] });
    } else {
      setSelectedApiTab(
        props.apis.find((api) => api.id === updateSelectedTo) ?? undefined
      );
    }
    setUpdateSelectedTo(null);
    // Run every time props.apis changes
  }, [props.apis]);

  if (isLoading)
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex place-items-center justify-center">
        <LoadingSpinner classes={"h-20 w-20 text-gray-500"} />
      </div>
    );
  return (
    <>
      <UploadModal
        open={open}
        setOpen={setUploadModalOpen}
        loadActions={props.loadActions}
        api_id={selectedApiTab?.id}
        updateSelectedApiTab={setUpdateSelectedTo}
      />
      <ViewSystemPromptModal
        open={viewPromptOpen}
        setOpen={setViewPromptOpen}
        actions={props.actionTags
          .map((tag) => tag.actions)
          .flat()
          .filter((a) => a.active)}
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

      <div className="mt-32 mx-5 mb-20">
        <div className="fixed top-16 mt-px inset-x-0 mx-auto bg-gray-800 max-w-7xl pt-2 z-10">
          {props.apis.length > 0 && (
            <APITabs
              apis={props.apis}
              currentApiId={selectedApiTab?.id}
              setCurrentApi={setSelectedApiTab}
              setApis={props.setApis}
              onDelete={async () => {
                // This reads oddly, but it means we update the selected API to the last API in the list
                // when props.apis is updated (this MUST be called before loadActions)
                setUpdateSelectedTo(undefined);
                await props.loadActions();
              }}
            />
          )}
          <div className="border-b border-gray-500 px-16 mx-8 pb-3 mt-4 flex place-items-end justify-between gap-x-2">
            <div className="flex flex-row gap-x-6 place-items-center">
              {props.actionTags.length > 0 && (
                <>
                  <Checkbox
                    onChange={(checked) => {
                      setShowInactive(checked);
                    }}
                    checked={showInactive}
                    label={"Show inactive"}
                  />

                  <DropdownWithCheckboxes
                    title={"Set active by HTTP method"}
                    items={actionTagsToToggleItems(
                      props.actionTags,
                      props.setActionTags,
                      supabase
                    )}
                  />
                </>
              )}
            </div>
            <div className="flex flex-row gap-x-2 place-items-center">
              {profile && selectedApiTab && (
                <button
                  className={classNames(
                    "flex flex-row place-items-center gap-x-1 text-white font-medium text-xs md:text-sm py-1.5 px-2 rounded focus:ring-2",
                    "bg-gray-900 hover:bg-gray-950"
                  )}
                  onClick={async () => {
                    const res = await supabase
                      .from("action_tags")
                      .insert({
                        name: "New Group",
                        org_id: profile.org_id,
                        api_id: selectedApiTab.id,
                      })
                      .select("*");
                    if (res.error) throw res.error;
                    if (res.data === null) throw new Error("No data returned");
                    const newActionTags = [
                      {
                        ...res.data[0],
                        actions: [],
                        apis: selectedApiTab,
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
              {props.actionTags.length > 0 && (
                <FlyoutMenu
                  items={[
                    {
                      name: "View system prompt",
                      Icon: (
                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4 md:w-5 md:h-5" />
                      ),
                      onClick: () => setViewPromptOpen(true),
                    },
                    {
                      name: "Delete all actions",
                      Icon: <TrashIcon className="w-4 h-4 md:w-5 md:h-5" />,
                      onClick: () =>
                        props.actionTags.length > 0 &&
                        setDeleteAllActionsModalOpen(true),
                    },
                  ]}
                  buttonClassName={
                    "text-gray-200 rounded bg-gray-900 hover:bg-gray-950"
                  }
                  getClassName={() => "block h-8"}
                  Icon={
                    <EllipsisHorizontalIcon
                      className="h-8 w-8 p-0.5"
                      aria-hidden="true"
                    />
                  }
                  popoverClassName={"w-48"}
                />
              )}
            </div>
          </div>
        </div>
        {props.actionTags.filter((a) => a.api_id === selectedApiTab?.id)
          .length > 0 ? (
          props.actionTags
            .filter((actionTag) => {
              // Only show actions for the selected API
              if (actionTag.api_id !== selectedApiTab?.id) return false;
              if (showInactive) return true;
              return actionTag.actions.some((action) => action.active);
            })
            .map((actionTag: ActionTagJoin) => (
              <ActionsSection
                key={actionTag.id}
                actionTagJoinActions={actionTag}
                showInactive={showInactive}
                setActionTag={(actionTag: ActionTagJoin) => {
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
        ) : props.apis.length === 0 ? (
          <div className="mt-32 h-96 text-gray-400 text-center text-lg rounded-lg border border-gray-500 border-dashed bg-gray-850 flex flex-col justify-center place-items-center">
            <h2 className={"text-2xl text-gray-300 font-medium mb-8"}>
              {selectedApiTab?.name}
              {selectedApiTab?.name?.endsWith("API")
                ? " has"
                : selectedApiTab?.name
                ? " API has"
                : "You have"}{" "}
              no actions
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
                        // This reads oddly, but it means we update the selected API to the last API in the list
                        // when props.apis is updated (this MUST be called before loadActions)
                        setUpdateSelectedTo(undefined);
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
        {numActiveActions > 20 && (
          <div
            className="fixed bottom-0 inset-x-0 md:mx-10 lg:mx-auto max-w-7xl flex flex-row gap-x-2 bg-yellow-200 border-l-4 border-yellow-500 text-yellow-700 px-4 py-2"
            role="alert"
          >
            <p className="font-bold">Warning:</p>
            <p>
              {`${numActiveActions} actions are enabled. Superflows performs best
            with fewer than 20.`}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function ActionsSection(props: {
  actionTagJoinActions: ActionTagJoin;
  setActionTag: (actionTag: ActionTagJoin) => void;
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
          setActionTag={async (actionTag: ActionTagJoin) => {
            props.setActionTag({
              ...props.actionTagJoinActions,
              ...actionTag,
            });
            // actionTag includes .actions and .apis properties. Don't include these in the update
            const actionTagWithoutActions = {
              ...actionTag,
              actions: undefined,
              apis: undefined,
            };
            delete actionTagWithoutActions.actions;
            delete actionTagWithoutActions.apis;
            // Update the action tag in DB
            const res = await supabase
              .from("action_tags")
              .update(actionTagWithoutActions)
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
                  api_id: props.actionTagJoinActions.api_id,
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
            <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md bg-gray-700 text-gray-200">
              <PlusIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="mt-2 text-sm select-none text-gray-200">
              Add new
            </div>
          </li>
        </ul>
      </div>
    </>
  );
}

function actionTagsToToggleItems(
  actionTags: ActionTagJoin[],
  setActionTags: (actionTags: ActionTagJoin[]) => void,
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
