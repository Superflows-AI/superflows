import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Dashboard as UppyDashboard } from "@uppy/react";
import { LoadingSpinner } from "../loadingspinner";
import { useProfile } from "../contextManagers/profile";
import Uppy, { UppyFile } from "@uppy/core";
import { parse } from "yaml";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import { Action, Api } from "../../lib/types";
import "@uppy/dashboard/dist/style.css";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

interface SwaggerParserErrorType {
  instancePath: string;
  keyword: string;
  message: string;
  params: Record<string, any>;
  schemaPath: string;
}

export default function UploadSpec(props: {
  nextStep: () => void;
  orgId: number | null;
  setApi: Dispatch<SetStateAction<Api | null>>;
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<{
    message: string;
    error: Record<string, any>;
  } | null>(null);
  const [actions, setActions] = useState<Action[]>([]);

  const uppy = new Uppy({
    autoProceed: true,
    allowMultipleUploadBatches: false,
    restrictions: {
      maxNumberOfFiles: 1,
      maxFileSize: 100_000_000,
      allowedFileTypes: ["application/json", ".yaml", ".txt"],
    },
  });
  // (async () => {
  //   const actionRes = await supabase
  //     .from("actions")
  //     .select("*")
  //     .eq("org_id", props.orgId);
  //   if (actionRes.error) throw new Error(actionRes.error.message);
  //   setActions(actionRes.data);
  // })();
  uppy.on("file-added", async (file: UppyFile) => {
    if (isLoading) return;
    setError(null);
    setIsLoading(true);
    const text = await file.data.text();
    let json: Record<string, any>;
    try {
      // First, try JSON
      json = JSON.parse(text);
    } catch (e) {
      try {
        // Try yaml
        json = parse(text);
      } catch (e) {
        setError({
          message:
            "Uploaded file contents has invalid format: must be JSON or YAML",
          error: {},
        });
        setIsLoading(false);
        uppy.removeFile(file.id);
        return;
      }
    }

    const res = await fetch("/api/swagger-to-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        org_id: props.orgId,
        swagger: json,
      }),
    });
    console.log("props.orgId", props.orgId);
    const updateOrgResp = await supabase
      .from("organizations")
      .update({
        name: json.info?.title,
        description: json.info?.description,
      })
      .eq("id", props.orgId);
    if (updateOrgResp.error) throw new Error(updateOrgResp.error.message);

    setIsLoading(false);
    const resJson = await res.json();
    if (res.status !== 200) {
      setError(resJson);
      uppy.removeFile(file.id);
      return;
    }
    const apiResp = await supabase
      .from("apis")
      .select("*")
      .eq("org_id", props.orgId);
    if (apiResp.error) throw new Error(apiResp.error.message);
    props.setApi(apiResp.data[0]);
    const actionRes = await supabase
      .from("actions")
      .select("*")
      .eq("api_id", apiResp.data[0].id);
    if (actionRes.error) throw new Error(actionRes.error.message);
    setActions(actionRes.data);
    setTimeout(props.nextStep, 1500);
  });

  return (
    <div className="h-screen bg-gray-850 flex flex-col justify-center  place-items-center sm:px-6 lg:px-14">
      <div className="bg-gray-800 rounded-lg shadow-md w-full max-w-xl border px-6 py-8 sm:py-10 md:px-12">
        <div className="flex flex-row justify-center text-2xl md:text-3xl font-semibold text-gray-200">
          Upload your API spec
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-400 text-center">
            <code className="font-mono rounded bg-gray-850 p-0.5">json</code>,{" "}
            <code className="font-mono rounded bg-gray-850 p-0.5">yaml</code> or{" "}
            <code className="font-mono rounded bg-gray-850 p-0.5">txt</code> are
            all accepted formats.
          </p>
        </div>
        <div className="px-6 py-4 flex place-items-center justify-center">
          {actions.length === 0 ? (
            !isLoading ? (
              <UppyDashboard
                theme={"dark"}
                width={450}
                height={200}
                uppy={uppy}
                proudlyDisplayPoweredByUppy={false}
                fileManagerSelectionType={"files"}
                note={"JSON, yaml & txt only"}
              />
            ) : (
              <div className="w-[450px] h-[200px] flex flex-col text-gray-400 text-sm gap-y-4 justify-center place-items-center rounded-md border-gray-200 border bg-[#1F1F1F]">
                <LoadingSpinner classes={"w-16 h-16 text-gray-400"} />
                Converting to actions...
              </div>
            )
          ) : (
            <div className="w-[450px] h-[200px] overflow-hidden py-4 px-6 rounded-md border-gray-200 border bg-[#1F1F1F]">
              <div className="flex flex-row gap-x-2 mb-1 text-gray-300">
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                <h2 className="text-xl">
                  {actions.length} API endpoints added!
                </h2>
              </div>
              <div className="flex flex-col overflow-hidden gap-y-2 place-items-start text-sm">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="font-mono text-gray-400 py-1 px-3 bg-gray-800 rounded border border-purple-600"
                  >
                    {action.request_method?.toUpperCase()} {action.path}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="py-3 h-6 text-base text-red-500 flex place-items-center justify-center">
          {error ? (
            `${error.message}.${
              error.error && Object.keys(error.error).length > 0
                ? " Error messages below."
                : ""
            }`
          ) : (
            <div className="text-gray-300 text-little">
              Don&apos;t have an OpenAPI spec?{" "}
              <a
                className="no-underline hover:underline text-[#05aadc] cursor-pointer"
                href="https://swagger.io/tools/open-source/getting-started/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Find out more here
              </a>
              .
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-col max-h-60 bg-red-200 rounded overflow-y-auto">
          {error &&
            (Object.entries(error.error).filter(
              ([key, _]) => !isNaN(Number(key))
            ).length > 0 ? (
              Object.entries(error.error).map(([key, value]) => {
                if (isNaN(Number(key))) return;
                const errorEle = value as SwaggerParserErrorType;
                return (
                  <div
                    key={key}
                    className="py-3 px-4 border-b border-red-700 bg-red-200 text-base text-red-500 flex flex-col"
                  >
                    <div className="font-mono text-xs text-gray-500 break-words">
                      {errorEle.instancePath}
                    </div>
                    <div className="text-red-600">{errorEle.message}</div>
                    <div className="text-red-400 text-sm">
                      {JSON.stringify(errorEle.params, undefined, 2)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-3 px-4 border-b border-red-700 bg-red-200 text-base text-red-500 flex flex-col">
                <div className="font-mono text-xs text-gray-500 break-words">
                  {error.error.name}
                </div>
                <div className="text-red-600">{error.error.message}</div>
              </div>
            ))}
        </div>
        {error && (
          <div className="mt-3 rounded bg-gray-600 px-3 py-2 text-gray-200">
            Tip: If the error is not clear, try validating your OpenAPI spec
            with{" "}
            <a
              className="no-underline hover:underline text-[#05aadc] cursor-pointer"
              href="https://editor.swagger.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Swagger Editor
            </a>{" "}
            or{" "}
            <a
              className="no-underline hover:underline text-[#05aadc] cursor-pointer"
              href="https://docs.superflows.ai/docs/connecting-your-api/api-spec-requirements"
              target="_blank"
              rel="noopener noreferrer"
            >
              check our docs
            </a>{" "}
            to see the requirements for an OpenAPI spec.
          </div>
        )}
      </div>
      <div className="max-w-xl px-3 mt-1 text-sm flex flex-row justify-end w-full text-gray-500">
        <div
          className="cursor-pointer hover:text-[#05aadc] hover:underline"
          onClick={() => {
            (async () => {
              const res = await supabase
                .from("apis")
                .insert({ org_id: props.orgId! });
              if (res.error) throw new Error(res.error.message);
              props.nextStep();
            })();
          }}
        >
          Skip this step (not recommended)
        </div>
      </div>
    </div>
  );
}
