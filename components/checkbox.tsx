import React, { ChangeEvent } from "react";

export default function Checkbox(props: {
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  checked: boolean;
  label: string;
}) {
  return (
    <div className="relative flex flex-row place-items-center">
      <div className="mr-2 text-sm">
        <label className="font-medium text-gray-300">{props.label}</label>
        <span className="sr-only">{props.label}</span>
      </div>
      <div className="flex h-6 items-center">
        <input
          id={props.label}
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600 cursor-pointer"
          onChange={props.onChange}
          checked={props.checked}
        />
      </div>
    </div>
  );
}
