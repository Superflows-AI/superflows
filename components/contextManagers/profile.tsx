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
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";

type ProfilesRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  organizations: OrgJoinIsPaid | null;
};

const ProfileContext = createContext<{
  profile: ProfilesRow | null | undefined;
  refreshProfile: () => Promise<void>;
}>({ profile: undefined, refreshProfile: async () => {} });

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

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!session || !props.supabase || !setProfile) return;
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
  }, [session, setProfile, props.supabase]);

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
