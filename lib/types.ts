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
