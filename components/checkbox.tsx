import React from "react";
import classNames from "classnames";

export default function Checkbox(props: {
  onChange: (checked: boolean) => void;
  checked: boolean;
  label: string;
  size?: "sm" | "lg";
}) {
  const size = props.size ?? "sm";
  return (
    <div
      className="relative flex flex-row place-items-center cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        props.onChange(!props.checked);
      }}
    >
      <div
        className={classNames(
          "mr-2",
          size === "sm" ? "text-xs md:text-sm" : "text-base md:text-lg",
        )}
      >
        {props.label && (
          <>
            <label className="font-medium text-gray-300 cursor-pointer select-none">
              {props.label}
            </label>
            <span className="sr-only">{props.label}</span>
          </>
        )}
      </div>
      <div
        className={classNames(
          "flex items-center",
          size === "sm" ? "h-6" : "h-10",
        )}
      >
        <input
          id={props.label}
          type="checkbox"
          className={classNames(
            "rounded border-gray-300 text-purple-700 focus:ring-purple-600 cursor-pointer",
            size === "sm" ? "h-4.5 w-4.5" : "h-6 w-6",
          )}
          onChange={(e) => props.onChange(e.target.checked)}
          checked={props.checked}
        />
      </div>
    </div>
  );
}
