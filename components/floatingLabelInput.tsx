import React, { ChangeEvent, FocusEventHandler } from "react";
import { classNames } from "../lib/utils";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { AutoGrowingTextArea } from "./autoGrowingTextarea";

export default function FloatingLabelInput(props: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: string;
  className?: string;
  floatingClassName?: string;
  onBlur?: FocusEventHandler;
}) {
  return (
    <div className="relative">
      <input
        className={classNames(
          "peer w-full pt-4 pb-1 rounded outline-0  border-gray-200 focus:border-purple-600 focus:ring-purple-600",
          props.className || "",
        )}
        placeholder=""
        value={props.value}
        onChange={(e) => props.onChange(e)}
        onBlur={(e) => (props.onBlur ? props.onBlur(e) : null)}
      />
      <div
        className={classNames(
          props.floatingClassName || "",
          "absolute pointer-events-none text-gray-400 left-4 top-3 peer-focus:scale-75 peer-focus:-translate-y-5/8 select-none transition duration-300",
          props.value
            ? "-translate-x-1/8 -translate-y-5/8 scale-75"
            : "peer-focus:-translate-x-1/8",
        )}
      >
        {props.label}
      </div>
    </div>
  );
}

export function FloatingLabelTextArea(props: {
  content: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  labelText: string;
  helpTooltipText?: string;
  maxStringLength?: number;
  minHeight?: number;
  ref?: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <div className="w-full relative">
      <AutoGrowingTextArea
        className="w-full bg-gray-50 peer resize-none overflow-y-auto text-gray-800 pl-4 pr-10 pt-4 pb-2 rounded border-gray-200 focus:border-purple-600 focus:ring-purple-600 whitespace-pre-line outline-0"
        ref={props.ref}
        placeholder={""}
        value={props.content}
        onChange={props.onChange}
        minHeight={props.minHeight}
      />
      {props.maxStringLength &&
        props.content &&
        props.content.length - props.maxStringLength > 50 && (
          <div
            className={classNames(
              "absolute bottom-2 text-xs right-3 z-10",
              props.content.length - props.maxStringLength >= 10
                ? "text-red-500"
                : "text-gray-500",
            )}
          >
            {props.content.length}/{props.maxStringLength}
          </div>
        )}
      {props.helpTooltipText && (
        <div className="absolute top-3 right-3">
          <QuestionMarkCircleIcon className="peer h-6 w-6 text-gray-400 hover:text-gray-500 transition rounded-full" />
          <div className={classNames("right-0 -top-20 w-64 popup")}>
            {props.helpTooltipText}
          </div>
        </div>
      )}
      <div
        className={classNames(
          "absolute pointer-events-none left-4 top-3 peer-focus:scale-75 peer-focus:-translate-y-5/8 text-gray-400 select-none transition duration-300",
          props.content
            ? "-translate-x-1/8 -translate-y-5/8 scale-75"
            : "peer-focus:-translate-x-1/8",
        )}
      >
        {props.labelText}
      </div>
    </div>
  );
}
