import { describe, expect, it } from "@jest/globals";

import {
  getMatchingAction,
  getPathParameters,
  processMultipleMatches,
  slugMatchesPath,
} from "../pages/api/api-mock/[...slug]";
import { Action } from "../lib/types";

const actions: Action[] = [
  {
    tag: 1,
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
    tag: 1,
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
    tag: 1,
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
    tag: 1,
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
    tag: 1,
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
  {
    tag: 1,
    action_type: "http",
    description: "",
    active: true,
    created_at: "2022-01-01T00:00:00Z",
    id: 3,
    keys_to_keep: null,
    name: "Action D",
    org_id: 1,
    parameters: null,
    path: "/api/0/teams/{organization_slug}/{team_slug}/",
    request_body_contents: null,
    request_method: "PUT",
    responses: null,
  },
];

describe("getMatchingAction", () => {
  const requestMethod = "POST";

  it("handles single matching action", async () => {
    const slug = ["api", "v1", "endpoint1"];
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
    const result = getMatchingAction(1, actions, requestMethod, slug);
    expect(result).toEqual(actions[3]);
  });
  it("handle internal path param", async () => {
    const slug = ["api", "v2", "1234", "endpoint3"];
    const result = getMatchingAction(1, actions, requestMethod, slug);
    expect(result).toEqual(actions[4]);
  });
  it("slug longer than path", async () => {
    const slug = [
      "api",
      "0",
      "teams",
      "teamy",
      "teamymcteamface",
      "mteamystreamfacefaceteam",
    ];
    const slugMatch = slugMatchesPath(
      "/api/0/teams/{organization_slug}/{team_slug}/",
      "/api/0/teams/teamy/teamymcteamface/mteamystreamfacefaceteam"
    );
    expect(slugMatch).toEqual(false);
    const result = getMatchingAction(1, actions, requestMethod, slug);
    expect(result).toEqual(null);
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

    // @ts-ignore
    const result = processMultipleMatches(localActions, slug);
    expect(result[0].path).toEqual("/api/v1/Customers/location");
  });

  it("should match {id} when id given", () => {
    const slug = ["api", "v2", "Coordinators", "1234"];
    const localActions = [
      Action_Fixture("/api/v2/Coordinators/{id}"),
      Action_Fixture("/api/v2/Coordinators/location"),
    ];

    // @ts-ignore
    const result = processMultipleMatches(localActions, slug);
    expect(result[0].path).toEqual("/api/v2/Coordinators/{id}");
  });
  it("Double {} ", () => {
    const slug = ["api", "v2", "Coordinators", "location"];
    const localActions = [
      Action_Fixture("/api/v2/{id1}/{id2}"),
      Action_Fixture("/api/v2/Coordinators/location"),
    ];

    // @ts-ignore
    const result = processMultipleMatches(localActions, slug);
    expect(result[0].path).toEqual("/api/v2/Coordinators/location");
  });
  it("Double {} slug has params", () => {
    const slug = ["api", "v2", "123", "456"];
    const localActions = [
      Action_Fixture("/api/v2/{id1}/{id2}"),
      Action_Fixture("/api/v2/Coordinators/location"),
    ];

    // @ts-ignore
    const result = processMultipleMatches(localActions, slug);
    expect(result[0].path).toEqual("/api/v2/{id1}/{id2}");
  });

  it("Double internal params", () => {
    const slug = ["api", "123", "Coordinators", "456"];
    const localActions = [
      Action_Fixture("/api/{id}/Coordinators/{id2}"),
      Action_Fixture("/api/v2/Coordinators/location"),
    ];

    // @ts-ignore
    const result = processMultipleMatches(localActions, slug);
    expect(result[0].path).toEqual("/api/{id}/Coordinators/{id2}");
  });

  it("Double internal params2", () => {
    const slug = ["api", "v2", "Coordinators", "location"];
    const localActions = [
      Action_Fixture("/api/{id}/Coordinators/{id2}"),
      Action_Fixture("/api/v2/Coordinators/location"),
    ];

    // @ts-ignore
    const result = processMultipleMatches(localActions, slug);
    expect(result[0].path).toEqual("/api/v2/Coordinators/location");
  });
});

describe("getPathParameters", () => {
  it("no path params", () => {
    const res = getPathParameters("/api/v1/endpoint1", [
      "api",
      "v1",
      "endpoint1",
    ]);

    expect(res).toEqual({});
  });

  it("path param at end", () => {
    const res = getPathParameters("/api/v1/endpoint1/{paramy}", [
      "api",
      "v1",
      "endpoint1",
      "very-nice-param",
    ]);
    expect(res).toEqual({ paramy: "very-nice-param" });
  });

  it("path param in middle", () => {
    const res = getPathParameters("/api/v1/0/{paramy}/endpoint", [
      "api",
      "v1",
      "0",
      "very-nice-param",
      "endpoint",
    ]);
    expect(res).toEqual({ paramy: "very-nice-param" });
  });

  it("multiple params", () => {
    const res = getPathParameters("/api/v1/0/{paramy1}/endpoint/{paramy2}", [
      "api",
      "v1",
      "0",
      "very-nice-param",
      "endpoint",
      "another-very-nice-param",
    ]);
    expect(res).toEqual({
      paramy1: "very-nice-param",
      paramy2: "another-very-nice-param",
    });
  });
});
