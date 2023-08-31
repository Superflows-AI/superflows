import { OpenAPIV3_1 } from "openapi-types";

export function isChoiceRequired(
  schema: OpenAPIV3_1.SchemaObject,
  parentRequired: boolean = true
): boolean {
  /** Determines whether there's a choice to be made by the AI for
   * a parameter. There's no choice if it is required and has 1 enum
   * value (or all nested children are like this) **/
  if (!parentRequired) return true;
  if (schema.type !== "object") {
    return !(schema.enum && schema.enum.length === 1);
  }

  const requiredKeys = schema.required || [];

  for (let key in schema.properties) {
    const isKeyRequired = requiredKeys.includes(key);
    const childSchema = schema.properties[key] as OpenAPIV3_1.SchemaObject;

    // If any nested object requires choice, then choice is required.
    if (isChoiceRequired(childSchema, isKeyRequired)) {
      return true;
    }
  }

  // If no choice required in any properties, then no choice required.
  return false;
}

export function getFilledNoChoiceRequiredFields(
  schema: OpenAPIV3_1.SchemaObject | undefined,
  parentRequired: boolean = true
): any {
  /** Gets an object with filled fields where no choice is required by the AI.
   *
   * Used after the AI call, before API call, to get the parameters
   * where no choice is required, but the parameters need to be filled
   * for the API call to succeed. **/
  // TODO: Doesn't deal with arrays yet, only deals with nested objects
  if (!schema || schema.type !== "object" || !parentRequired) {
    return null;
  }
  // Below is for case where it's an object schema but that's all you know
  if (Object.keys(schema).length === 1) {
    return {};
  }

  let filledObject: any = {};
  const requiredKeys = schema.required || [];

  for (let key in schema.properties) {
    const isKeyRequired = requiredKeys.includes(key);
    const childSchema = schema.properties[key] as OpenAPIV3_1.SchemaObject;

    // If key is required and has only one enum value, add it into the filled object.
    if (isKeyRequired && childSchema.enum && childSchema.enum.length === 1) {
      filledObject[key] = childSchema.enum[0];
    } else if (childSchema.type === "object") {
      // Else if the property is an object, then recursively fill its parameters.
      const filledChildObject = getFilledNoChoiceRequiredFields(
        childSchema,
        isKeyRequired
      );
      if (filledChildObject) {
        filledObject[key] = filledChildObject;
      }
    }
  }

  return Object.keys(filledObject).length > 0 ? filledObject : null;
}

export function fillNoChoiceRequiredParams<
  Params extends Record<string, unknown>,
  Output extends Params
>(paramsFromAI: Params, schema: OpenAPIV3_1.SchemaObject): Output {
  /** Combines the parameters from the AI with parameters where no
   * choice is required by the AI. **/
  const noChoiceParams = getFilledNoChoiceRequiredFields(schema);
  return combineParams(paramsFromAI, noChoiceParams);
}

interface Params {
  [key: string | number]: any;
}

function combineParams<
  ParamsA extends Params,
  ParamsB extends Params,
  OutParams extends ParamsA & ParamsB
>(a: ParamsA, b: ParamsB): OutParams {
  /** This function combines two objects, with b overwriting a in
   * the case of a clash. **/
  // TODO: Doesn't deal with arrays yet, only deals with nested objects
  let out = { ...a } as unknown as OutParams;

  for (let key in b) {
    if (b.hasOwnProperty(key)) {
      // If key is in both objects and both values are objects,
      //  then recursively combine them
      if (
        typeof b[key] === "object" &&
        b[key] !== null &&
        !Array.isArray(b[key]) &&
        out[key] &&
        typeof out[key] === "object" &&
        !Array.isArray(out[key])
      ) {
        out[key] = combineParams(out[key], b[key]);
      } else {
        // @ts-ignore
        out[key] = b[key];
      }
    }
  }
  return out;
}
