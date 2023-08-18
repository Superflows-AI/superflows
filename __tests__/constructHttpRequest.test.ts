import { constructHttpRequest } from "../lib/edge-runtime/requests";

const constActionParams = {
  action_type: "http",
  active: true,
  id: 1,
  org_id: 1,
  keys_to_keep: null,
  tag: null,
  responses: null,
  created_at: "2021-08-15T20:00:00.000Z",
  name: "confirm",
  description: "",
  api_id: "sefoi-sdfkhj-sdgfbnjkl-hednjkl-gslnk",
  api_host: "https://api.mock",
  auth_header: "Authorization",
  auth_scheme: "Bearer",
};
const organization = {
  id: 1,
};

describe("constructHttpRequest", () => {
  it("GET - no params", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: null,
        path: "/api/mock/confirm",
        request_method: "GET",
        request_body_contents: null,
      },
      parameters: {},
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm");
    expect(requestOptions.method).toBe("GET");
    expect(requestOptions.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(undefined);
  });
  it("GET - path param", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: [
          {
            name: "param",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        path: "/api/mock/{param}",
        request_method: "GET",
        request_body_contents: null,
      },
      parameters: { param: 1 },
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/1");
    expect(requestOptions.method).toBe("GET");
    expect(requestOptions.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(undefined);
  });
  it("GET - optional query param", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: [
          {
            name: "param",
            in: "query",
            required: false,
            schema: {
              type: "integer",
            },
          },
        ],
        path: "/api/mock/confirm",
        request_method: "GET",
        request_body_contents: null,
      },
      parameters: {},
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm");
    expect(requestOptions.method).toBe("GET");
    expect(requestOptions.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(undefined);
  });
  it("GET - query param", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: [
          {
            name: "param",
            in: "query",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        path: "/api/mock/confirm",
        request_method: "GET",
        request_body_contents: null,
      },
      parameters: { param: 1 },
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm?param=1");
    expect(requestOptions.method).toBe("GET");
    expect(requestOptions.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(undefined);
  });
  it("GET - query param with required enum with 1 value", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: [
          {
            name: "param",
            in: "query",
            required: true,
            schema: {
              type: "integer",
              enum: [1],
            },
          },
        ],
        path: "/api/mock/confirm",
        request_method: "GET",
        request_body_contents: null,
      },
      parameters: {},
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm?param=1");
    expect(requestOptions.method).toBe("GET");
    expect(requestOptions.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(undefined);
  });
  it("GET - header param", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: [
          {
            name: "Accept",
            in: "header",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        path: "/api/mock/confirm",
        request_method: "GET",
        request_body_contents: null,
      },
      parameters: { Accept: "application/pdf" },
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm");
    expect(requestOptions.method).toBe("GET");
    expect(requestOptions.headers).toEqual({
      Accept: "application/pdf",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(undefined);
  });
  it("POST - 1 body param", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: null,
        path: "/api/mock/confirm",
        request_method: "POST",
        request_body_contents: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                conversation_id: {
                  type: "number",
                },
              },
            },
          },
        },
      },
      parameters: { conversation_id: 1 },
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm");
    expect(requestOptions.method).toBe("POST");
    expect(requestOptions.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(JSON.stringify({ conversation_id: 1 }));
  });
  it("POST - body with required enum with 1 value", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: null,
        path: "/api/mock/confirm",
        request_method: "POST",
        request_body_contents: {
          "application/json": {
            schema: {
              type: "object",
              required: ["user_id"],
              properties: {
                user_id: {
                  type: "string",
                  enum: ["1"],
                },
              },
            },
          },
        },
      },
      parameters: {},
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm");
    expect(requestOptions.method).toBe("POST");
    expect(requestOptions.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(JSON.stringify({ user_id: "1" }));
  });
  it("POST - nested body", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: null,
        path: "/api/mock/confirm",
        request_method: "POST",
        request_body_contents: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    conversation_id: {
                      type: "number",
                    },
                  },
                },
              },
            },
          },
        },
      },
      parameters: { user: { conversation_id: 1 } },
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm");
    expect(requestOptions.method).toBe("POST");
    expect(requestOptions.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(
      JSON.stringify({
        user: { conversation_id: 1 },
      })
    );
  });
  it("POST - complicated lad", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: [
          {
            name: "Accept",
            in: "header",
            required: true,
            schema: {
              type: "string",
            },
          },
          {
            name: "param",
            in: "query",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        path: "/api/mock/confirm",
        request_method: "POST",
        request_body_contents: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    conversation_id: {
                      type: "number",
                    },
                    something_else: {
                      type: "object",
                      properties: {
                        conversation_id: {
                          type: "number",
                        },
                      },
                    },
                  },
                },
                list: {
                  type: "array",
                  items: {
                    type: "integer",
                  },
                },
              },
            },
          },
        },
      },
      parameters: {
        user: { conversation_id: 1, something_else: { conversation_id: 2 } },
        list: [1, 2, 3, 4],
        Accept: "text/plain",
        param: 1,
      },
      organization,
      userApiKey: "1234",
      stream: () => {},
    });
    expect(url).toBe("https://api.mock/api/mock/confirm?param=1");
    expect(requestOptions.method).toBe("POST");
    expect(requestOptions.headers).toEqual({
      Accept: "text/plain",
      "Content-Type": "application/json",
      Authorization: "Bearer 1234",
    });
    expect(requestOptions.body).toBe(
      JSON.stringify({
        user: { conversation_id: 1, something_else: { conversation_id: 2 } },
        list: [1, 2, 3, 4],
      })
    );
  });
});
