export interface ActionProperties {
  type: string;
  enum?: string[] | number[];
  description?: string;
}

export interface PageAction {
  pageName: string;
  pageEndpoint: string;
  description: string;
  actions: Action[];
}

export interface ReturnedAction {
  name: string;
  parameters: {
    type: string;
    properties: { [key: string]: string };
  };
}

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

export interface Action extends SwaggerPathMethod {
  route: string;
  method: "get" | "post" | "put" | "delete";
}
