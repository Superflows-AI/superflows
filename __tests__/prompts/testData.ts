export const exampleRequestBody1 = {
  "application/json": {
    schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            required: ["customField", "issueIds", "value"],
            type: "object",
            properties: {
              customField: {
                type: "string",
                description:
                  "The ID or key of the custom field. For example, `customfield_10010`.",
                writeOnly: true,
              },
              issueIds: {
                type: "array",
                description: "The list of issue IDs.",
                writeOnly: true,
                items: {
                  type: "integer",
                  format: "int64",
                  writeOnly: true,
                },
              },
              value: {
                description:
                  "The value for the custom field. The value must be compatible with the [custom field type](https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-custom-field/#data-types).",
              },
            },
            additionalProperties: false,
            description:
              "A custom field and its new value with a list of issue to update.",
            writeOnly: true,
          },
          description: "List of updates for a custom fields.",
        },
      },
      additionalProperties: false,
      writeOnly: true,
    },
    example: {
      updates: [
        {
          customField: "customfield_10010",
          issueIds: [10010, 10011],
          value: "new value",
        },
        {
          customField: "customfield_10011",
          issueIds: [10010],
          value: 1000,
        },
      ],
    },
  },
};

export const exampleRequestBody2 = {
  "application/json": {
    schema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "The account ID of a user.",
        },
        globalPermissions: {
          uniqueItems: true,
          type: "array",
          description: "Global permissions to look up.",
          items: {
            type: "string",
          },
        },
        projectPermissions: {
          uniqueItems: true,
          type: "array",
          description:
            "Project permissions with associated projects and issues to look up.",
          items: {
            required: ["permissions"],
            type: "object",
            properties: {
              issues: {
                uniqueItems: true,
                type: "array",
                description: "List of issue IDs.",
                items: {
                  type: "integer",
                  format: "int64",
                },
              },
              permissions: {
                uniqueItems: true,
                type: "array",
                description: "List of project permissions.",
                items: {
                  type: "string",
                },
              },
              projects: {
                uniqueItems: true,
                type: "array",
                description: "List of project IDs.",
                items: {
                  type: "integer",
                  format: "int64",
                },
              },
            },
            additionalProperties: false,
            description:
              "Details of project permissions and associated issues and projects to look up.",
          },
        },
      },
      additionalProperties: false,
      description:
        "Details of global permissions to look up and project permissions with associated projects and issues to look up.",
    },
    example: {
      accountId: "5b10a2844c20165700ede21g",
      globalPermissions: ["ADMINISTER"],
      projectPermissions: [
        {
          issues: [10010, 10011, 10012, 10013, 10014],
          permissions: ["EDIT_ISSUES"],
          projects: [10001],
        },
      ],
    },
  },
};

export const exampleRequestBody3 = {
  "application/json": {
    schema: {
      required: ["editPermissions", "name", "sharePermissions"],
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "The description of the dashboard.",
        },
        editPermissions: {
          type: "array",
          description: "The edit permissions for the dashboard.",
          items: {
            required: ["type"],
            type: "object",
            properties: {
              id: {
                type: "integer",
                description: "The unique identifier of the share permission.",
                format: "int64",
                readOnly: true,
              },
              type: {
                type: "string",
                description:
                  "user: Shared with a user. `group`: Shared with a group. `project` Shared with a project. `projectRole` Share with a project role in a project. `global` Shared globally. `loggedin` Shared with all logged-in users. `project-unknown` Shared with a project that the user does not have access to.",
                enum: [
                  "user",
                  "group",
                  "project",
                  "projectRole",
                  "global",
                  "loggedin",
                  "authenticated",
                  "project-unknown",
                ],
              },
            },
            additionalProperties: false,
            description: "Details of a share permission for the filter.",
          },
        },
        name: {
          type: "string",
          description: "The name of the dashboard.",
        },
        sharePermissions: {
          type: "array",
          description: "The share permissions for the dashboard.",
          items: {
            required: ["type"],
            type: "object",
            properties: {
              id: {
                type: "integer",
                description: "The unique identifier of the share permission.",
                format: "int64",
                readOnly: true,
              },
              type: {
                type: "string",
                description:
                  "user: Shared with a user. `group`: Shared with a group. `project` Shared with a project. `projectRole` Share with a project role in a project. `global` Shared globally. `loggedin` Shared with all logged-in users. `project-unknown` Shared with a project that the user does not have access to.",
                enum: [
                  "user",
                  "group",
                  "project",
                  "projectRole",
                  "global",
                  "loggedin",
                  "authenticated",
                  "project-unknown",
                ],
              },
            },
            additionalProperties: false,
            description: "Details of a share permission for the filter.",
          },
        },
      },
      additionalProperties: false,
      description: "Details of a dashboard.",
    },
  },
};
