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

export default function UploadModal(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
  loadActions: () => Promise<void>;
}) {
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  // This is a hack to prevent the effect from running twice in development
  // It's because React strict mode runs in development, which renders everything
  // twice to check for bugs/side effects
  const didRunEffect = useRef(false);

  useEffect(() => {
    if (!profile || didRunEffect.current) return;
    didRunEffect.current = true;
    uppy.on("file-added", async (file) => {
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
      console.log(resJson);
      if (res.status !== 200) {
        setError(resJson.message);
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
        {error}
      </div>
    </Modal>
  );
}
