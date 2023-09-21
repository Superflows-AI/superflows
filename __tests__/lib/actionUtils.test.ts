import {
  fillNoChoiceRequiredParams,
  getFilledNoChoiceRequiredFields,
  isChoiceRequired,
} from "../../lib/actionUtils";
import { OpenAPIV3_1 } from "openapi-types";

const simpleSchemaWithChoice1 = {
  type: "object",
  properties: {
    code: {
      type: "string",
      enum: ["inv"],
    },
  },
} as OpenAPIV3_1.SchemaObject;

const simpleSchemaWithChoice2 = {
  type: "object",
  required: ["code"],
  properties: {
    code: {
      type: "string",
      enum: ["external", "internal"],
    },
  },
} as OpenAPIV3_1.SchemaObject;

const simpleSchema = {
  required: ["code"],
  type: "object",
  properties: {
    code: {
      type: "string",
      enum: ["external"],
    },
  },
} as OpenAPIV3_1.SchemaObject;

const twoParamsSchema = {
  required: ["code", "metadata"],
  type: "object",
  properties: {
    code: {
      type: "string",
      enum: ["external", "internal"],
    },
    metadata: {
      type: "object",
    },
  },
} as OpenAPIV3_1.SchemaObject;

const complexSchema1 = {
  required: ["workflow", "data"],
  type: "object",
  properties: {
    workflow: {
      type: "object",
      properties: {
        code: {
          type: "string",
          enum: ["external"],
        },
      },
      required: ["code"],
    },
    data: {
      type: "object",
      properties: {
        choiceVar: {
          type: "string",
          enum: ["option1", "option2"],
        },
      },
    },
  },
} as OpenAPIV3_1.SchemaObject;

const complexSchema2 = {
  required: ["workflow", "data"],
  type: "object",
  properties: {
    workflow: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "unique workflow code",
          enum: ["external"],
        },
        anotherVal: {
          type: "string",
          description: "another value which shouldn't be filled in",
        },
      },
      required: ["code"],
    },
    data: {
      type: "object",
      properties: {
        choiceVar: {
          type: "string",
          enum: ["option1", "option2"],
        },
      },
      required: ["choiceVar"],
    },
  },
} as OpenAPIV3_1.SchemaObject;

describe("isChoiceRequired", () => {
  it("simple schema with choice 1", () => {
    const out = isChoiceRequired(simpleSchemaWithChoice1);
    expect(out).toBe(true);
  });
  it("simple schema with choice 2", () => {
    const out = isChoiceRequired(simpleSchemaWithChoice2);
    expect(out).toBe(true);
  });
  it("no choice required - simple", () => {
    const out = isChoiceRequired(simpleSchema);
    expect(out).toBe(false);
  });
  it("choice required - two param", () => {
    const out = isChoiceRequired(twoParamsSchema);
    expect(out).toBe(true);
  });
  it("no choice required - two param, object with no other schema", () => {
    const out = isChoiceRequired(twoParamsSchema.properties!.metadata);
    expect(out).toBe(false);
  });
  it("complex 1 - outer", () => {
    const out = isChoiceRequired(complexSchema1);
    expect(out).toBe(true);
  });
  it("complex 1 - data", () => {
    const out = isChoiceRequired(complexSchema1.properties!.data);
    expect(out).toBe(true);
  });
  it("complex 1 - workflow", () => {
    const out = isChoiceRequired(complexSchema1.properties!.workflow);
    expect(out).toBe(false);
  });
  it("complex 1 - workflow.code", () => {
    const out = isChoiceRequired(
      // @ts-ignore
      complexSchema1.properties!.workflow.properties.code,
    );
    expect(out).toBe(false);
  });
  it("complex 2 - outer", () => {
    const out = isChoiceRequired(complexSchema2);
    expect(out).toBe(true);
  });
  it("complex 2 - data", () => {
    const out = isChoiceRequired(complexSchema2.properties!.data);
    expect(out).toBe(true);
  });
  it("complex 2 - workflow", () => {
    const out = isChoiceRequired(complexSchema2.properties!.workflow);
    expect(out).toBe(true);
  });
  it("complex 2 - workflow.code", () => {
    const out = isChoiceRequired(
      // @ts-ignore
      complexSchema2.properties!.workflow.properties.code,
    );
    expect(out).toBe(false);
  });
});

describe("getFilledNoChoiceRequiredFields", () => {
  it("simple schema with choice 1", () => {
    const out = getFilledNoChoiceRequiredFields(simpleSchemaWithChoice1);
    expect(out).toEqual(null);
  });

  it("simple schema with choice 2", () => {
    const out = getFilledNoChoiceRequiredFields(simpleSchemaWithChoice2);
    expect(out).toEqual(null);
  });

  it("simple schema", () => {
    const out = getFilledNoChoiceRequiredFields(simpleSchema);
    expect(out).toEqual({ code: "external" });
  });

  it("two params schema", () => {
    const out = getFilledNoChoiceRequiredFields(twoParamsSchema);
    expect(out).toEqual({ metadata: {} });
  });

  it("complex schema 1", () => {
    const out = getFilledNoChoiceRequiredFields(complexSchema1);
    expect(out).toEqual({ workflow: { code: "external" } });
  });

  it("complex schema 2", () => {
    const out = getFilledNoChoiceRequiredFields(complexSchema2);
    expect(out).toEqual({ workflow: { code: "external" } });
  });
});

describe("fillNoChoiceRequiredParams", () => {
  it("simple schema with choice 1", () => {
    const out = fillNoChoiceRequiredParams(
      { code: "inv" },
      simpleSchemaWithChoice1,
    );
    expect(out).toEqual({ code: "inv" });
  });

  it("simple schema with choice 2", () => {
    const out = fillNoChoiceRequiredParams(
      { code: "external" },
      simpleSchemaWithChoice2,
    );
    expect(out).toEqual({ code: "external" });
  });

  it("simple schema", () => {
    const out = fillNoChoiceRequiredParams({}, simpleSchema);
    expect(out).toEqual({ code: "external" });
  });

  it("complex schema 1", () => {
    const out = fillNoChoiceRequiredParams(
      { data: { choiceVar: "option1" } },
      complexSchema1,
    );
    expect(out).toEqual({
      data: { choiceVar: "option1" },
      workflow: { code: "external" },
    });
  });

  it("complex schema 2 - missing anotherVal", () => {
    const out = fillNoChoiceRequiredParams(
      { workflow: {}, data: { choiceVar: "option1" } },
      complexSchema2,
    );
    expect(out).toEqual({
      workflow: { code: "external" },
      data: { choiceVar: "option1" },
    });
  });
  it("complex schema 2 - anotherVal filled", () => {
    const out = fillNoChoiceRequiredParams(
      { workflow: { anotherVal: "something" }, data: { choiceVar: "option1" } },
      complexSchema2,
    );
    expect(out).toEqual({
      workflow: { anotherVal: "something", code: "external" },
      data: { choiceVar: "option1" },
    });
  });
});
