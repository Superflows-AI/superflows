import { DocumentArrowUpIcon, PlusIcon } from "@heroicons/react/24/outline";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Action } from "../../lib/types";
import { classNames } from "../../lib/utils";
import WarningModal from "../warningModal";
import EditActionModal from "./editActionModal";
import UploadModal from "./uploadModal";
import { Database } from "../../lib/database.types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import FlyoutMenu from "../flyoutMenu";
import Checkbox from "../checkbox";
import { useProfile } from "../contextManagers/profile";
import DropdownWithCheckboxes, {
  SelectBoxWithDropdownOption,
} from "../dropdown";

export default function PageActionsSection(props: {
  actions: Action[];
  setActions: Dispatch<SetStateAction<Action[] | null>>;
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
          <div className="flex flex-row gap-x-6 place-items-center">
            <Checkbox
              onChange={(checked) => {
                setIncludeInactive(checked);
              }}
              checked={includeInactive}
              label={"Show inactive"}
            />
            {props.actions.length > 0 && (
              <DropdownWithCheckboxes
                title={"Enable HTTP method"}
                items={actionsToToggleItems(props.actions, props.setActions)}
              />
            )}{" "}
          </div>
          <div className="flex flex-row gap-x-2 place-items-center">
            <button
              className="flex flex-row place-items-center gap-x-2 bg-gray-900 text-white font-medium text-sm py-1.5 px-4 rounded hover:bg-gray-950 focus:ring-2"
              onClick={() => setUploadModalOpen(true)}
            >
              <DocumentArrowUpIcon className="text-gray-200 w-5 h-5" /> Upload
            </button>
          </div>
        </div>
        {props.actions.length > 0 ? (
          <ActionsSection
            actions={props.actions.filter((action) => {
              if (includeInactive) return true;
              return action.active;
            })}
            setActions={props.setActions}
          />
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
  actions: Action[];
  setActions: Dispatch<SetStateAction<Action[] | null>>;
}) {
  const supabase = useSupabaseClient();

  const [editActionIndex, setEditActionIndex] = React.useState<number | null>(
    null
  );
  const [deleteActionIndex, setDeleteActionIndex] = React.useState<
    number | null
  >(null);
  const { profile } = useProfile();

  return (
    <>
      <WarningModal
        title={
          deleteActionIndex !== null
            ? `Delete action: "${props.actions[deleteActionIndex!].name}"?`
            : ""
        }
        description={
          "Are you sure you want to delete this action? Once you delete it you can't get it back. There's no undo button."
        }
        action={async () => {
          let examplesCopy = [...props.actions];
          examplesCopy.splice(deleteActionIndex!, 1);
          props.setActions(examplesCopy);

          setDeleteActionIndex(null);
          await supabase
            .from("actions")
            .delete()
            .match({ id: props.actions[deleteActionIndex!].id });
        }}
        open={deleteActionIndex !== null}
        setOpen={(open: boolean) => {
          if (!open) setDeleteActionIndex(null);
        }}
      />

      {editActionIndex !== null && (
        <EditActionModal
          action={props.actions[editActionIndex]}
          setAction={async (
            newAction: Database["public"]["Tables"]["actions"]["Row"]
          ) => {
            props.actions[editActionIndex] = newAction;
            props.setActions(props.actions);
            await supabase.from("actions").upsert(newAction);
            setEditActionIndex(null);
          }}
          close={() => {
            if (
              props.actions[editActionIndex].name === "" &&
              props.actions.length === editActionIndex + 1
            ) {
              props.setActions(props.actions.slice(0, -1));
            }
            setEditActionIndex(null);
          }}
        />
      )}
      <div
        className={classNames(
          "relative px-6 py-4 my-5 border border-gray-600 rounded-lg"
        )}
      >
        <div className="flex flex-col w-full"></div>
        <ul
          role="list"
          className={classNames(
            "relative mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 rounded-md"
          )}
        >
          {props.actions.map((action, index) => (
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
                  const newActions = [...props.actions];
                  newActions[index].active = !newActions[index].active;
                  props.setActions(newActions);

                  const res = await supabase
                    .from("actions")
                    .update({
                      active: newActions[index].active,
                    })
                    .eq("id", action.id)
                    .select();
                  if (res.error) throw res.error;
                  if (res.data === null || res.data.length === 0)
                    throw new Error("Expected >0 rows to be updated");
                }}
                className="relative flex max-w-full w-full items-center justify-between space-x-3 p-6"
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
                />
              </div>
            </li>
          ))}
          <li
            onClick={async () => {
              const exampleLen = props.actions.length;
              const resp = await supabase
                .from("actions")
                .insert({
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
              props.setActions([...props.actions, resp.data[0]]);

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

function actionsToToggleItems(
  actions: Action[],
  setActions: React.Dispatch<React.SetStateAction<Action[] | null>>
): SelectBoxWithDropdownOption[] {
  return [...new Set(actions.map((a) => a.request_method))]
    .filter((m) => !!m)
    .map((m) => ({
      id: m,
      name: m!.toUpperCase(),
      onChange: (checked: boolean) => {
        const newActions = [...actions];
        newActions.forEach((action) => {
          if (action.request_method === m) action.active = checked;
        });
        setActions(newActions);
      },
      checked: actions
        .filter((a) => a.active)
        .some((a) => a.request_method === m),
    }));
}
