import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { OrgJoinIsPaid } from "../../lib/types";
import { Session, useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";

type ProfilesRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  organizations: OrgJoinIsPaid | null;
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
    undefined
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
        .select("*, organizations(*, is_paid(*))")
        .single();
      if (error) {
        console.error(error.message);
        await props.supabase.auth.signOut();
        await router.push("/sign-in");
        return;
      }
      setProfile(data);
      return data;
    },
    [session, setProfile, props.supabase]
  );

  useEffect(() => {
    console.log(
      "session or router changed. Will refresh:",
      router.pathname !== pathname,
      session,
      router.pathname,
      pathname
    );
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
