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
  disabled: boolean;
}) {
  const [profile, setProfile] = useState<ProfilesRow | null | undefined>(
    undefined
  );

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (props.disabled || !props.supabase || !setProfile) return;
    const { data, error } = await props.supabase
      .from("profiles")
      .select("*, organizations(*, is_paid(*))")
      .single();
    if (error) console.error(error.message);
    setProfile(data);
  }, [props.disabled, setProfile, props.supabase]);

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, refreshProfile }}>
      {props.children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
