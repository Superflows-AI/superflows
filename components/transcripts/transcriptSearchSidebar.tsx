import { useProfile } from "../contextManagers/profile";
import { useCallback, useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../lib/database.types";
import {
  AdjustmentsHorizontalIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
} from "@heroicons/react/24/outline";
import SelectBoxOptionDropdownWithCheckboxes, {
  SelectBoxWithDropdownOption,
} from "../dropdown";
import { DBChatMessage } from "../../lib/types";
import Link from "next/link";
import { LoadingSpinner } from "../loadingspinner";

type ConversationSidebarItem = Pick<
  Database["public"]["Tables"]["conversations"]["Row"],
  "id" | "created_at" | "is_playground" | "profile_id"
> & {
  chat_messages: Pick<
    DBChatMessage,
    "role" | "content" | "created_at" | "language"
  >[];
  feedback: Pick<
    Database["public"]["Tables"]["feedback"]["Row"],
    "feedback_positive"
  >[];
};

const PAGESIZE = 50;

export default function TranscriptSearchSidebar() {
  const { profile } = useProfile();
  const supabase = useSupabaseClient<Database>();
  const [conversations, setConversations] = useState<ConversationSidebarItem[]>(
    [],
  );
  const [includePlaygroundItems, setIncludePlaygroundItems] = useState<
    SelectBoxWithDropdownOption[]
  >([]);
  const [includeFeedbackItems, setIncludeFeedbackItems] = useState<
    SelectBoxWithDropdownOption[]
  >([]);
  const [totalFiltersSelected, setTotalFiltersSelected] = useState<number>(5);
  const [totalConversations, setTotalConversations] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(true);
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);

  const updateConversations = useCallback(
    async (addMore: boolean = false) => {
      setLoadingMore(true);
      let data: ConversationSidebarItem[] | null = null,
        error,
        count: number | null = null,
        countError;
      // Include no feedback conversations
      const from = addMore ? conversations.length : 0;
      const to = addMore ? conversations.length + PAGESIZE : PAGESIZE;
      if (includeFeedbackItems[0].checked) {
        ({ data, error } = await supabase
          .from("conversations")
          .select(
            "id,is_playground,created_at,profile_id, chat_messages(role,content,created_at,language), feedback(feedback_positive)",
          )
          // Apply playground filters
          .in(
            "is_playground",
            includePlaygroundItems
              .filter((i) => i.checked)
              .map((i) => i.name === "From Playground"),
          )
          .order("created_at", { ascending: false })
          .order("conversation_index", {
            ascending: true,
            foreignTable: "chat_messages",
          })
          .eq("chat_messages.role", "user")
          .range(from, to));
        ({ count, error: countError } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          // Apply playground filters
          .in(
            "is_playground",
            includePlaygroundItems
              .filter((i) => i.checked)
              .map((i) => i.name === "From Playground"),
          ));
      } else {
        ({ data, error } = await supabase
          .from("conversations")
          .select(
            "id,is_playground,created_at,profile_id, chat_messages(role,content,created_at,language), feedback!inner(feedback_positive)",
          )
          // Apply playground filters
          .in(
            "is_playground",
            includePlaygroundItems
              .filter((i) => i.checked)
              .map((i) => i.name === "From Playground"),
          )
          // Apply feedback filters
          .in(
            "feedback.feedback_positive",
            includeFeedbackItems
              .filter((i) => i.checked)
              .map((i) => i.name === "Positive Feedback"),
          )
          .order("created_at", { ascending: false })
          .order("conversation_index", {
            ascending: true,
            foreignTable: "chat_messages",
          })
          .eq("chat_messages.role", "user")
          .range(from, to));
        ({ count, error: countError } = await supabase
          .from("conversations")
          .select("*, feedback!inner(*)", { count: "exact", head: true })
          // Apply playground filters
          .in(
            "is_playground",
            includePlaygroundItems
              .filter((i) => i.checked)
              .map((i) => i.name === "From Playground"),
          )
          // Apply feedback filters
          .in(
            "feedback.feedback_positive",
            includeFeedbackItems
              .filter((i) => i.checked)
              .map((i) => i.name === "Positive Feedback"),
          ));
      }
      if (error) throw new Error(error.message);
      if (data !== null) {
        setConversations((prev) =>
          [
            ...(addMore ? prev : []),
            ...data!.filter(
              (c) =>
                c.chat_messages &&
                c.chat_messages.length > 0 &&
                applyConversationFilters(
                  c,
                  includePlaygroundItems,
                  includeFeedbackItems,
                ),
            ),
          ].sort((a, b) => (b.created_at > a.created_at ? 1 : -1)),
        );
      }
      if (countError) throw new Error(countError.message);
      if (count !== null) setTotalConversations(count);
      setLoadingMore(false);
      setPageLoaded(true);
    },
    [
      conversations,
      setConversations,
      includeFeedbackItems,
      includePlaygroundItems,
    ],
  );

  useEffect(() => {
    if (profile) {
      setIncludePlaygroundItems([
        // TODO: Get from URL state
        {
          id: "1",
          name: "From Playground",
          checked: true,
          onChange: (checked: boolean) =>
            setIncludePlaygroundItems((prev) =>
              prev.map((item) =>
                item.id === "1" ? { ...item, checked } : item,
              ),
            ),
        },
        {
          id: "2",
          name: "From API",
          checked: true,
          onChange: (checked: boolean) =>
            setIncludePlaygroundItems((prev) =>
              prev.map((item) =>
                item.id === "2" ? { ...item, checked } : item,
              ),
            ),
        },
      ]);
      setIncludeFeedbackItems([
        {
          id: "1",
          name: "No Feedback",
          checked: true,
          onChange: (checked: boolean) =>
            setIncludeFeedbackItems((prev) =>
              prev.map((item) =>
                item.id === "1" ? { ...item, checked } : item,
              ),
            ),
        },
        {
          id: "2",
          name: "Positive Feedback",
          checked: true,
          onChange: (checked: boolean) =>
            setIncludeFeedbackItems((prev) =>
              prev.map((item) =>
                item.id === "2" ? { ...item, checked } : item,
              ),
            ),
        },
        {
          id: "3",
          name: "Negative Feedback",
          checked: true,
          onChange: (checked: boolean) =>
            setIncludeFeedbackItems((prev) =>
              prev.map((item) =>
                item.id === "3" ? { ...item, checked } : item,
              ),
            ),
        },
      ]);
    }
  }, [profile]);

  useEffect(() => {
    if (
      profile &&
      includePlaygroundItems.length > 0 &&
      includeFeedbackItems.length > 0
    ) {
      setConversations((prev) =>
        prev.filter((c) =>
          applyConversationFilters(
            c,
            includePlaygroundItems,
            includeFeedbackItems,
          ),
        ),
      );
      const currentFiltersSelected =
        includePlaygroundItems.filter((i) => i.checked).length +
        includeFeedbackItems.filter((i) => i.checked).length;
      console.log(currentFiltersSelected, totalFiltersSelected);
      if (!pageLoaded || currentFiltersSelected > totalFiltersSelected) {
        updateConversations(false);
      }
      setTotalFiltersSelected(currentFiltersSelected);
    }
  }, [includePlaygroundItems, includeFeedbackItems]);

  return (
    <div className="w-120 border-r border-gray-700 h-[calc(100vh-4rem)] flex flex-col">
      <div className="min-h-[calc(100vh-4rem)] relative w-full overflow-y-scroll px-4 flex flex-col">
        <div className="sticky inset-x-0 top-0 bg-gray-800 z-10">
          <div className="rounded-md border border-gray-600 mx-8 mb-6 mt-4">
            <div className="flex flex-row place-items-center gap-x-2 px-3 py-2 text-gray-300 text-xl">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-300" />{" "}
              Filters
            </div>
            <div className="flex flex-row place-items-center gap-x-2 px-3 pb-1.5">
              <SelectBoxOptionDropdownWithCheckboxes
                title={"From Playground"}
                items={includePlaygroundItems}
              />
              <SelectBoxOptionDropdownWithCheckboxes
                title={"Feedback"}
                items={includeFeedbackItems}
              />
            </div>
          </div>
        </div>
        {conversations.map((conversation, idx) => (
          <Link
            key={idx}
            href={`/analytics/${conversation.id}`}
            className="rounded bg-gray-850 border border-gray-600 mb-1.5 py-2 px-4 hover:shadow hover:shadow-gray-500 transition"
          >
            <div className="text-gray-200 font-normal">
              {conversation.chat_messages[0].content}
            </div>
            <div className={"mt-2 flex flex-row justify-between w-full"}>
              <div className="inline text-sm text-gray-400">
                {getMessageCountText(conversation.chat_messages)} •{" "}
                {toDateString(new Date(conversation.created_at))}
              </div>
              <div className="inline">
                {conversation.is_playground && (
                  <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-1 rounded-md">
                    Playground
                  </span>
                )}
                {conversation.feedback && (
                  <FeedbackTags feedback={conversation.feedback} />
                )}
              </div>
            </div>
          </Link>
        ))}
        {pageLoaded && conversations.length === 0 && (
          <div className="text-gray-300 text-center text-sm py-2">
            No conversations match filters
          </div>
        )}
        {conversations.length < totalConversations && !loadingMore && (
          <button
            className="w-full py-2 text-gray-300 text-sm hover:bg-gray-700 mb-2"
            onClick={async () => updateConversations(true)}
          >
            Load more
          </button>
        )}
        {loadingMore && (
          <div className="w-full flex flex-col justify-center place-items-center py-2 text-gray-500 mb-1">
            <LoadingSpinner classes={"h-7 w-7"} />
          </div>
        )}
      </div>
    </div>
  );
}

