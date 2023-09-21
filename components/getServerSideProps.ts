import { GetServerSidePropsContext } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export const pageGetServerSideProps = async (
  ctx: GetServerSidePropsContext,
) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx);

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { query } = ctx;
    let redirectPath = "/sign-in";
    if (query) {
      const params = new URLSearchParams(query as Record<string, any>);
      redirectPath += `/?${params}`;
    }
    return {
      redirect: {
        // Below redirects, taking into account the join_id
        destination: redirectPath,
        permanent: false,
      },
    };
  }

  return {
    props: {
      initialSession: session,
    },
  };
};
