import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { OrgJoinIsPaidFinetunedModelsFrontend } from "../../lib/types";
import { Session, useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";

type ProfilesRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  organizations: OrgJoinIsPaidFinetunedModelsFrontend | null;
  onboarding_steps: boolean[];
};

const ProfileContext = createContext<{
  profile: ProfilesRow | null | undefined;
  refreshProfile: (localSession?: Session) => Promise<ProfilesRow | undefined>;
}>({
  profile: undefined,
  refreshProfile: async () => {
    return undefined;
  },
});

export function ProfileContextProvider(props: {
  children: JSX.Element;
  supabase: ReturnType<typeof createClient<Database>>;
}) {
  const [profile, setProfile] = useState<ProfilesRow | null | undefined>(
    undefined,
  );
  const [pathname, setPathname] = useState<string | null>(null);
  const session = useSession();
  const router = useRouter();

  const refreshProfile = useCallback(
    async (localSession?: Session): Promise<ProfilesRow | undefined> => {
      localSession = localSession || (session ?? undefined);
      if (!localSession || !props.supabase || !setProfile) return;
      const { data, error } = await props.supabase
        .from("profiles")
        .select("*, organizations(*, is_paid(*), finetuned_models(*))")
        .single();
      if (error) {
        console.error(error.message);
        await props.supabase.auth.signOut();
        await router.push("/sign-in");
        return;
      }
      let newProfile: ProfilesRow | null;

      // Refresh onboarding steps
      if (data?.org_id) {
        // Have actions?
        const { count: actionCount } = await props.supabase
          .from("actions")
          .select("*", { count: "exact", head: true })
          .eq("org_id", data.org_id);
        console.log("action", actionCount);
        // Have API endpoint?
        const { count: apiWithHostSetCount } = await props.supabase
          .from("apis")
          .select("*", { count: "exact", head: true })
          .eq("org_id", data.org_id)
          .neq("api_host", "");
        console.log("api", apiWithHostSetCount);
        // >0 conversations (used playground)
        const { count: conversationsCount } = await props.supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("org_id", data.org_id);
        console.log("conversation", conversationsCount);
        // Usage num queries >0 (used API)
        const { count: usageCount } = await props.supabase
          .from("usage")
          .select("*", { count: "exact", head: true })
          .eq("org_id", data.org_id)
          .gt("num_user_queries", 0);
        console.log("usage", usageCount);

        newProfile = {
          ...data,
          onboarding_steps: [
            (actionCount ?? 0) > 0,
            (apiWithHostSetCount ?? 0) > 0,
            (conversationsCount ?? 0) > 0,
            (usageCount ?? 0) > 0,
          ],
        };
      } else
        newProfile = {
          ...data,
          onboarding_steps: [false, false, false, false],
        };
      setProfile(newProfile);
      return newProfile;
    },
    [session, setProfile, props.supabase],
  );

  useEffect(() => {
    if (session && router.pathname !== pathname) {
      refreshProfile();
      setPathname(router.pathname);
    }
  }, [session, router]);

  return (
    <ProfileContext.Provider value={{ profile, refreshProfile }}>
      {props.children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
