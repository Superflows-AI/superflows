import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { SuperflowsChat } from "@superflows/chat-ui-react";
import { useEffect, useRef, useState } from "react";
import { classNames } from "../lib/utils";
import { useProfile } from "./contextManagers/profile";
import Toggle from "./toggle";

export default function PlaygroundChatbot(props: {
  userApiKey: string;
  submitErrorMessage: string;
  userDescription: string;
  mockAPIresponses: boolean;
}) {
  const initialFocus = useRef(null);
  const { profile } = useProfile();
  const session = useSession();

  // Ensure we don't send a request to /answers with an expired access_token
  useEffect(() => {
    if (!session) return;
    const handler = setInterval(async () => {
      if (session.expires_in < 60) {
        await supabase.auth.refreshSession(session);
      }
    }, 60000); // checks every minute
    return () => {
      clearInterval(handler);
    };
  }, [session]); // Re-run effect when session changes

  // Get suggestions from past conversations in playground
  const supabase = useSupabaseClient();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      const res = await supabase
        .from("chat_messages")
        .select("*")
        .eq("role", "user")
        // This means it's the first message in a conversation
        .eq("conversation_index", 0)
        .order("created_at", { ascending: false })
        .limit(10);
      if (res.error) throw res.error;
      // Below gets the unique messages and then takes the first 3
      setSuggestions(
        [...new Set(res.data.map((message) => message.content))].slice(0, 3),
      );
    })();
  }, []);

  const [devMode, setDevMode] = useState<boolean>(false);

  return (
    <div className="relative flex w-full h-full flex-1 flex-col bg-gray-50">
      {/* Header */}
      <div
        className={classNames(
          `pt-8 px-3 pb-6`,
          "text-gray-900 border-b-2 border-gray-200 bg-gray-50",
        )}
      >
        <div className="flex flex-row place-items-center justify-center relative">
          <div className="absolute left-2 flex flex-col place-items-center gap-y-1 text-sm font-bold">
            Developer mode
            <Toggle
              sr={"Developer Mode"}
              enabled={devMode}
              setEnabled={setDevMode}
              size={"sm"}
            />
          </div>
          <h1
            className={classNames(
              "ml-4 block text-2xl font-semibold leading-6",
            )}
          >
            {profile?.organizations?.name} AI
          </h1>
        </div>
      </div>
      <div className="flex flex-1 overflow-auto px-8 md:px-10 lg:px-14 xl:px-20">
        <SuperflowsChat
          superflowsApiKey={profile!.organizations!.api_key}
          superflowsUrl={location.origin}
          userApiKey={props.userApiKey}
          userDescription={props.userDescription}
          suggestions={suggestions}
          devMode={devMode}
          mockApiResponses={props.mockAPIresponses}
          initialFocus={initialFocus}
        />
      </div>
      {props.submitErrorMessage && (
        <div className="absolute bottom-0 inset-x-0 py-5 px-8 md:px-14 lg:px-20 bg-red-200 opacity-90 select-none">
          <div className="flex flex-shrink-0 w-full justify-between px-1 pb-4 pt-2">
            <p
              className={classNames(
                "flex flex-row grow gap-x-1 mx-4 text-red-500 place-items-center justify-center rounded-md px-1 py-2 text-little font-medium text-center",
                !props.submitErrorMessage ? "invisible" : "visible",
              )}
            >
              {props.submitErrorMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
