import TranscriptSearchSidebar from "../../components/transcripts/transcriptSearchSidebar";
import Headers from "../../components/headers";
import React from "react";
import { Navbar } from "../../components/navbar";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { pageGetServerSideProps } from "../../components/getServerSideProps";

export default function TranscriptPage() {
  return (
    <div className="min-h-screen bg-gray-800">
      <Headers />
      <Navbar current={"analytics"} />
      <div className={" flex flex-row"}>
        <TranscriptSearchSidebar />
        <div
          className={
            "px-20 min-h-[calc(100vh-4rem)] flex flex-row gap-x-4 text-xl text-gray-300 place-items-center justify-center"
          }
        >
          <ArrowLeftIcon className={"h-12 w-12 text-gray-300"} /> Select a
          conversation to view its transcript
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;
