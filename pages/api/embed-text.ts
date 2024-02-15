import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { z } from "zod";
import { embedText } from "../../lib/embed-docs/embedText";
import { NextRequest } from "next/server";
import { isValidBody } from "../../lib/edge-runtime/utils";

export const config = {
  runtime: "edge",
};

if (process.env.SERVICE_LEVEL_KEY_SUPABASE === undefined) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined!");
}

const supabase = createClient<Database>(
  process.env.API_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SERVICE_LEVEL_KEY_SUPABASE,
  {
    auth: {
      persistSession: false,
    },
  },
);

const EmbedTextZod = z.object({
  org_id: z.number(),
  title: z.string(),
  docsText: z.string(),
  sectionName: z.string().optional(),
  url: z.string().optional(),
  createdAt: z.string().optional(),
});
type EmbedTextType = z.infer<typeof EmbedTextZod>;

export default async function handler(req: NextRequest) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Only POST requests allowed",
      }),
      { status: 405 },
    );
  }
  const requestData = await req.json();
  if (!isValidBody<EmbedTextType>(requestData, EmbedTextZod)) {
    return new Response(JSON.stringify({ message: "Invalid request body" }), {
      status: 400,
    });
  }
  //   console.log(requestData);
  const embedInserts = await embedText(
    requestData.docsText,
    requestData.title,
    requestData.sectionName,
    requestData.url,
    requestData.createdAt,
  );
  await supabase.from("doc_chunks").insert(
    embedInserts.map((insert) => ({
      ...insert,
      org_id: requestData.org_id,
    })),
  );

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
