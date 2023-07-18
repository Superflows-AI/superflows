import Link from "next/link";
import Image from "next/image";

export default function ActionsExplanationPage() {
  return (
    <div className="bg-gray-800 h-screen w-screen flex flex-col place-items-center">
      <h1 className="text-4xl text-gray-100 mt-12 mb-3">Actions</h1>
      <p className="text-lg text-gray-200 mb-2 text-center">
        Superflows helps your users by calling your API endpoints.
      </p>
      <p className="text-lg text-gray-200 mb-6 text-center">
        Add the available API endpoints in the dashboard on the <b>actions</b>{" "}
        tab.
      </p>
      {/*<p className="text-lg text-gray-200 mt-6 text-center">*/}
      {/*  Then you can try out the chatbot in the <b>playground</b> tab.*/}
      {/*</p>*/}

      <Link
        href="/actions"
        className="mt-20 px-6 py-3 bg-purple-700 hover:bg-purple-800 rounded text-gray-100 hover:text-gray-50 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none focus:border-0"
      >
        Go to actions tab
      </Link>
    </div>
  );
}
