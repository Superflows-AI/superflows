import { NextRequest } from "next/server";
import Fuse from "fuse.js";
import customers from "./customers.json";

export const config = {
  runtime: "edge",
};

const fuse = new Fuse(customers, {
  keys: ["name", "email"],
});

export default async function handler(req: NextRequest) {
  console.log("/api/v1/Customers/search called!", req.url);
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
  const queryParams = req.url.split("?")[1];
  const name = queryParams.split("=")[1];
  const results = fuse.search(name);

  return new Response(JSON.stringify(results.slice(0, 5)), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
