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

type ProfilesRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  organizations: OrgJoinIsPaid | null;
};

const ProfileContext = createContext<{
  profile: ProfilesRow | null;
  refreshProfile: () => Promise<void>;
}>({ profile: null, refreshProfile: async () => {} });

export function ProfileContextProvider(props: {
  children: JSX.Element;
  supabase: ReturnType<typeof createClient<Database>>;
}) {
  const [profile, setProfile] = useState<ProfilesRow | null>(null);
  const session = useSession();

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!session || !props.supabase || !setProfile) return;
    const { data, error } = await props.supabase
      .from("profiles")
      .select("*, organizations(*, is_paid(*))")
      .single();
    if (error) console.error(error.message);
    setProfile(data);
  }, [session, setProfile, props.supabase]);

  useEffect(() => {
    if (session) refreshProfile();
  }, [session]);

  return (
    <ProfileContext.Provider value={{ profile, refreshProfile }}>
      {props.children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
