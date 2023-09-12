import {
  constructHttpRequest,
  endpointUrlFromAction,
} from "../lib/edge-runtime/requests";

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
  headers: [],
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
      }),
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
      }),
    );
  });
  it("POST - 1 body param and 1 no choice param", () => {
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
              required: ["noChoice"],
              properties: {
                conversation_id: {
                  type: "number",
                },
                noChoice: {
                  type: "string",
                  enum: ["value"],
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
    expect(requestOptions.body).toBe(
      JSON.stringify({ conversation_id: 1, noChoice: "value" }),
    );
  });
  it("GET - fixed header set", () => {
    const { url, requestOptions } = constructHttpRequest({
      action: {
        ...constActionParams,
        parameters: null,
        headers: [
          {
            name: "org_id",
            value: "1",
            id: "",
            api_id: "",
            created_at: "",
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
      org_id: "1",
    });
    expect(requestOptions.body).toBe(undefined);
  });
});

describe("endpointUrlFromAction", () => {
  it("path has leading slash", () => {
    const result = endpointUrlFromAction({
      api_host: "http://localhost:3000/api/mock",
      path: "/api/v1/Segment/{segment-id}/column/{column-id}",
    });
    expect(result).toEqual(
      "http://localhost:3000/api/mock/api/v1/Segment/{segment-id}/column/{column-id}",
    );
  });
  it("leading slash in the path and trailing slash in the host", () => {
    const action = {
      path: "/api/v1/test",
      api_host: "http://localhost:3000/api/",
    };
    const result = endpointUrlFromAction(action);
    expect(result).toEqual("http://localhost:3000/api/api/v1/test");
  });

  it("henry bug", () => {
    const action = {
      path: "/events",
      api_host: "https://api.seeddata.io/api/",
    };
    const result = endpointUrlFromAction(action);
    expect(result).toEqual("https://api.seeddata.io/api/events");
  });

  it("no leading slash in the path and no trailing slash in the host", () => {
    const action = {
      path: "api2/v1/test",
      api_host: "http://localhost:3000/api",
    };
    const result = endpointUrlFromAction(action);
    expect(result).toEqual("http://localhost:3000/api/api2/v1/test");
  });

  it("leading slash in the path and no trailing slash in the host", () => {
    const action = {
      path: "/api/v1/test",
      api_host: "http://localhost:3000/api",
    };
    const result = endpointUrlFromAction(action);
    expect(result).toEqual("http://localhost:3000/api/api/v1/test");
  });

  it("no leading slash in the path and a trailing slash in the host", () => {
    const action = {
      path: "api/v1/test",
      api_host: "http://localhost:3000/api/",
    };
    const result = endpointUrlFromAction(action);
    expect(result).toEqual("http://localhost:3000/api/api/v1/test");
  });
});
