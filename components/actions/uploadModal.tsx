import { Dialog } from "@headlessui/react";
import React, { useEffect, useRef } from "react";
import Modal from "../modal";
import { Dashboard as UppyDashboard } from "@uppy/react";
import { useProfile } from "../contextManagers/profile";
import Uppy from "@uppy/core";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import { LoadingSpinner } from "../loadingspinner";

const uppy = new Uppy({
  autoProceed: true,
  allowMultipleUploadBatches: false,
  restrictions: {
    maxNumberOfFiles: 1,
    maxFileSize: 100_000_000,
    allowedFileTypes: ["application/json"],
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

  useEffect(() => {
    if (!profile) return;
    uppy.on("file-added", async (file) => {
      if (isLoading) return;
      setIsLoading(true);
      const text = await file.data.text();
      const res = await fetch("/api/swagger-to-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: profile.org_id,
          swagger: JSON.parse(text),
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
          className="text-2xl font-semibold leading-6 text-gray-100"
        >
          Upload OpenAPI spec
        </Dialog.Title>
        <div className="mt-4">
          <p className="text-sm text-gray-400">
            Upload your OpenAPI spec to generate actions.
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
        {error && `${error.message}. Error messages below.`}
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
