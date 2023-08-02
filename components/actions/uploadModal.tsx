import { Dialog } from "@headlessui/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Modal from "../modal";
import { Dashboard as UppyDashboard } from "@uppy/react";
import { useProfile } from "../contextManagers/profile";
import Uppy, { UppyFile } from "@uppy/core";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import { LoadingSpinner } from "../loadingspinner";
import { parse } from "yaml";

var uppy = new Uppy({
  autoProceed: true,
  allowMultipleUploadBatches: false,
  restrictions: {
    maxNumberOfFiles: 1,
    maxFileSize: 100_000_000,
    allowedFileTypes: ["application/json", ".yaml", ".txt"],
  },
});

interface SwaggerParserErrorType {
  instancePath: string;
  keyword: string;
  message: string;
  params: Record<string, any>;
  schemaPath: string;
}

export default function UploadModal(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
  loadActions: () => Promise<void>;
}) {
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<{
    message: string;
    error: Record<string, any>;
  } | null>(null);

  const alreadyRun = useRef<boolean | null>(null);

  useEffect(() => {
    if (!profile || alreadyRun.current) return;
    alreadyRun.current = true;
    uppy = new Uppy({
      autoProceed: true,
      allowMultipleUploadBatches: false,
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: 100_000_000,
        allowedFileTypes: ["application/json", ".yaml", ".txt"],
      },
    });
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
          org_id: profile!.org_id,
          swagger: json,
        }),
      });
      setIsLoading(false);
      const resJson = await res.json();
      if (res.status !== 200) {
        setError(resJson);
        uppy.removeFile(file.id);
        return;
      }
      await props.loadActions();
      props.setOpen(false);
    });
  }, [profile]);

  return (
    <Modal open={props.open} setOpen={props.setOpen} classNames="max-w-2xl">
      <div className="mt-3 text-center sm:mt-5">
        <Dialog.Title
          as="h3"
          className="text-2xl font-semibold leading-6 text-gray-100 flex flex-row gap-x-2 justify-center place-items-center"
        >
          Upload OpenAPI spec
        </Dialog.Title>
        <div className="mt-4">
          <p className="text-sm text-gray-400">
            Upload your OpenAPI spec as{" "}
            <code className="font-mono rounded bg-gray-850 p-0.5">json</code>,{" "}
            <code className="font-mono rounded bg-gray-850 p-0.5">yaml</code> or{" "}
            <code className="font-mono rounded bg-gray-850 p-0.5">txt</code> to
            generate actions.
          </p>
        </div>
      </div>
      <div className="px-6 py-4 flex place-items-center justify-center">
        {!isLoading ? (
          <UppyDashboard
            theme={"dark"}
            width={450}
            height={200}
            uppy={uppy}
            proudlyDisplayPoweredByUppy={false}
            fileManagerSelectionType={"files"}
            note={"JSON only"}
          />
        ) : (
          <div className="w-[450px] h-[200px] flex flex-col text-gray-400 text-sm gap-y-4 justify-center place-items-center rounded-md border-gray-200 border bg-[#1F1F1F]">
            <LoadingSpinner classes={"w-16 h-16 text-gray-400"} />
            Converting to actions...
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
          })}
      </div>
    </Modal>
  );
}
