import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";

type ProfilesRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  organizations: Database["public"]["Tables"]["organizations"]["Row"] | null;
};

const ProfileContext = createContext<{
  profile: ProfilesRow | null;
  refreshProfile: null | (() => Promise<void>);
}>({ profile: null, refreshProfile: null });

export function ProfileContextProvider(props: {
  children: JSX.Element;
  supabase: ReturnType<typeof createClient<Database>>;
  disabled: boolean;
}) {
  const [profile, setProfile] = useState<ProfilesRow | null>(null);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (props.disabled) return;
    const { data, error } = await props.supabase
      .from("profiles")
      .select("*, organizations(*)")
      .single();
    if (error) throw Error(error.message);
    console.log("data", data);
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
