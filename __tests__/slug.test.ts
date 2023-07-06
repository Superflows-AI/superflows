import { describe, expect, it } from "@jest/globals";
import {
  getMatchingAction,
  processMultipleMatches,
  slugMatchesPath,
} from "../pages/api/api-mocker/[...slug]";
import { Action } from "../lib/types";

const actions: Action[] = [
  {
    action_group: 1,
    action_type: "http",
    description: "",
    active: true,
    created_at: "2022-01-01T00:00:00Z",
    id: 1,
    keys_to_keep: null,
    name: "Action A",
    org_id: 1,
    parameters: null,
    path: "/api/v1/endpoint1",
    request_body_contents: null,
    request_method: "POST",
    responses: null,
  },
  {
    action_group: 1,
    action_type: "http",
    description: "",
    active: true,
    created_at: "2022-01-01T00:00:00Z",
    id: 2,
    keys_to_keep: null,
    name: "Action B",
    org_id: 1,
    parameters: null,
    path: "/api/v2/endpoint2",
    request_body_contents: null,
    request_method: "GET",
    responses: null,
  },
  {
    action_group: 2,
    action_type: "http",
    description: "",
    active: true,
    created_at: "2022-01-01T00:00:00Z",
    id: 3,
    keys_to_keep: null,
    name: "Action C",
    org_id: 1,
    parameters: null,
    path: "/api/v2/endpoint3",
    request_body_contents: null,
    request_method: "PUT",
    responses: null,
  },
  {
    action_group: 2,
    action_type: "http",
    description: "",
    active: true,
    created_at: "2022-01-01T00:00:00Z",
    id: 3,
    keys_to_keep: null,
    name: "Action D",
    org_id: 1,
    parameters: null,
    path: "/api/v2/endpoint3/{id}",
    request_body_contents: null,
    request_method: "PUT",
    responses: null,
  },
  {
    action_group: 2,
    action_type: "http",
    description: "",
    active: true,
    created_at: "2022-01-01T00:00:00Z",
    id: 3,
    keys_to_keep: null,
    name: "Action D",
    org_id: 1,
    parameters: null,
    path: "/api/v2/{id}/endpoint3",
    request_body_contents: null,
    request_method: "PUT",
    responses: null,
  },
];

describe("getMatchingAction", () => {
  const requestMethod = "POST";

  it("handles single matching action", async () => {
    const slug = ["api", "v1", "endpoint1"];
    // mock slugMatchesPath to return true on first match
    const result = getMatchingAction(1, actions, requestMethod, slug);
    expect(result).toEqual(actions[0]); // assuming the first match is the correct one
  });

  it("handles single matching actions 2", async () => {
    const slug = ["api", "v2", "endpoint2"];
    const result = getMatchingAction(1, actions, requestMethod, slug);
    expect(result).toEqual(actions[1]);
  });

  it("Handles trailing path param", async () => {
    const slug = ["api", "v2", "endpoint3", "1234"];
    const result = await getMatchingAction(1, actions, requestMethod, slug);
    expect(result).toEqual(actions[3]);
  });
  it("Handles internal path param", async () => {
    const slug = ["api", "v2", "1234", "endpoint3"];
    const result = await getMatchingAction(1, actions, requestMethod, slug);
    expect(result).toEqual(actions[4]);
  });
});

describe("processMultipleMatches", () => {
  const Action_Fixture = (path: string) => ({ path });

  it("should not match {id} when no id given", () => {
    const slug = ["api", "v1", "Customers", "location"];
    const localActions = [
      Action_Fixture("/api/v1/Customers/location"),
      Action_Fixture("/api/v1/Customers/{id}"),
    ];

    const result = processMultipleMatches(localActions, slug);
    expect(result[0].path).toEqual("/api/v1/Customers/location");
  });

  it("should match {id} when id given", () => {
    const slug = ["api", "v2", "Coordinators", "1234"];
    const localActions = [
      Action_Fixture("/api/v2/Coordinators/{id}"),
      Action_Fixture("/api/v2/Coordinators/location"),
    ];

    const result = processMultipleMatches(localActions, slug);
    console.log(result);
    expect(result[0].path).toEqual("/api/v2/Coordinators/{id}");
  });
});
