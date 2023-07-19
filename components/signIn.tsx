import React, { useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/router";

function getRedirectUrl(): string {
  return location.origin + "/onboarding/";
}

export default function SignInComponent(props: {
  view: "sign_in" | "sign_up" | "update_password";
}) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = React.useState<string | null>(null);
  const [view, setView] = React.useState<
    "sign_in" | "sign_up" | "update_password"
  >(props.view);

  useEffect(() => {
    const url = getRedirectUrl();
    setRedirectUrl(url);
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("update_password");
      } else if (event === "SIGNED_IN") {
        router.push("/onboarding");
      } else if (event === "USER_UPDATED") {
        router.push("/");
      }
    });
  }, []);

  return (
    <>
      <div className="relative flex min-h-screen bg-gray-850 flex-col justify-center py-20 sm:px-6 lg:px-8">
        <a
          href={"https://superflows.ai"}
          className="absolute top-5 left-5 text-center sm:text-lg lg:text-xl text-white"
        >
          Superflows
        </a>
        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col place-items-center">
          <div className="w-full rounded-md px-10 py-6 bg-gray-800 border border-gray-400 shadow shadow-gray-200">
            <h2 className="mb-1 text-center text-3xl tracking-tight text-gray-50">
              {view === "sign_up"
                ? "Get Started"
                : view === "update_password"
                ? "Update your password"
                : "Welcome Back"}
            </h2>
            <p className={"w-full text-center text-sm mb-6 text-gray-500"}>
              {view === "sign_up"
                ? "Create a free account"
                : view === "update_password"
                ? "Enter your new password below"
                : "Sign in"}
            </p>
            <Auth
              supabaseClient={supabase}
              providers={["google"]}
              view={view}
              redirectTo={redirectUrl ?? ""}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#a855f7",
                      brandAccent: "#9333ea",
                    },
                  },
                },
                style: {
                  input: { color: "white", borderColor: "#9ca3af" },
                  divider: { background: "#9ca3af" },
                  message: { color: "#cbd5e1" },
                  label: { color: "#6b7280" },
                  anchor: { color: "#6b7280" },
                },
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
