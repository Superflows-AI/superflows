import TranscriptSearchSidebar from "../../components/transcripts/transcriptSearchSidebar";
import Headers from "../../components/headers";
import React from "react";
import { Navbar } from "../../components/navbar";

export default function TranscriptPage() {
  return (
    <div className="min-h-screen bg-gray-800">
      <Headers />
      <Navbar current={"analytics"} />
      <TranscriptSearchSidebar />
    </div>
  );
}
