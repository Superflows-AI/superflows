import { OpenAPIV3_1 } from "openapi-types";
import { isChoiceRequired } from "../actionUtils";
import { getType, removeMarkdownLinks } from "./chatBot";
import { Action } from "../types";
import { getJsonMIMEType } from "../edge-runtime/utils";
import { objectNotEmpty, snakeToCamel } from "../utils";

function formatDescriptionTS(description: string | undefined | null): string {
  /** Formats a parameter description for GPT. **/
  let des = removeMarkdownLinks(description?.trim() ?? "");
  if (des.length > 0) {
    des = " // " + des;
  }
  return des;
}

export function formatBodySchemaToTS(
  schema: OpenAPIV3_1.SchemaObject | undefined,
  nestingLevel: number = 0,
  isRequired: boolean = false,
  parentArrayOfObjects: boolean = false, // Set in the loop due to recursion
  bodyOrResponse: "body" | "response" = "body", // Determines whether to skip readOnly or writeOnly attributes
): string {
  /** Recursive function to parse an OpenAPI Schema object into Typescript type definition. **/
  if (!schema) return "";
  let paramString = "";
  if (schema.type === "object") {
    // Objects
    const required = schema?.required ?? [];
    if (nestingLevel === 0) {
      // Top-level object
      paramString += "{";
    } else {
      paramString += `${isRequired ? "" : "?"}: {`;
      if (!schema.properties) paramString = paramString.slice(0, -1) + "object";
      if (schema.description && !parentArrayOfObjects) {
        paramString += formatDescriptionTS(schema.description);
      }
    }
    if (schema.properties) {
      const properties = schema.properties as {
        [name: string]: OpenAPIV3_1.SchemaObject;
      };

      Object.entries(properties).forEach(([key, value]) => {
        // Throw out readonly attributes if body
        if (value.readOnly && bodyOrResponse === "body") return;
        // Throw out writeonly attributes if response
        if (value.writeOnly && bodyOrResponse === "response") return;

        // Below case is when no choice is required for a parameter - it's when
        // a required parameter is an enum with only one value
        // We skip it since there's no decision to be made and it costs tokens
        if (!isChoiceRequired(value, required.includes(key))) {
          return;
        }
        paramString += `\n${key}${formatBodySchemaToTS(
          value,
          nestingLevel + 1,
          required.includes(key),
          false,
          bodyOrResponse,
        )}`;
      });
      paramString += "\n}";
    }
  } else if (schema.type === "array") {
    // Arrays
    const items = schema.items as OpenAPIV3_1.SchemaObject;
    if (!items) {
      paramString += `${isRequired ? "" : "?"}: any[]${formatDescriptionTS(
        schema.description,
      )}`;
    } else if (items.type === "object") {
      // Arrays of objects require special handling
      if (nestingLevel !== 0) {
        paramString += `${isRequired ? "" : "?"}: `;
      }
      paramString += `{${formatDescriptionTS(
        schema.description,
      )}\n${formatBodySchemaToTS(
        items,
        nestingLevel + 1,
        false,
        true,
        bodyOrResponse,
      )
        .split("\n")
        .slice(1)
        .join("\n")}[]`;
    } else {
      // Arrays of non-objects (incl. other arrays)
      let des = "";
      if (schema.description || items.description) {
        des = formatDescriptionTS(
          schema.description || `array of ${items.description}`,
        );
      }
      const type = getType(items.type, items.enum).toString();
      if (nestingLevel !== 0) {
        paramString += `${isRequired ? "" : "?"}: `;
      }
      // Below includes logic is to ensure that we wrap enums in (...)
      paramString += `${type.includes("|") ? `(${type})` : type}[]${des}`;
    }
  } else {
    // TODO: Support object-level examples (if parent has example defined)
    // Only show examples if there are no enums
    // Note: using "Example:" rather than "E.g." because it's 1 fewer token
    let desc = formatDescriptionTS(schema.description ?? schema.format);
    const example =
      schema.example && !schema.enum ? ` Example: ${schema.example}` : "";
    if (example) {
      if (!desc.startsWith(" // ")) {
        desc = " // " + desc;
      }
      if (!desc.endsWith(".")) {
        desc += ".";
      }
      desc += example;
    }
    // Non-object, non-array
    paramString += `${isRequired ? "" : "?"}: ${getType(
      schema.type,
      schema.enum,
    )}${desc}`;
  }
  return paramString;
}

