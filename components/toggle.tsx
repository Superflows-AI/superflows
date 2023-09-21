import { Switch } from "@headlessui/react";
import classNames from "classnames";

export default function Toggle(props: {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  size: "sm" | "md";
  sr?: string;
}) {
  return (
    <Switch
      checked={props.enabled}
      onChange={props.setEnabled}
      className={classNames(
        props.enabled ? "bg-purple-600" : "bg-gray-300",
        "relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        props.size === "sm" ? "h-5 w-9" : "h-6 w-11",
      )}
    >
      {props.sr && <span className="sr-only">{props.sr}</span>}
      <span
        aria-hidden="true"
        className={classNames(
          props.enabled
            ? props.size === "sm"
              ? "translate-x-4"
              : "translate-x-5"
            : "translate-x-0",
          "pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          props.size === "sm" ? "h-4 w-4" : "h-5 w-5",
        )}
      />
    </Switch>
  );
}
