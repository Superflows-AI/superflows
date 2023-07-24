import { CheckBadgeIcon } from "@heroicons/react/24/outline";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";

const features = ["Requires OpenAPI spec", "", ""];
export default function DefaultOrCustom(props: {
  setUsePreset: (use: boolean) => void;
  nextStep: () => void;
}) {
  return (
    <div className="h-screen grid grid-cols-4 ">
      <div className="col-span-2 bg-gray-800 flex flex-col justify-center sm:px-6 lg:px-8 shadow-lg shadow-gray-700 z-20">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg flex flex-col place-items-center">
          <div className="mt-4">
            <h1 className="mb-4 text-center text-gray-50 font-semibold text-2xl sm:text-3xl md:text-4xl">
              Quickstart
            </h1>
            {/*<p className="text-center text-lg sm:text-xl md:text-xl text-gray-200 mb-10">*/}
            {/*  Try Superflows now with preset config.*/}
            {/*</p>*/}
            <p className="mt-1 text-center text-base sm:text-lg text-gray-300 max-w-md">
              Best if you want to try out Superflows quickly or don&apos;t have
              an OpenAPI specification to hand.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="flex justify-center sm:rounded-lg sm:px-10">
            <button
              className="text-lg bg-purple-500 hover:bg-purple-600 text-gray-100 hover:text-gray-50 focus:ring-2 focus:ring-purple-600 ring-offset-2 rounded py-3 w-60"
              onClick={() => {
                props.setUsePreset(true);
                props.nextStep();
              }}
            >
              Get started
            </button>
          </div>
          <div className="flex flex-row w-full justify-center">
            <p className="mt-3 text-center text-little sm:text-base text-gray-400 max-w-md">
              You can always configure your own API later.
            </p>
          </div>
        </div>
      </div>
      <div className="col-span-2 bg-gray-300 flex flex-col justify-center sm:px-6 lg:px-14">
        <div className="bg-white rounded-lg shadow-md min-w-full border px-6 py-8 sm:py-10">
          <div className="flex flex-row justify-center text-2xl md:text-3xl font-semibold text-gray-900">
            Configure your own API
          </div>
          <div className="flex flex-col gap-y-4 place-items-center">
            <p className="mt-5 text-center text-sm sm:text-lg text-gray-600 max-w-md">
              Ideal if you have your OpenAPI specification and want to see how
              it performs on your API.
            </p>
            {/*{features.map((featureDescription, idx) => (*/}
            {/*  <div key={idx} className="flex flex-row gap-x-3">*/}
            {/*    <CheckBadgeIcon*/}
            {/*      className="shrink-0 h-7 w-7 text-emerald-400"*/}
            {/*      aria-hidden="true"*/}
            {/*    />*/}
            {/*    <p className="text-base">{featureDescription}</p>*/}
            {/*  </div>*/}
            {/*))}*/}
          </div>
          <div className="mt-8 flex flex-row justify-center">
            <button
              className="text-lg bg-purple-500 hover:bg-purple-600 text-gray-100 hover:text-gray-50 focus:ring-2 focus:ring-purple-600 ring-offset-2 rounded py-3 w-60"
              onClick={() => {
                props.setUsePreset(false);
                props.nextStep();
              }}
            >
              Create your project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
