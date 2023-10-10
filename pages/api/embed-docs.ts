import { NextApiRequest, NextApiResponse } from "next";
import { queryEmbedding } from "../../lib/queryLLM";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  // Bring me my arrows of desire:
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Bring me my Spear: O clouds unfold!
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "",
  // Bring me my Chariot of fire!
);

const doc = `Introduction
Welcome to the Carbon Interface documentation 👋

You're here because you want to make your application more climate-concious. Our goal at Carbon Interface is to make it easy for developers to integrate scientifically-backed carbon emissions estimates into their applications. By doing this, we can build software that reduces carbon emissions, slowing climate change.

<break>

Carbon Interface offers two APIs:

Estimates API

The Estimates API makes it easy to generate accurate emissions estimates from flights, vehicles, shipping, electricity consumption and fuel combustion.

Carbon Ledger API

The Carbon Ledger API makes it easy to generate accurate emissions estimates from credit card and debit transactions.

<break>

Carbon Ledger API is currently in beta. You are able to register and receive stubbed estimates. Please contact ledger@carboninterface.com to request production access.

<break>

Getting Started
Carbon Interface's APIs are based on REST and rely on JSON for sending and receiving payloads.

The API will work with programming languages and frameworks that can make standard HTTP requests. 

`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const docChunks = doc.split("<break>");

  for (const chunk of docChunks) {
    const embedding = await queryEmbedding(chunk);
    const { error } = await supabase
      .from("docs")
      .insert({ text_chunk: chunk, org_id: 1, embedding: embedding[0] })
      .select();
    if (error) throw new Error(error.message);
  }

  res.status(200).json({});
}
