import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export function generateApiKey(): string {
  /**
   * Generate a version 4 UUID which can be used as an API key and appends 'sfk'.
   * Version 4 UUIDs are sufficiently random for our purposes.
   * sfk stands for SuperFlows Key **/
  //
  return "sfk-" + uuidv4();
}

// export function hash(apiKey: string) {
//   return crypto.createHash("sha256").update(apiKey).digest("hex");
// }
