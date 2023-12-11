export const exampleParameters = [
  {
    in: "query",
    name: "name",
    description: "Name of the company",
    required: true,
    schema: {
      type: "string",
      enum: ["Google", "Facebook", "Apple"],
    },
  },
];

export const exampleRequestBody = {
  "application/json": {
    schema: {
      required: ["name"],
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ["Google", "Facebook", "Apple"],
        },
      },
    },
  },
};