export function getActionTSSignature(
  action: Action,
  includeReturnType: boolean = false,
  returnedObject: any = null,
): string {
  /** Gets the Typescript function signature for an action.
   *
   * action: The action to get the signature for.
   * includeReturnType: Whether to include the return type in the signature.
   * returnedObject: The object returned by the action, if it has already been called.
   * **/
  // TODO: Doesn't work well for non-object schemas
  let paramString = "";
  // Below is a deepcopy
  returnedObject = returnedObject
    ? JSON.parse(JSON.stringify(returnedObject))
    : null;
  // For parameters
  if (action.parameters && Array.isArray(action.parameters)) {
    action.parameters.forEach((param) => {
      const p = param as unknown as OpenAPIV3_1.ParameterObject;
      const schema = (p?.schema ?? null) as OpenAPIV3_1.SchemaObject | null;
      // Below case is cursed: required param with 1 enum. Skip it.
      if (schema && schema.enum && schema.enum.length === 1 && p.required)
        return;

      let desc = formatDescriptionTS(p.description);
      let type;
      if (schema) {
        // Only show examples if there are no enums
        // Note: using "Example:" rather than "E.g." because it's 1 fewer token
        const example =
          (schema.example || p.example) && !schema.enum
            ? ` Example: ${schema.example || p.example}`
            : "";
        if (example) {
          if (desc && !desc.endsWith(".")) {
            desc += ".";
          } else if (!desc.startsWith(" // ")) {
            desc = " //" + desc;
          }
          desc += example;
        }
        type = getType(schema.type, schema.enum);
      }
      if (typeof type === "string" && ["object", "array"].includes(type)) {
        paramString += `\n${p.name}${p.required ? "" : "?"}: ${
          schema ? formatBodySchemaToTS(schema, 0, p.required) : ""
        }`;
      } else {
        paramString += `\n${p.name}${p.required ? "" : "?"}: ${
          type ?? "any"
        }${desc}`;
      }
    });
  }
  const reqBody = action.request_body_contents as unknown as {
    [media: string]: OpenAPIV3_1.MediaTypeObject;
  };
  // TODO: Support content-types other than application/json
  const jsonSchema = getJsonMIMEType(reqBody);
  if (jsonSchema) {
    let bodyTSType = formatBodySchemaToTS(jsonSchema.schema);
    if ((jsonSchema.schema as OpenAPIV3_1.SchemaObject).type === "object") {
      bodyTSType = `${bodyTSType.slice(2, -2)}`;
    }
    paramString += "\n" + bodyTSType;
  } else if (Object.keys(action.request_body_contents ?? {}).length > 0) {
    console.error(`No application/json in request body for ${action.name}.`);
  }
  const description = formatDescriptionTS(action.description).slice(4);

  const out = `${
    description ? `\n/** ${description.split("\n").join("\n* ")} **/\n` : ""
  }function ${snakeToCamel(action.name)}(${
    paramString ? "args: {" + paramString + "\n}" : ""
  })`;

  if (!includeReturnType) return out + "\n";

  // Add return type
  // @ts-ignore
  const responses = action.responses as Record<
    string,
    OpenAPIV3_1.ResponseObject
  > | null;
  let returnType = "";
  // If it's there, start off with the schema from the API spec
  if (responses !== null) {
    for (let n = 200; n < 300; n++) {
      const nString = n.toString();
      if (responses[nString].content?.["application/json"]) {
        returnType = formatBodySchemaToTS(
          responses[nString].content!["application/json"].schema,
          0,
          false,
          false,
          "response",
        );
        console.log("returnType", returnType);
        break;
      }
    }
  }
  // If we have a returned object
  if (returnedObject) {
    if (!returnType) {
      // Either construct a type from scratch
      returnType = getObjectTSType(returnedObject);
    } else {
      // Or use it to remove irrelevant parts of the schema
      returnType = removeUnnecessaryTSTypeArgs(returnType, returnedObject);
    }
  }
  // Set to any as fallback
  returnType = returnType || "any";
  return out + ": " + returnType + "\n";
}

export function getActionTSSignatures(actions: Action[]): string {
  /** Gets the list of actions, their parameters and their descriptions. **/
  if (actions.length === 0) {
    console.error("No actions provided to getTSActionDescriptions!");
    return "";
  }

  return actions.map((action) => getActionTSSignature(action)).join("");
}

export function getObjectTSType(object: any): string {
  /** Gets the Typescript type definition for an object. **/
  if (Array.isArray(object)) {
    // Array
    if (object.length === 0) {
      return "null[]";
    }
    return `${getObjectTSType(object[0])}[]`;
  } else if (typeof object === "object") {
    let paramString = "{";
    Object.entries(object).forEach(([key, value]) => {
      paramString += `\n${key}: ${getObjectTSType(value)}`;
    });
    paramString += "\n}";
    return paramString;
  }
  return typeof object;
}

export function removeUnnecessaryTSTypeArgs(
  tsType: string,
  exampleObj: any,
): string {
  const schemaLines = tsType.split("\n");
  const newLines = [];
  const parentObjects: any[] = [];
  let currentObject = exampleObj;

  for (let i = 0; i < schemaLines.length; i++) {
    const line = schemaLines[i];
    const lineNoComment = line.split(" //")[0];

    if (i === 0 && line.startsWith("{")) {
      // First line "{"
      newLines.push(line);
    } else if (lineNoComment.includes("{")) {
      const fieldName = line.split(/\??:/)[0].trim();
      let fields = Array.isArray(currentObject)
        ? currentObject.map((obj) => obj[fieldName])
        : [currentObject ? currentObject[fieldName] : undefined];
      if (fields.some(itemNotEmpty)) {
        // Add the line to the new schema
        newLines.push(line);
      } // Otherwise, skip this line - it isn't in the output object
      // If we have a field, push it onto the stack
      parentObjects.push(currentObject);
      currentObject = fields.find(itemNotEmpty);
    } else if (["}", "}[]"].includes(line)) {
      if (currentObject) newLines.push(line);
      // If we're at the end of an object, pop it off the stack
      currentObject = parentObjects.pop();
    } else {
      // Otherwise, we're in the middle of an object
      const fieldName = line.split(/\??:/)[0].trim();
      let fields = Array.isArray(currentObject)
        ? currentObject.map((obj) => obj[fieldName])
        : [currentObject ? currentObject[fieldName] : undefined];
      if (fields.some(itemNotEmpty)) {
        newLines.push(line);
      }
    }
  }
  return newLines.join("\n");
}

function itemNotEmpty(item: any): boolean {
  return Array.isArray(item)
    ? item.length > 0
    : typeof item === "object" && item !== null
    ? objectNotEmpty(item)
    : item !== undefined;
}
