export interface ActionProperties {
  type: string;
  enum?: string[] | number[];
  description?: string;
}

export interface Action {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: { [key: string]: ActionProperties };
  };
  required: string[];
  func?: (...args: any[]) => any;
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
export interface SwaggerResult {
  openapi: object;
  info: object;
  paths: { [key: string]: SwaggerPath };
  components: object;
}

interface SwaggerPathMethod {}

interface SwaggerPath {
  get?: SwaggerPathMethod;
  post?: SwaggerPathMethod;
  put?: SwaggerPathMethod;
  delete?: SwaggerPathMethod;
}
