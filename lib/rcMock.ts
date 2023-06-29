import Fuse from "fuse.js";
import customers from "../pages/api/v1/Customers/customers.json";

export interface ActionProperties {
  type: string;
  enum?: string[] | number[];
  description?: string;
}

export interface MockAction {
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
  actions: MockAction[];
}

const fuse = new Fuse(customers, {
  keys: ["name", "email", "properties.location"],
});

export const pageActions: PageAction[] = [
  {
    pageName: "RControl",
    pageEndpoint: "/rcontrol",
    description: "Manage RControl",
    actions: [
      {
        name: "searchCustomer",
        description: "Search for a customer by name",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
        required: ["name"],
        func: function searchCustomer(name) {
          const results = fuse.search(name);
          if (results.length === 0) {
            return `No results for "${name}"`;
          }
          let output = "Search results:\n";
          results.slice(0, 3).forEach((result) => {
            output += `<table>Name: ${result.item.name}<br/>ID: ${result.item.id}</table>`;
          });
          return output;
        },
      },
      {
        name: "getRecentInformation",
        description:
          "Get all recent information about a customer, their property and any ongoing projects",
        parameters: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
        },
        required: ["id"],
        func: function getRecentInformation(id) {
          const customer = customers.find((customer) => customer.id === id);
          if (!customer) return `No customer with ID ${id}`;
          if ("recent_events" in customer.properties[0]) {
            let output = `${customer.name}'s recent information:\n`;
            customer.properties[0].recent_events.forEach((event) => {
              output += `<table>${Object.entries(event)
                .map(([key, value]) => key + ": " + value)
                .join("<br/>")}</table>\n\n`;
            });
            return output;
          } else {
            return `No recent information for ${customer.name}`;
          }
        },
      },
    ],
  },
];
