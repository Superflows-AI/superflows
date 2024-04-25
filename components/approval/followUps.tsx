import { classNames } from "../../lib/utils";
import { useEffect, useRef, useState } from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import Modal from "../modal";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import { LoadingSpinner } from "../loadingspinner";

export default function FollowUpSuggestions(props: {
  followUpSuggestions: string[];
  onClick: () => void;
}) {
  const containerRef = useRef(null);
  return (
    <button
      ref={containerRef}
      onClick={props.onClick}
      className="group relative border-t flex flex-col w-full pt-1"
    >
      <div className="invisible group-hover:visible bg-white absolute top-0 right-0 p-1 border-l border-b group-active:border-l-gray-300 group-active:border-b-gray-300 shadow">
        <div className="flex gap-x-1 text-left px-2 text-little text-gray-700 group-active:text-gray-800">
          <PencilSquareIcon className="h-5 w-5" />
          Edit
        </div>
      </div>
      <div
        className={classNames(
          "h-full w-full gap-y-1 pt-1 pb-1 mx-1.5 mt-0.5 flex gap-x-1.5",
          // @ts-ignore
          containerRef.current && containerRef.current.offsetWidth > 640
            ? "flex-row flex-wrap"
            : "flex-col",
        )}
      >
        {props.followUpSuggestions.map((text, i) =>
          text ? (
            <div
              key={i}
              className="text-left px-2 py-1 rounded-md shrink-0 border bg-white text-sm text-gray-800 transition shadow"
            >
              {text}
            </div>
          ) : undefined,
        )}
      </div>
    </button>
  );
}

export function EditFollowUpsModal(props: {
  suggestions: string[] | null;
  setSuggestions: (suggestions: string[] | null) => void;
  id: string;
}) {
  const supabase = useSupabaseClient<Database>();
  const [localSuggestionText, setLocalSuggestionText] = useState(
    props.suggestions,
  );
  useEffect(() => {
    setLocalSuggestionText(props.suggestions);
  }, [props.suggestions]);
  return (
    <Modal
      open={Boolean(props.suggestions)}
      setOpen={() => props.setSuggestions(null)}
      classNames={"max-w-3xl"}
    >
      <div className="w-full flex-col mb-4">
        <h1 className="text-xl text-gray-300">Edit Suggested Follow-Ups</h1>
        <p className="text-sm text-gray-400">
          Don&apos;t include names, IDs or other data that is specific to some
          customers, but won&apos;t be relevant to others.
        </p>
      </div>
      {localSuggestionText ? (
        <div className="flex flex-col gap-y-2">
          {localSuggestionText.map((s, idx) => {
            return (
              <div key={idx} className="flex flex-row gap-x-2">
                <input
                  className="w-full flex-1"
                  value={s}
                  onChange={(e) => {
                    const newSuggestions = localSuggestionText.map(
                      (s, secondIdx) => {
                        if (secondIdx === idx) {
                          return e.target.value;
                        }
                        return s;
                      },
                    );
                    setLocalSuggestionText(newSuggestions);
                  }}
                />
              </div>
            );
          })}
          <div className={"flex flex-row justify-end gap-x-2 mt-2"}>
            <button
              className={"bg-gray-500 rounded px-2 py-1 text-gray-50"}
              onClick={() => props.setSuggestions(null)}
            >
              Cancel
            </button>
            <button
              className="bg-green-600 rounded px-2 py-1 text-gray-50"
              onClick={async () => {
                const { error } = await supabase
                  .from("approval_answer_messages")
                  .update({
                    raw_text: localSuggestionText
                      .map((t, i) => `- ${t}`)
                      .join("\n"),
                  })
                  .match({ id: props.id });
                if (error) throw new Error(error.message);
                props.setSuggestions(localSuggestionText);
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center place-items-center">
          <LoadingSpinner classes={"h-12 w-12 text-gray-400"} />
        </div>
      )}
    </Modal>
  );
}
