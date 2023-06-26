import React from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

function getRedirectUrl(): string {
  return location.origin + "/";
}

export default function SignInComponent() {
  const supabase = useSupabaseClient();
  const [signIn, setSignIn] = React.useState(true);
  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getRedirectUrl() },
    });
    if (error) console.error("Error signing into Google:" + error);
  }

  return (
    <>
      <div className="flex min-h-full flex-col justify-center py-28 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col place-items-center">
          <div>
            <h1 className="text-center sm:text-4xl md:text-5xl xl:text-5xl">
              Superflows
            </h1>
          </div>
          <h2 className="mt-4 text-center text-2xl tracking-tight text-gray-900">
            Sign {signIn ? "in to your account" : "up for a Superflows account"}
          </h2>
        </div>

        <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-16 px-4 shadow border border-1 border-gray-100 sm:rounded-lg sm:px-10">
            <button
              className="tracking-tight font-light text-xl bg-white hover:bg-gray-100 text-gray-500 border border-1 border-gray-300 rounded w-full py-4 flex flex-row justify-center place-items-center"
              onClick={signInWithGoogle}
            >
              <img src="/google.svg" className="h-7 w-7 mr-2.5" />
              Sign {signIn ? "in" : "up"} with Google
            </button>

            {/* ALLOW email and password sign-in */}
            {/*import { Auth, ThemeSupa } from "@supabase/auth-ui-react";*/}
            {/*<Auth*/}
            {/*  supabaseClient={props.supabaseClient}*/}
            {/*  theme="default"*/}
            {/*  providers={["google"]}*/}
            {/*  appearance={{*/}
            {/*    theme: ThemeSupa,*/}
            {/*    variables: {*/}
            {/*      default: {*/}
            {/*        colors: {*/}
            {/*          brand: "#fb923c",*/}
            {/*          brandAccent: "#f97316",*/}
            {/*        },*/}
            {/*      },*/}
            {/*    },*/}
            {/*  }}*/}
            {/*/>*/}
          </div>
          <div className="mt-8 text-center">
            {signIn ? (
              <>
                Or, if you&apos;re new around here -{" "}
                <button
                  onClick={() => setSignIn(false)}
                  className="inline text-purple-600 hover:text-purple-500 hover:underline cursor-pointer"
                >
                  sign up here
                </button>
                .
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setSignIn(true)}
                  className="inline text-purple-600 hover:text-purple-500 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
                .
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
