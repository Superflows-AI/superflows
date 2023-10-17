import {
  CheckCircleIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import classNames from "classnames";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Database } from "../../lib/database.types";
import { Api, HeadersInsert } from "../../lib/types";
import { Header } from "../actions/APITabs";
import SelectBox from "../selectBox";

export default function ConfirmAuth(props: {
  api: Api;
  setApi: Dispatch<SetStateAction<Api | null>>;
  nextStep: () => void;
}) {
  const supabase = useSupabaseClient<Database>();
  const [apiHost, setApiHostLocal] = React.useState<string>("");
  const [apiHostSavedFeedback, setApiHostSavedFeedback] = React.useState<
    boolean | null
  >(null);
  const [headers, setHeaders] = useState<HeadersInsert[]>([]);
  const alreadyAddedHeader = React.useRef(false);
  const [queryParamName, setQueryParamName] = useState<string>("");

  useEffect(() => {
    if (!props.api || alreadyAddedHeader.current) return;
    alreadyAddedHeader.current = true;
    setApiHostLocal(props.api.api_host);
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
    if (props.api) setQueryParamName(props.api.auth_query_param_name ?? "");
  }, [props.api]);

  return (
    <div className="h-screen w-full bg-gray-850 flex flex-col place-items-center justify-center">
      <div className="max-w-7xl -mt-12 px-8 py-6 w-full bg-gray-800 rounded border border-gray-300 pb-2">
        <h2 className="text-2xl text-gray-100">Connect to your API</h2>
        <p className="mt-1 text-little text-gray-400">
          Required so Superflows can answer questions and take actions in your
          product.
        </p>
        <div className="w-full h-px mt-2 mb-3 bg-gray-700" />
        <div className="grid grid-cols-3 gap-y-6 mt-4">
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
                apiHostSavedFeedback !== null ? "" : "invisible",
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
                  props.setApi({ ...props.api, api_host: apiHost });
                  const res = await supabase
                    .from("apis")
                    .update({ api_host: apiHost })
                    .eq("id", props.api.id);
                  if (res.error) throw res.error;
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
              Set up how authentication headers are set on HTTP requests to your
              API.
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
                {
                  id: "Query parameter",
                  name: "Query parameter",
                },
              ]}
              selected={props.api?.auth_header ?? null}
              setSelected={async (selected: string) => {
                if (!props.api) return;
                props.setApi({ ...props.api, auth_header: selected });
                const res = await supabase
                  .from("apis")
                  .update({ auth_header: selected })
                  .eq("id", props.api!.id);
                if (res.error) throw res.error;
              }}
              theme="dark"
            />
            :
            {props.api?.auth_header !== "Query parameter" ? (
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
                  props.setApi({ ...props.api, auth_scheme: selected });
                  const res = await supabase
                    .from("apis")
                    .update({ auth_scheme: selected })
                    .eq("id", props.api.id);
                  if (res.error) throw res.error;
                }}
                theme={"dark"}
                includeNull={true}
              />
            ) : (
              <input
                className="border border-gray-300 rounded-md text-sm bg-gray-700 text-gray-200 px-5 py-[0.4375rem] max-w-[9.5rem] focus:border-purple-600 focus:ring-purple-600"
                onChange={(e) => setQueryParamName(e.target.value)}
                value={queryParamName}
                placeholder={"Parameter name"}
                onBlur={async () => {
                  if (!props.api) return;
                  const res = await supabase
                    .from("apis")
                    .update({ auth_query_param_name: queryParamName })
                    .eq("id", props.api.id);
                  if (res.error) throw res.error;
                  props.setApi({
                    ...props.api,
                    auth_query_param_name: queryParamName,
                  });
                }}
              />
            )}
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
            <h2 className="text-lg text-gray-200">Headers (optional)</h2>
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
                    .eq("id", h.id!);
                  if (res.error) throw new Error(res.error.message);
                }}
                setHeader={(header: HeadersInsert) => {
                  setHeaders((prev) =>
                    prev.map((prevHeader) =>
                      prevHeader.id === h.id ? header : prevHeader,
                    ),
                  );
                }}
                onDelete={async () => {
                  const res = await supabase
                    .from("fixed_headers")
                    .delete()
                    .eq("id", h.id!);
                  if (res.error) throw new Error(res.error.message);
                  setHeaders((prev) =>
                    prev.filter((prevHeader) => prevHeader.id !== h.id),
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
        <div className="mt-6 mb-4 w-full flex flex-row justify-center">
          <button
            className="bg-purple-600 hover:bg-purple-500 text-gray-100 text-xl rounded px-6 py-3"
            onClick={props.nextStep}
          >
            Confirm
          </button>
        </div>
      </div>
      <div className="max-w-7xl px-3 mt-1 text-sm flex flex-row justify-end w-full text-gray-500">
        <div
          className="cursor-pointer hover:text-[#05aadc] hover:underline"
          onClick={props.nextStep}
        >
          Skip this step (not recommended)
        </div>
      </div>
    </div>
  );
}