function getMessageCountText(
  messages: ConversationSidebarItem["chat_messages"],
): string {
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  return `${userMessageCount} user message${userMessageCount > 1 ? "s" : ""}`;
}

function toDateString(date: Date): string {
  return `${date
    .toTimeString()
    .split(":")
    .slice(0, 2)
    .join(":")}, ${date.toLocaleString(navigator.language, {
    day: "numeric",
    month: "short",
    // TODO: Uncomment when 2025
    // year: "2-digit",
  })}`;
}

function FeedbackTags(props: {
  feedback: ConversationSidebarItem["feedback"];
}) {
  const numPositive = props.feedback.filter((f) => f.feedback_positive).length;
  const numNegative = props.feedback.filter((f) => !f.feedback_positive).length;
  return (
    <>
      {numPositive > 0 && (
        <span className="text-xs bg-green-800 text-green-300 px-1.5 py-1 rounded-md flex flex-row gap-x-0.5">
          {numPositive > 1 ? numPositive + " " : ""}{" "}
          <HandThumbUpIcon className={"h-4 w-4"} />
        </span>
      )}
      {numNegative > 0 && (
        <span className="text-xs bg-red-800 text-red-300 px-1.5 py-1 rounded-md flex flex-row gap-x-0.5">
          {numNegative > 1 ? numNegative + " " : ""}{" "}
          <HandThumbDownIcon className={"h-4 w-4"} />
        </span>
      )}
    </>
  );
}

function applyConversationFilters(
  conversation: ConversationSidebarItem,
  includePlaygroundItems: SelectBoxWithDropdownOption[],
  includeFeedbackItems: SelectBoxWithDropdownOption[],
): boolean {
  const validIsPlaygroundValues: boolean[] = [];
  // Playground
  if (includePlaygroundItems[0].checked) {
    validIsPlaygroundValues.push(true);
  }
  // No playground
  if (includePlaygroundItems[1].checked) {
    validIsPlaygroundValues.push(false);
  }
  let matchesFeedbackFilters = false;
  // No feedback
  if (includeFeedbackItems[0].checked) {
    matchesFeedbackFilters = conversation.feedback.length === 0;
  }
  // Positive feedback
  if (includeFeedbackItems[1].checked) {
    matchesFeedbackFilters =
      matchesFeedbackFilters ||
      conversation.feedback.some((f) => f.feedback_positive);
  }
  // Negative feedback
  if (includeFeedbackItems[2].checked) {
    matchesFeedbackFilters =
      matchesFeedbackFilters ||
      conversation.feedback.some((f) => !f.feedback_positive);
  }
  return (
    validIsPlaygroundValues.includes(conversation.is_playground) &&
    matchesFeedbackFilters
  );
}
