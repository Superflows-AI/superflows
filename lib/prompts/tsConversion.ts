import { OpenAPIV3_1 } from "openapi-types";
import { isChoiceRequired } from "../actionUtils";
import {
  formatDescription,
  formatReqBodySchema,
  getType,
  removeMarkdownLinks,
} from "./chatBot";
import { Action } from "../types";
import { getJsonMIMEType } from "../edge-runtime/utils";
import { snakeToCamel } from "../../pages/api/swagger-to-actions";

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
  parentArrayOfObjects: boolean = false,
): string {
  /** Recursive function to parse an OpenAPI Schema object into a Superflows GPT-able string.
   * Only works for requestBody right now since readOnly parameters are ignored. **/
  if (!schema) return "";
  let paramString = "";
  if (schema.type === "object") {
    // Objects
    const required = schema?.required ?? [];
    if (nestingLevel !== 0) {
      paramString += `${isRequired ? "" : "?"}: {`;
      if (schema.description && !parentArrayOfObjects) {
        paramString += formatDescriptionTS(schema.description);
      }
      // } else {
      //   paramString += "{";
    }
    if (schema.properties) {
      const properties = schema.properties as {
        [name: string]: OpenAPIV3_1.SchemaObject;
      };

      Object.entries(properties).forEach(([key, value]) => {
        // Throw out readonly attributes
        if (value.readOnly) return;

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
        )}`;
      });
      if (nestingLevel === 0) {
        paramString = paramString.slice(1);
      } else {
        paramString += "\n}";
      }
    }
  } else if (schema.type === "array") {
    // Arrays
    const items = schema.items as OpenAPIV3_1.SchemaObject;
    if (items.type === "object") {
      // Arrays of objects require special handling
      paramString += `${isRequired ? "" : "?"}: {${formatDescriptionTS(
        schema.description,
      )}\n${formatBodySchemaToTS(items, nestingLevel, false, true)
        .split("\n")
        .slice(1)
        .join("\n")}[]`;
    } else {
      // Arrays of non-objects (incl. other arrays)
      const des = formatDescriptionTS(
        schema.description || `array of ${items.description}`,
      );
      const type = getType(items.type, items.enum).toString();
      // Below startsWith logic is to ensure that we wrap enums in (...)
      paramString += `${isRequired ? "" : "?"}: ${
        type.includes("|") ? `(${type})` : type
      }[]${des}`;
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

export function getTSActionDescriptions(
  actions: Action[],
  includeParams: boolean = true,
): string {
  /** Gets the list of actions, their parameters and their descriptions. **/
  if (actions.length === 0) {
    console.error("No actions provided to getTSActionDescriptions!");
    return "";
  }
  let functions = "";

  actions.forEach((action: Action) => {
    let paramString = "";
    // For parameters
    if (action.parameters && Array.isArray(action.parameters)) {
      action.parameters.forEach((param) => {
        const p = param as unknown as OpenAPIV3_1.ParameterObject;
        const schema = (p?.schema as OpenAPIV3_1.SchemaObject) ?? null;
        // Below case is cursed: required param with 1 enum. Skip it.
        if (schema.enum && schema.enum.length === 1 && p.required) return;

        // Only show examples if there are no enums
        // Note: using "Example:" rather than "E.g." because it's 1 fewer token
        const example =
          (schema.example || p.example) && !schema.enum
            ? ` Example: ${schema.example || p.example}`
            : "";
        let desc = formatDescriptionTS(p.description);
        if (example) {
          if (desc && !desc.endsWith(".")) {
            desc += ".";
          } else if (!desc.startsWith(" // ")) {
            desc = " //" + desc;
          }
          desc += example;
        }

        paramString += `\n${p.name}${p.required ? "" : "?"}: ${getType(
          schema.type,
          schema.enum,
        )}${desc}`;
      });
    }
    const reqBody = action.request_body_contents as unknown as {
      [media: string]: OpenAPIV3_1.MediaTypeObject;
    };
    // TODO: Support content-types other than application/json
    const jsonSchema = getJsonMIMEType(reqBody);
    if (jsonSchema) {
      paramString += "\n" + formatBodySchemaToTS(jsonSchema.schema);
    } else if (Object.keys(action.request_body_contents ?? {}).length > 0) {
      console.error(`No application/json in request body for ${action.name}.`);
    }
    const description = formatDescriptionTS(action.description).slice(4);
    functions += `${
      description ? `\n/** ${description.split("\n").join("\n* ")} **/\n` : ""
    }function ${action.name}(${
      !includeParams ? "" : paramString ? "args: {" + paramString + "\n}" : ""
    })\n`;
  });
  return functions;
}
