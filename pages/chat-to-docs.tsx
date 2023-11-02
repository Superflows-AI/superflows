import {
  SupabaseClient,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import React, { useEffect, useRef, useState } from "react";
import { useProfile } from "../components/contextManagers/profile";
import { pageGetServerSideProps } from "../components/getServerSideProps";
import Headers from "../components/headers";
import { Navbar } from "../components/navbar";
import Toggle from "../components/toggle";
import { Database } from "../lib/database.types";
import { PlusIcon } from "@heroicons/react/24/outline";
import Modal from "../components/modal";
import FloatingLabelInput, {
  FloatingLabelTextArea,
} from "../components/floatingLabelInput";
import { classNames } from "../lib/utils";
import { embedText } from "../lib/embed-docs/embedText";
import { LoadingSpinner } from "../components/loadingspinner";
import { DocChunk } from "../lib/types";
import PaginationPageSelector from "../components/paginationPageSelector";
import { set } from "zod";
import WarningModal from "../components/warningModal";
import { PostgrestError } from "@supabase/supabase-js";
import useDocumentsLoader from "../lib/hooks/useDocumentsLoader";

export default function App() {
  return (
    <>
      <Headers />
      <Dashboard />
    </>
  );
}

function Dashboard() {
  const { profile } = useProfile();
  if (
    process.env.NODE_ENV === "development" ||
    profile?.organizations?.is_paid[0]?.is_premium
  ) {
    return <ChatToDocsPage />;
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Navbar current={"Chat to Docs"} />
      <main className="flex flex-col items-center justify-start py-20 flex-1 px-20 text-center bg-gray-800 w-screen h-screen">
        <div className="bg-gray-850 rounded-md px-20 lg:px-40 py-10">
          <h1 className="text-4xl text-gray-200 font-medium">
            Upgrade to use Chat to Docs
          </h1>
          <h2 className="text-xl text-gray-400 font-medium mt-2">
            Chat to Docs allows Superflows to refer to your documentation to
            answer user questions
          </h2>
          <p className="mt-4 text-xl text-gray-400">
            View{" "}
            <a
              href="https://superflows.ai/pricing"
              className="text-blue-600 hover:underline"
            >
              pricing page
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

function ChatToDocsPage() {
  const supabase = useSupabaseClient<Database>();
  const { profile } = useProfile();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [addDocsModal, setAddDocsModal] = useState<{
    isOpen: boolean;
    documentToEdit?: Document;
  }>({ isOpen: false });

  const {
    PAGE_SIZE,
    allDocumentCount,
    docPage,
    setDocPage,
    docs,
    setDocs,
    fetchAllSectionCount,
    deleteDocument,
  } = useDocumentsLoader(supabase);

  const orgHasDocs = allDocumentCount > 0;

  useEffect(() => {
    (async () => {
      await fetchAllSectionCount();
      const { data: data2 } = await supabase
        .from("organizations")
        .select("chat_to_docs_enabled")
        .eq("id", profile?.organizations?.id!)
        .single();

      if (data2) setEnabled(data2.chat_to_docs_enabled);
    })();
  }, [profile, supabase]);

  useEffect(() => {
    (async () => {
      if (enabled === null) return;
      const { error } = await supabase
        .from("organizations")
        .update({ chat_to_docs_enabled: enabled })
        .eq("id", profile?.organizations?.id!);
      if (error) throw new Error(error.message);
    })();
  }, [enabled, profile, supabase]);

  return (
    <div className="min-h-screen bg-gray-800">
      <AddDocsModal
        open={addDocsModal.isOpen}
        setOpen={(open) => {
          if (!open) {
            setAddDocsModal((currentValue) => {
              return { ...currentValue, isOpen: false };
            });
          }
        }}
        editMode={
          addDocsModal.documentToEdit
            ? {
                editedDocument: addDocsModal.documentToEdit,
                deleteDocument: deleteDocument,
              }
            : undefined
        }
      />
      <Navbar current={"Chat to Docs"} />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col gap-y-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 bg-gray-850 rounded-md px-6 py-4">
          <h1 className="text-xl text-gray-100">Chat to Docs</h1>
          <p className="text-gray-400 mt-2">
            Upload your documentation so that the AI can refer to it when
            answering user questions
          </p>
          <div className="w-full h-px my-6 bg-gray-700" />
          {orgHasDocs ? (
            <div className="flex flex-col mt-4">
              <div className="flex flex-row place-items-center gap-x-4">
                <h2 className="text-lg text-gray-200 ">Enable Chat to Docs</h2>
                <Toggle
                  enabled={enabled || false}
                  setEnabled={setEnabled}
                  size="md"
                />
              </div>
              <div className="w-full h-px my-6 bg-gray-700" />
              <div className="flex flex-col">
                <div className="flex flex-row justify-between">
                  <h2 className="text-lg text-gray-200 ">Documentation</h2>
                  <button
                    className={classNames(
                      "text-gray-100 flex flex-row place-items-center gap-x-1 rounded px-3 py-1.5",
                      enabled
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-gray-700 cursor-not-allowed",
                    )}
                    onClick={() => {
                      if (!enabled) return;
                      setAddDocsModal({ isOpen: true });
                    }}
                  >
                    <PlusIcon className="w-5 h-5" /> Add
                  </button>
                </div>
              </div>
              {allDocumentCount > 0 && (
                <>
                  <div className="w-full h-px my-6 bg-gray-700" />
                  <DocumentList
                    docPage={docPage}
                    setDocPage={setDocPage}
                    isLastPage={PAGE_SIZE * docPage >= allDocumentCount}
                    allDocumentCount={allDocumentCount}
                    docs={docs}
                    setDocs={setDocs}
                    supabase={supabase}
                    orgId={profile?.organizations?.id!}
                    editDocument={(document) => {
                      setAddDocsModal({
                        isOpen: true,
                        documentToEdit: document,
                      });
                    }}
                    deleteDocument={deleteDocument}
                  ></DocumentList>
                </>
              )}
            </div>
          ) : (
            <h2 className="text-lg text-gray-500 mt-8">
              To upload your organization&apos;s docs, please reach out to
              henry@superflows.ai
            </h2>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = pageGetServerSideProps;

type Document = {
  docChunks: DocChunk[];
  pageName: string | null;
  sectionName: string | null;
  url: string | null;
};

function DocumentList(props: {
  docPage: number;
  setDocPage: React.Dispatch<React.SetStateAction<number>>;
  isLastPage: boolean;
  allDocumentCount: number;
  docs: Document[];
  setDocs: React.Dispatch<React.SetStateAction<Document[]>>;
  supabase: SupabaseClient<Database>;
  orgId: number;
  editDocument: (document: Document) => void;
  deleteDocument: (document: Document) => Promise<PostgrestError | null>;
}) {
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );

  const setDeleteDocumentModalOpen = (isOpen: boolean) => {
    if (!isOpen) {
      setDocumentToDelete(null);
    }
  };

  const deleteDocument = async (document: Document) => {
    const error = await props.deleteDocument(document);
    if (error) {
      console.error(error);
    } else {
      console.log(">>>>>>>>>>>>>>>");
      props.setDocs((currentDocs) => {
        return currentDocs.filter(
          (doc) => doc.docChunks[0].id !== document.docChunks[0].id,
        );
      });
    }
    setDocumentToDelete(null);
  };

  return (
    <>
      <WarningModal
        title={"Delete document?"}
        description={"Are you sure you want to delete this document?"}
        action={async () => {
          if (documentToDelete) {
            await deleteDocument(documentToDelete);
          }
        }}
        actionColour={"red"}
        actionName={"Delete"}
        open={documentToDelete !== null}
        setOpen={setDeleteDocumentModalOpen}
      />

      <div className="flex flex-col gap-y-3">
        <div className="flex w-full gap-x-10">
          <h3 className="text-lg text-gray-200 flex-1">Page Name</h3>
          <h3 className="text-lg text-gray-200 w-32">Section Name </h3>
          <h3 className="text-lg text-gray-200 flex-1">URL</h3>
          <h3 className="text-lg text-gray-200 w-16">Edit</h3>
          <h3 className="text-lg text-gray-200 w-16">Delete</h3>
        </div>
        <div className="w-full h-px my-6 bg-gray-400 -mt-2 -mb-1" />
        {props.docs.map((doc) => {
          return (
            <div key={doc.docChunks?.[0].id} className="flex w-full gap-x-10">
              <h3 className="text-base text-gray-400 flex-1 truncate">
                {doc.pageName}
              </h3>
              <h3 className="text-base text-gray-400 w-32 truncate">
                {doc.sectionName}
              </h3>
              <h3 className="text-base text-gray-400 flex-1 truncate">
                {doc.url}
              </h3>
              <button
                onClick={props.editDocument.bind(null, doc)}
                className="font-mono rounded font-bold bg-blue-700 text-gray-100 text-sm px-1.5 py-1 h-fit w-16"
              >
                Edit
              </button>

              <button
                onClick={setDocumentToDelete.bind(null, doc)}
                className="font-mono rounded font-bold bg-red-700 text-gray-100 text-sm px-1.5 py-1 h-fit w-16"
              >
                Delete
              </button>
            </div>
          );
        })}
        <PaginationPageSelector
          showPrevious={props.docPage > 1}
          showNext={!props.isLastPage}
          page={props.docPage}
          clickedPrevious={() => {
            props.setDocPage((currentPage) =>
              currentPage === 1 ? currentPage : currentPage - 1,
            );
          }}
          clickedNext={() => {
            if (props.isLastPage) return;
            props.setDocPage((currentPage) => currentPage + 1);
          }}
        ></PaginationPageSelector>
      </div>
    </>
  );
}

function AddDocsModal(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
  editMode?: {
    editedDocument: Document;
    deleteDocument: (document: Document) => Promise<PostgrestError | null>;
  };
}) {
  const ref = useRef(null);
  const { profile } = useProfile();
  const [title, setTitle] = useState<string>("");
  const [sectionName, setSectionName] = useState<string>("");
  const [docsText, setDocsText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!props.open) return;
    const docText = props.editMode?.editedDocument.docChunks
      .flatMap((docChunk) => docChunk.text_chunks)
      ?.join("");

    setTitle(props.editMode?.editedDocument.pageName || "");
    setSectionName(props.editMode?.editedDocument.sectionName || "");
    setDocsText(docText || "");
    setLoading(false);
  }, [props.open, props.editMode]);

  const isEditingScrapedDocument = !!props.editMode?.editedDocument.url;
  let titlePlaceholder = isEditingScrapedDocument
    ? "Page Name"
    : "Title (optional)";

  return (
    <Modal
      open={props.open}
      setOpen={props.setOpen}
      classNames="max-w-5xl"
      initialFocus={ref}
    >
      <h1 className="text-2xl text-gray-100">
        {props.editMode ? "Edit Document" : "Add Documentation"}
      </h1>
      {!props.editMode && (
        <p className="text-gray-400 mt-2">
          Upload your documentation so that the AI can refer to it when
          answering user questions
        </p>
      )}
      <div className="w-full h-px my-4 bg-gray-700" />
      <div className="flex flex-col">
        <div className="flex mb-3 gap-x-3">
          <div className="flex-1">
            <FloatingLabelInput
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              label={titlePlaceholder}
            />
          </div>
          <div className="flex-1">
            {isEditingScrapedDocument && (
              <FloatingLabelInput
                value={sectionName}
                onChange={(e) => {
                  setSectionName(e.target.value);
                }}
                label={"Section Name"}
              />
            )}
          </div>
        </div>
        <FloatingLabelTextArea
          ref={ref}
          content={docsText}
          onChange={(e) => {
            setDocsText(e.target.value);
          }}
          labelText={"Docs text"}
          minHeight={150}
        />
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
          <button
            className={classNames(
              "inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none  sm:order-3  sm:text-sm",
              docsText
                ? "bg-purple-700 hover:bg-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 focus:ring-offset-gray-800"
                : "bg-gray-400 cursor-not-allowed",
            )}
            onClick={async (event) => {
              const body: {
                org_id: number | null | undefined;
                docsText: string;
                title: string;
                sectionName?: string;
                url?: string;
                createdAt?: string;
              } = {
                org_id: profile?.org_id,
                docsText,
                title,
              };
              if (props.editMode) {
                body.sectionName = sectionName;
                body.url = props.editMode.editedDocument.url || undefined;
                body.createdAt =
                  props.editMode.editedDocument.docChunks[0].created_at ||
                  undefined;
                await props.editMode.deleteDocument(
                  props.editMode.editedDocument,
                );
                // todo: after creating new docs, refresh the page
              }

              if (!docsText) return;
              setLoading(true);
              props.setOpen(false);
              const res = await fetch("/api/embed-text", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
              });
              const { error } = await res.json();
              if (error) console.error(error.message);
            }}
          >
            {loading ? <LoadingSpinner classes={"h-5 w-5"} /> : "Save"}
          </button>
          <button
            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800 sm:mt-0 sm:text-sm"
            onClick={() => props.setOpen(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
