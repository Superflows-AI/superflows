import { GetServerSidePropsContext } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export const pageGetServerSideProps = async (
  ctx: GetServerSidePropsContext
) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx);

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { query } = ctx;
    return {
      redirect: {
        destination:
          "join_id" in query
            ? `/sign-in/?join_id=${query.join_id}`
            : "/sign-in",
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
