import { Database } from "./database.types";

export type Action = Database["public"]["Tables"]["actions"]["Row"];

export type ActionGroup = Database["public"]["Tables"]["action_groups"]["Row"];

export type ActionGroupJoinActions = ActionGroup & { actions: Action[] };

export interface Swagger {
  openapi: object;
  info: object;
  paths: { [key: string]: SwaggerPath };
  components: { schemas: { [key: string]: Schema } };
}
interface Schema {
  type: string;
  properties: { [key: string]: object };
  required?: string[];
  additionalProperties?: boolean;
}

export interface SwaggerPath {
  get?: SwaggerPathMethod;
  post?: SwaggerPathMethod;
  put?: SwaggerPathMethod;
  delete?: SwaggerPathMethod;
}
interface SwaggerPathMethod {
  tags: string[];
  summary?: string;
  description?: string;
  requestBody?: {
    content: { [key: string]: object };
  };
  parameters?: object[];
  responses: { [key: string]: Response }; // key is a http code (eg 200)
}

interface Response {
  description: string;
  content: { [key: string]: object };
}

// extends SwaggerPathMethod {
//   route: string;
//   method: "get" | "post" | "put" | "delete";
// }
