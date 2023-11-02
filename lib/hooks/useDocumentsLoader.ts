import { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Database } from "../database.types";
import { DocChunk } from "../types";

export type Document = {
  docChunks: DocChunk[];
  pageName: string;
  sectionName: string;
  createdAt: string;
  url: string;
};

export default function useDocumentsLoader(supabase: SupabaseClient<Database>) {
  const PAGE_SIZE = 10;

  const [allDocumentCount, setAllDocumentCount] = useState(0);
  const [docPage, setDocPage] = useState<number>(1);
  const [docs, setDocs] = useState<Document[]>([]);

  const fetchAllSectionCount = async () => {
    const { data } = await supabase.rpc("get_all_page_section_counts");
    if (data) {
      setAllDocumentCount(data);
    }
  };

  const deleteDocument = async (document: Document) => {
    const documentChunkIds = document.docChunks.map((docChunk) =>
      docChunk.id.toString(),
    );

    const { error } = await supabase
      .from("doc_chunks")
      .delete()
      .in("id", documentChunkIds);

    return error;
  };

  const fetchPage = async (page: number) => {
    const { data: documents, error } = await supabase.rpc("get_sections", {
      _limit: PAGE_SIZE,
      _offset: (page - 1) * PAGE_SIZE,
    });

    if (error) {
      console.error(error);
      return;
    }

    if (!documents?.length) return;

    const newDocuments: Document[] = [];

    for (const document of documents) {
      try {
        const documentRowIds = document.ids.split(",");
        const { data: documentChunks } = await supabase
          .from("doc_chunks")
          .select("*")
          .in("id", documentRowIds);

        if (documentChunks?.length) {
          newDocuments.push({
            docChunks: documentChunks,
            pageName: document.result_page_title,
            sectionName: document.result_section_title,
            createdAt: document.latest_created_at,
            url: document.result_page_url,
          });
        }
      } catch (error) {
        console.error(error);
      }
    }

    setDocs(newDocuments);
  };

  const refreshPage = async () => {
    await fetchPage(docPage);
  };

  useEffect(() => {
    fetchPage(docPage);
  }, [docPage]);

  return {
    PAGE_SIZE,
    allDocumentCount,
    docPage,
    setDocPage,
    docs,
    setDocs,
    fetchAllSectionCount,
    deleteDocument,
    refreshPage,
  };
}
