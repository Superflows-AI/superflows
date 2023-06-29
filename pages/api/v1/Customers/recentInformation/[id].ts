import { NextRequest } from "next/server";
import customers from "../customers.json";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  console.log("/api/v1/Customers/recentInformation called!", req.url);
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(undefined, { status: 200 });
  }
  // Handle non-GET requests
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Only GET requests allowed",
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Authenticate that the user is allowed to use this API
  // let org = await getOrgFromToken(req);
  // if (!org) {
  //   return new Response(
  //     JSON.stringify({
  //       error: "Authentication failed",
  //     }),
  //     {
  //       status: 401,
  //       headers: { "Content-Type": "application/json" },
  //     }
  //   );
  // }

  const id = Number(req.url.split("?")[1].split("=")[1]);
  const customer = customers.find((customer) => customer.id === id);
  if (!customer) {
    return new Response(
      JSON.stringify({ error: `No customer with ID ${id}` }),
      {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
  if ("recent_events" in customer.properties[0]) {
    return new Response(JSON.stringify(customer.properties[0].recent_events), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } else {
    return new Response(
      JSON.stringify({ error: `No recent information for ${customer.name}` }),
      {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
}
