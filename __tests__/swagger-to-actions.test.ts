import { describe, expect, it } from "@jest/globals";
import { requestToFunctionName } from "../pages/api/swagger-to-actions";

describe("request to function name", () => {
  it("list organizations", () => {
    const fnName = requestToFunctionName("get", {}, "/api/v1/organizations");
    expect(fnName).toEqual("list_organizations");
  });
  it("get organization by id", () => {
    const fnName = requestToFunctionName(
      "get",
      { parameters: [{ in: "path", name: "id" }] },
      "/api/v1/organizations/{id}"
    );
    expect(fnName).toEqual("get_organization_by_id");
  });
  it("create chat completion", () => {
    const fnName = requestToFunctionName("post", {}, "/chat/completions");
    expect(fnName).toEqual("create_chat_completion");
  });
  it("get by parent_lookup_organization_id domain", () => {
    const fnName = requestToFunctionName(
      "get",
      { parameters: [{ in: "path", name: "parent_lookup_organization_id" }] },
      "/api/organizations/{parent_lookup_organization_id}/domains/"
    );
    expect(fnName).toEqual("get_by_parent_lookup_organization_id_domain");
  });
  it("get_plugin_activity", () => {
    const fnName = requestToFunctionName(
      "get",
      { parameters: [{ in: "path", name: "parent_lookup_organization_id" }] },
      "/api/organizations/{parent_lookup_organization_id}/plugins/activity/"
    );
    expect(fnName).toEqual("get_plugin_activity");
  });
});
