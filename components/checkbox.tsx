import React from "react";

export default function Checkbox(props: {
  onChange: (checked: boolean) => void;
  checked: boolean;
  label: string;
}) {
  return (
    <div
      className="relative flex flex-row place-items-center cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        props.onChange(!props.checked);
      }}
    >
      <div className="mr-2 text-sm">
        {props.label && (
          <>
            <label className="font-medium text-gray-300 cursor-pointer select-none">
              {props.label}
            </label>
            <span className="sr-only">{props.label}</span>
          </>
        )}
      </div>
      <div className="flex h-6 items-center">
        <input
          id={props.label}
          type="checkbox"
          className="h-4.5 w-4.5 rounded border-gray-300 text-purple-700 focus:ring-purple-600 cursor-pointer"
          onChange={(e) => props.onChange(e.target.checked)}
          checked={props.checked}
        />
      </div>
    </div>
  );
}
