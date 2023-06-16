import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Action } from "../lib/types";
import { classNames } from "../lib/utils";
import SelectBox from "./selectBox";
import { Api } from "../lib/swaggerTypes";

export default function Playground() {
  const [model, setModel] = useState("GPT4");

  const api = new Api();
  const paths = Object.values(api.api)
    .map((fn) => {
      if (typeof fn === "function") {
        const functionString = fn.toString();
        const pathMatch = functionString.match(/path:\s*["']([^"']*)["']/);
        return pathMatch ? pathMatch[1] : undefined;
      }

      return undefined;
    })
    .filter((path) => path !== undefined);

  return (
    <>
      {/* Left sidebar */}
      <div className="fixed bottom-0 top-16 z-50 flex w-72 flex-col border-t border-gray-700">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="bg-gray-800 flex flex-1 flex-col gap-y-5 overflow-y-auto border-r border-gray-700 px-6 pb-4">
          <div className="mt-6">
            <h1 className="text-xl text-gray-50 pb-2">{"hi"} Actions</h1>
            <div className="flex flex-col overflow-y-auto gap-y-3 px-1 py-2">
              {paths.map((path, idx) => (
                <Card
                  key={idx}
                  active={
                    // !!props.activeActions.find((item) => item === action.name)
                    true
                  }
                  handleStateChange={() => {}}
                  //   if (
                  //     !props.activeActions.find((item) => item === action.name)
                  //   ) {
                  //     props.setActiveActions([
                  //       ...props.activeActions,
                  //       action.name,
                  //     ]);
                  //   } else {
                  //     props.setActiveActions(
                  //       props.activeActions.filter(
                  //         (item) => item !== action.name
                  //       )
                  //     );
                  //   }
                  // }}
                  action={{ name: path }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* <main className="fixed inset-x-72 top-16 bottom-0">
        <PlaygroundChatbot
          pageActions={props.pageActions}
          activeActions={props.activeActions}
          page={page}
          setPage={setPage}
        />
      </main> */}

      {/* Right sidebar */}
      <div className="fixed bottom-0 right-0 top-16 z-50 flex w-72 flex-col border-t border-gray-700">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="bg-gray-800 flex flex-1 flex-col gap-y-5 overflow-y-auto border-l border-gray-700 px-6 pb-4">
          <div className="mt-6">
            <SelectBox
              title="Model"
              options={["GPT3.5", "GPT4"]}
              theme={"dark"}
              selected={model}
              setSelected={setModel}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Card(props: {
  active: boolean;
  handleStateChange: (action: Action) => void;
  action: Action;
}) {
  return (
    <button
      onClick={() => props.handleStateChange(props.action)}
      className={classNames(
        props.active
          ? "border-indigo-700 ring-2 ring-indigo-700"
          : "border-gray-700",
        "relative flex cursor-pointer rounded-lg border p-2.5 shadow-sm focus:outline-none text-left bg-gray-900 hover:bg-gray-950"
      )}
    >
      <div className="flex flex-col w-[99%] max-h-32">
        <span
          className="block text-md font-medium text-gray-200 whitespace-normal"
          style={{ maxWidth: "calc(100% - 2rem)" }}
        >
          {props.action.name}
        </span>
        <span className="mt-1 text-sm text-gray-400 truncate whitespace-pre-wrap">
          {props.action.description}
        </span>
      </div>
      <span className="flex-shrink-0">
        <CheckCircleIcon
          className={classNames(
            !props.active ? "invisible" : "",
            "h-5 w-5 text-indigo-700"
          )}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
