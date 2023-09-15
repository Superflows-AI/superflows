import React from "react";
import classNames from "classnames";

export default function ProgressBar(props: { step: number }) {
  return (
    <div className="fixed bottom-5 inset-x-20 md:inset-x-40">
      <h4 className="sr-only">Status</h4>
      <div className="mt-6" aria-hidden="true">
        <div className="overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-purple-600 transition-all ease-in-out duration-1000"
            style={{
              width:
                props.step === 0
                  ? "25%"
                  : props.step === 1
                  ? "50%"
                  : props.step === 2
                  ? "83.4%"
                  : "100%",
            }}
          />
        </div>
        <div className="mt-6 hidden grid-cols-3 font-medium text-gray-600 sm:grid">
          <div className={classNames("text-center text-purple-600")}>
            Sign up
          </div>
          <div
            className={classNames(
              "text-center",
              props.step > 1 && "text-purple-600",
              props.step === 1 && "text-gray-100"
            )}
          >
            Upload API Spec
          </div>
          <div
            className={classNames(
              "text-center",
              props.step > 2 && "text-purple-600",
              props.step === 2 && "text-gray-100"
            )}
          >
            Connect to API
          </div>
        </div>
      </div>
    </div>
  );
}
