import React, { ChangeEvent, FocusEventHandler } from "react";
import { classNames } from "../lib/utils";

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
          "peer w-full pt-4 pb-1 rounded outline-0",
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
