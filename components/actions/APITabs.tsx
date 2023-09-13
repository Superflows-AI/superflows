import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  CheckCircleIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import SelectBox from "../selectBox";
import { Database } from "../../lib/database.types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useProfile } from "../contextManagers/profile";
import classNames from "classnames";
import { Api, HeadersInsert } from "../../lib/types";
import Modal from "../modal";
import WarningModal from "../warningModal";

export default function APITabs(props: {
  apis: Api[];
  currentApiId: string | undefined;
  setCurrentApi: (tab: Api) => void;
  setApis: Dispatch<SetStateAction<Api[] | undefined>>;
  onDelete: () => Promise<void>;
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [apiIdToEdit, setApiIdToEdit] = React.useState<string | null>(null);
  return (
    <div>
      <APISettingsModal
        api={props.apis.find((api) => api.id === apiIdToEdit) ?? null}
        close={() => setApiIdToEdit(null)}
        setApis={props.setApis}
        onDelete={props.onDelete}
      />
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-700 py-2 pl-3 pr-10 text-base focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
        >
          {props.apis.map((tab) => (
            <option key={tab.id}>{tab.name}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-gray-700 w-full">
          <nav
            className="-mb-px flex place-items-center space-x-0 mx-4"
            aria-label="Tabs"
          >
            <div className="text-gray-300 mr-3 text-sm select-none">APIs</div>
            {props.apis.map((api) => (
              <div className={"relative"} key={api.id}>
                <button
                  onClick={() => props.setCurrentApi(api)}
                  className={classNames(
                    props.currentApiId === api.id
                      ? "text-gray-300 bg-gray-850 border-gray-400"
                      : "text-gray-500 border-gray-600 hover:border-gray-500 hover:text-gray-400 bg-gray-800",
                    "peer select-none whitespace-nowrap border rounded-t-md py-1 pl-8 pr-5 text-sm font-medium flex flex-row place-items-center gap-x-1"
                  )}
                  aria-current={
                    props.currentApiId === api.id ? "page" : undefined
                  }
                >
                  {api.name}
                  <button
                    className={classNames(
                      props.currentApiId === api.id
                        ? "hover:bg-gray-900 rounded hover:text-gray-100"
                        : "",
                      "p-0.5 cursor-pointer"
                    )}
                    onClick={() => setApiIdToEdit(api.id)}
                    disabled={props.currentApiId !== api.id}
                  >
                    <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </button>
                <div
                  className={classNames(
                    props.currentApiId === api.id
                      ? "popup"
                      : "absolute opacity-0",
                    "right-0 top-9 w-40"
                  )}
                >
                  Click the cog to edit API settings
                </div>
              </div>
            ))}
            {profile?.org_id && (
              <div className={"relative"}>
                <button
                  onClick={async () => {
                    if (!profile?.organizations?.is_paid[0].is_premium) return;
                    const supaRes = await supabase
                      .from("apis")
                      .insert({ name: "New API", org_id: profile?.org_id! })
                      .select();
                    if (supaRes.error) throw new Error(supaRes.error.message);
                    setApiIdToEdit(supaRes.data[0].id);
                    props.setApis((prev) => [...(prev ?? []), supaRes.data[0]]);
                  }}
                  className={classNames(
                    !profile?.organizations?.is_paid[0].is_premium
                      ? "text-gray-600 border-gray-600 cursor-default"
                      : "cursor-pointer text-gray-500 border-gray-600 hover:border-gray-500 hover:text-gray-400 bg-gray-800",
                    "peer select-none whitespace-nowrap border rounded-t-md py-1 pl-8 pr-5 text-sm font-medium flex flex-row place-items-center gap-x-1"
                  )}
                >
                  Add new
                  <PlusIcon className="h-5 w-5 my-0.5" aria-hidden="true" />
                </button>
                <div className={classNames("popup right-0 top-9 w-44")}>
                  {!profile?.organizations?.is_paid[0].is_premium
                    ? "Upgrade to premium to add more APIs"
                    : "Add an API when connecting to an API at a different host"}
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}

function APISettingsModal(props: {
  close: () => void;
  api: Api | null;
  setApis: Dispatch<SetStateAction<Api[] | undefined>>;
  onDelete: () => Promise<void>;
}) {
  const supabase = useSupabaseClient<Database>();
  const [apiHost, setApiHostLocal] = React.useState<string>(
    props.api?.api_host ?? ""
  );
  const [apiName, setApiNameLocal] = React.useState<string>(
    props.api?.name ?? ""
  );
  const [apiHostSavedFeedback, setApiHostSavedFeedback] = React.useState<
    boolean | null
  >(null);
  const [apiNameSavedFeedback, setApiNameSavedFeedback] = React.useState<
    boolean | null
  >(null);
  const [headers, setHeaders] = useState<HeadersInsert[]>([]);
  useEffect(() => {
    if (!props.api) return;
    setApiHostLocal(props.api.api_host);
    setApiNameLocal(props.api.name);
    (async () => {
      const res = await supabase
        .from("fixed_headers")
        .select("*")
        .eq("api_id", props.api!.id);
      if (res.error) throw new Error(res.error.message);
      let headers = res.data;

      // If there are no headers, create one so the user can see one in the UI
      // Note: empty headers are ignored on the backend anyway
      if (!headers || headers.length === 0) {
        const insertRes = await supabase
          .from("fixed_headers")
          .insert({ api_id: props.api!.id })
          .select();
        if (insertRes.error) throw new Error(insertRes.error.message);
        headers = insertRes.data;
      }
      setHeaders(headers);
    })();
  }, [props.api]);

  const [deleteClicked, setDeleteClicked] = React.useState<boolean>(false);
  return (
    <>
      <Modal
        open={!!props.api}
        setOpen={props.close}
        classNames={"max-w-6xl bg-gray-850"}
      >
        <WarningModal
          title={`Delete ${apiName ? `"${apiName}"` : "API"}`}
          description={`Are you sure you want to delete ${apiName} and all its actions? This is not reversible. There's no undo button.`}
          action={async () => {
            if (!props.api) return;
            const res = await supabase
              .from("apis")
              .delete()
              .eq("id", props.api.id);
            if (res.error) throw new Error(res.error.message);
            props.setApis((prev) =>
              prev?.filter((api) => api.id !== props.api!.id)
            );
            await props.onDelete();
            props.close();
          }}
          open={deleteClicked}
          setOpen={setDeleteClicked}
          actionName={"Delete"}
        />
        <div className="w-full bg-gray-850 rounded pb-2">
          <h2 className="text-xl text-gray-100">API Settings</h2>
          <p className="mt-1 text-little text-gray-400">
            These are required to connect Superflows to your API so it can
            answer questions and take actions in your product.
          </p>
          <div className="w-full h-px mt-2 mb-3 bg-gray-700" />
          <div className="grid grid-cols-3 gap-y-6 mt-4">
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Name</h2>
              <p className="text-gray-400 text-sm">
                Name used to identify this API in this dashboard.
              </p>
            </div>
            <div className="relative col-start-3 col-span-1 flex flex-row gap-x-3 mt-6 mb-3 justify-end">
              <div
                className={classNames(
                  "absolute top-3 -left-32 flex flex-row place-items-center gap-x-1 text-gray-200",
                  apiNameSavedFeedback !== null ? "" : "invisible"
                )}
              >
                {apiNameSavedFeedback ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                {apiNameSavedFeedback ? "Saved" : "Save failed"}
              </div>
              <input
                className="border border-gray-300 rounded-md bg-gray-700 grow text-gray-200 text-xl px-5 py-2 focus:border-purple-600 focus:ring-purple-600"
                onChange={(e) => setApiNameLocal(e.target.value)}
                value={apiName}
                onBlur={async () => {
                  if (!props.api) return;
                  const res = await supabase
                    .from("apis")
                    .update({ name: apiName })
                    .eq("id", props.api.id);
                  if (res.error) throw res.error;
                  props.setApis((prev) =>
                    prev?.map((api) =>
                      api.id === props.api!.id ? { ...api, name: apiName } : api
                    )
                  );
                  setApiNameSavedFeedback(!res.error);
                  setTimeout(() => {
                    setApiNameSavedFeedback(null);
                  }, 2000);
                }}
              />
            </div>
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">API Host</h2>
              <p className="text-gray-400 text-sm">
                The url where your API is hosted.
                <br />
                E.g. https://api.stripe.com
              </p>
            </div>
            <div className="relative col-span-2 flex flex-row gap-x-3 mt-6 mb-3 justify-end">
              <div
                className={classNames(
                  "absolute top-1 left-28 flex flex-row place-items-center gap-x-1 text-gray-200",
                  apiHostSavedFeedback !== null ? "" : "invisible"
                )}
              >
                {apiHostSavedFeedback ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                {apiHostSavedFeedback ? "Saved" : "Save failed"}
              </div>
              <div className="relative flex flex-col w-[calc(50%+8rem)]">
                <input
                  className="border border-gray-300 rounded-md bg-gray-700 grow text-gray-200 px-5 py-1 focus:border-purple-600 focus:ring-purple-600"
                  onChange={(e) => setApiHostLocal(e.target.value)}
                  value={apiHost}
                  onBlur={async () => {
                    if (!props.api) return;
                    const res = await supabase
                      .from("apis")
                      .update({ api_host: apiHost })
                      .eq("id", props.api.id);
                    if (res.error) throw res.error;
                    props.setApis((prev) =>
                      prev?.map((api) =>
                        api.id === props.api!.id
                          ? { ...api, api_host: apiHost }
                          : api
                      )
                    );
                    setApiHostSavedFeedback(!res.error);
                    setTimeout(() => {
                      setApiHostSavedFeedback(null);
                    }, 2000);
                  }}
                />
                <p className="text-sm w-full mt-3 flex justify-center place-items-baseline text-gray-500">
                  This should probably start with{" "}
                  <code className="ml-1 rounded-md bg-gray-800 px-1 text-gray-500">
                    https://
                  </code>
                </p>
              </div>
            </div>

            {/* Authorization method */}
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Authentication header</h2>
              <p className="text-gray-400 text-sm">
                Set up how authentication headers are set on HTTP requests to
                your API.
              </p>
            </div>
            <div className="relative mb-4 col-span-2 flex flex-row place-items-center gap-x-3 mt-6 justify-end text-gray-200 text-xl">
              <SelectBox
                options={[
                  {
                    id: "Authorization",
                    name: "Authorization",
                  },
                  {
                    id: "Proxy-Authorization",
                    name: "Proxy-Authorization",
                  },
                  {
                    id: "x-api-key",
                    name: "x-api-key",
                  },
                  {
                    id: "apiKey",
                    name: "apiKey",
                  },
                ]}
                selected={props.api?.auth_header ?? null}
                setSelected={async (selected: string) => {
                  if (!props.api) return;
                  const res = await supabase
                    .from("apis")
                    .update({ auth_header: selected })
                    .eq("id", props.api!.id);
                  if (res.error) throw res.error;
                  props.setApis((prev) =>
                    prev?.map((api) =>
                      api.id === props.api!.id
                        ? { ...api, auth_header: selected }
                        : api
                    )
                  );
                }}
                theme="dark"
              />
              :
              <SelectBox
                options={[
                  {
                    id: null,
                    name: "None",
                  },
                  {
                    id: "Bearer",
                    name: "Bearer",
                  },
                  {
                    id: "Basic",
                    name: "Basic",
                  },
                  {
                    id: "app-token",
                    name: "app-token",
                  },
                  {
                    id: "Digest",
                    name: "Digest",
                  },
                  {
                    id: "HOBA",
                    name: "HOBA",
                  },
                  {
                    id: "Mutual",
                    name: "Mutual",
                  },
                  {
                    id: "VAPID",
                    name: "VAPID",
                  },
                  {
                    id: "SCRAM",
                    name: "SCRAM",
                  },
                ]}
                selected={props.api?.auth_scheme ?? null}
                setSelected={async (selected: string) => {
                  if (!props.api) return;
                  const res = await supabase
                    .from("apis")
                    .update({ auth_scheme: selected })
                    .eq("id", props.api.id);
                  if (res.error) throw res.error;
                  props.setApis((prev) =>
                    prev?.map((api) =>
                      api.id === props.api!.id
                        ? { ...api, auth_scheme: selected }
                        : api
                    )
                  );
                }}
                theme={"dark"}
                includeNull={true}
              />
              <div className="relative h-16 flex place-items-center">
                <code className="flex justify-center place-items-center h-[2.25rem] font-mono bg-gray-900 px-9 text-gray-500 rounded-md text-base font-normal">
                  {"< AUTH PARAMETERS/API-KEY HERE >"}
                </code>
                <p className="absolute -bottom-3 text-sm w-full mt-3 flex text-center justify-center place-items-baseline text-gray-300">
                  These are sent in each request to the Superflows API.
                </p>
              </div>
            </div>
            <div className="col-start-1 flex flex-col place-items-start pr-4">
              <h2 className="text-lg text-gray-200">Headers</h2>
              <p className="text-gray-400 text-sm">
                Add any other fixed headers that your API always needs.
              </p>
            </div>
            <div className="mt-2 col-span-2 flex flex-col gap-y-1.5 w-full px-12">
              {headers.map((h, idx) => (
                <Header
                  key={idx}
                  header={h}
                  onBlur={async () => {
                    const res = await supabase
                      .from("fixed_headers")
                      .update(h)
                      .eq("id", h.id);
                    if (res.error) throw new Error(res.error.message);
                  }}
                  setHeader={(header: HeadersInsert) => {
                    setHeaders((prev) =>
                      prev.map((prevHeader) =>
                        prevHeader.id === h.id ? header : prevHeader
                      )
                    );
                  }}
                  onDelete={async () => {
                    const res = await supabase
                      .from("fixed_headers")
                      .delete()
                      .eq("id", h.id);
                    if (res.error) throw new Error(res.error.message);
                    setHeaders((prev) =>
                      prev.filter((prevHeader) => prevHeader.id !== h.id)
                    );
                  }}
                />
              ))}
              <button
                className="w-fit flex gap-x-2 text-sm flex-row justify-start place-items-center rounded-md text-gray-400 px-3 py-0.5 hover:bg-gray-900 transition"
                onClick={async () => {
                  if (!props.api) return;
                  const res = await supabase
                    .from("fixed_headers")
                    .insert({ api_id: props.api.id })
                    .select();
                  if (res.error) throw new Error(res.error.message);
                  setHeaders((prev) => [...prev, res.data[0]]);
                }}
              >
                Add header
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-6 flex flex-row gap-x-10 place-items-center rounded-md border border-gray-600 py-3 px-3 bg-gray-900">
            <h3 className="text-lg text-gray-300">Danger Zone</h3>
            <button
              className="max-w-fit rounded-md text-gray-300 px-3 py-1.5 border border-gray-600 hover:bg-red-600 transition"
              onClick={() => setDeleteClicked(true)}
            >
              Delete API
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Header(props: {
  header: HeadersInsert;
  setHeader: (header: HeadersInsert) => void;
  onBlur: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="w-full flex flex-row place-items-center gap-x-6">
      <input
        className="border border-gray-300 rounded-md text-sm bg-gray-700 text-gray-200 px-5 py-2 focus:border-purple-600 focus:ring-purple-600"
        placeholder={"Name"}
        value={props.header.name}
        onBlur={props.onBlur}
        onChange={(e) => {
          props.setHeader({ ...props.header, name: e.target.value });
        }}
      />
      <input
        className="border border-gray-300 rounded-md text-sm bg-gray-700 text-gray-200 px-5 py-2 focus:border-purple-600 focus:ring-purple-600"
        placeholder={"Value"}
        value={props.header.value}
        onBlur={props.onBlur}
        onChange={(e) => {
          props.setHeader({ ...props.header, value: e.target.value });
        }}
      />
      <button
        className="rounded-md text-gray-400 px-1.5 py-1.5 hover:bg-gray-900 transition"
        onClick={props.onDelete}
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
