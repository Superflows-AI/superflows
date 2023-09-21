import { describe, expect, it } from "@jest/globals";
import {
  operationIdToFunctionName,
  replaceMarkdownLinks,
  requestToFunctionName,
} from "../pages/api/swagger-to-actions";

describe("request to function name", () => {
  it("list organizations", () => {
    const fnName = requestToFunctionName("get", {}, "/api/v1/organizations");
    expect(fnName).toEqual("list_organizations");
  });
  it("get organization by id", () => {
    const fnName = requestToFunctionName(
      "get",
      { parameters: [{ in: "path", name: "id" }] },
      "/api/v1/organizations/{id}",
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
      "/api/organizations/{parent_lookup_organization_id}/domains/",
    );
    expect(fnName).toEqual("get_by_parent_lookup_organization_id_domain");
  });
  it("get_plugin_activity", () => {
    const fnName = requestToFunctionName(
      "get",
      { parameters: [{ in: "path", name: "parent_lookup_organization_id" }] },
      "/api/organizations/{parent_lookup_organization_id}/plugins/activity/",
    );
    expect(fnName).toEqual("get_plugin_activity");
  });
});

describe("replaceMarkdownLinks", () => {
  it("undefined passes through", () => {
    let result = replaceMarkdownLinks(undefined);
    expect(result).toEqual(undefined);
  });
  it("replace 1 markdown link", () => {
    let testString = "there's [something](https://something.com)";
    let result = replaceMarkdownLinks(testString);
    expect(result).toEqual("there's something");
  });
  it("replace 2 markdown links", () => {
    let testString =
      "there's [something](https://something.com) [here](https://something.com)";
    let result = replaceMarkdownLinks(testString);
    expect(result).toEqual("there's something here");
  });
});

describe("operationIdToFunctionName", () => {
  it("handles simple camel case", () => {
    expect(operationIdToFunctionName("camelCase")).toBe("camel_case");
  });

  it("handles multiple capital letters in a row", () => {
    expect(operationIdToFunctionName("camelCaseJSON")).toBe("camel_case_json");
  });

  it("handles words without capital letters", () => {
    expect(operationIdToFunctionName("camelcase")).toBe("camelcase");
  });

  it("handles single words", () => {
    expect(operationIdToFunctionName("Camel")).toBe("camel");
  });

  it("handles words with numbers", () => {
    expect(operationIdToFunctionName("camelCase2Go")).toBe("camel_case2_go");
  });
});
