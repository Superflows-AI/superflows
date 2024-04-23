export async function exponentialRetryWrapper<Args extends Array<any>, Output>(
  func: (...args: Args) => Promise<Output>,
  args: Args,
  retries: number,
): Promise<Output> {
  const t1 = Date.now();
  console.info("Starting exponentialRetryWrapper for function " + func.name);
  try {
    const res = await func(...args);
    console.info(
      `Exponential retry wrapper completed in ${Date.now() - t1} ms for func "${
        func.name
      }". There were ${retries - 1} retries remaining.`,
    );
    return res;
  } catch (error) {
    console.info(
      `Error in exponentialRetryWrapper for function ${func.name}. The error is: ${error}}`,
    );
    if (retries > 0) {
      console.info(`Retrying ${func.name} in ${2 ** (10 - retries)}ms`);
      await new Promise((r) => setTimeout(r, 2 ** (10 - retries)));
      return await exponentialRetryWrapper(func, args, retries - 1);
    } else {
      throw error;
    }
  }
}

function deleteUndefined<InputType extends Record<string, any | undefined>>(
  obj: InputType,
): Partial<InputType> {
  for (let key in obj) {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  }
  return obj;
}

export function deduplicateArray<ArrType extends any[]>(
  arr: ArrType,
): Partial<ArrType | { items: Partial<ArrType>[] }> {
  if (arr.length === 0) return {};
  // Check for null, undefined, string, number, boolean or array
  if (
    arr.some((ele) => !ele || typeof ele !== "object" || Array.isArray(ele))
  ) {
    return arr;
  }
  const firstEle = arr[0];
  let output: Record<string, any> = { items: [] };

  Object.keys(firstEle).forEach((key) => {
    const allValues = arr.map((ele) => ele[key]);
    if (allValues.every((val) => val === allValues[0])) {
      output[key] = allValues[0];
    } else if (output.items.length === 0) {
      output.items = arr.map((ele) => ({ [key]: ele[key] }));
    } else {
      output.items.forEach((item: any, i: number) => {
        item[key] = arr[i][key];
      });
    }
  });
  if (output.items.length === 0) {
    delete output.items;
  } else {
    output.items = output.items.map((item: any) => {
      return deleteUndefined(item);
    });
  }

  // If there's no duplication (everything in 'items') then keep it as an array
  if (Object.keys(output).length === 1 && "items" in output) {
    return output.items;
  }

  return output;
}

export function filterKeys<InputObject extends any>(
  obj: InputObject,
  keysToKeep: string[],
): any {
  if (!obj || typeof obj !== "object") return obj;
  else if (Array.isArray(obj)) {
    return obj.map((ele) => filterKeys(ele, keysToKeep));
  } else {
    const output: Record<string, any> = {};
    Object.entries(obj).forEach(([key, value]) => {
      // Not array or object
      if (!value || typeof value !== "object") {
        if (keysToKeep.includes(key)) {
          output[key] = value;
        }
        return;
      }
      // Array
      if (Array.isArray(value)) {
        // If the array is empty, don't add it
        const val = value.map((ele) => filterKeys(ele, keysToKeep));
        if (val.length > 0) {
          output[key] = val;
        }
      }
      // Object
      const val = filterKeys(value, keysToKeep);
      // If the object is empty, don't add it
      if (Object.keys(val).length > 0) {
        output[key] = val;
      }
    });

    return output;
  }
}

export function snakeToCamel(str: string): string {
  return str.replace(/(_\w)/g, function (m: string): string {
    return m[1].toUpperCase();
  });
}

export function getJsonMIMEType<inObj>(
  inputDict: Record<string, inObj> | undefined | null,
): inObj | undefined {
  if (!inputDict) return undefined;
  if ("application/json" in inputDict) {
    return inputDict["application/json"];
  } else if ("*/*" in inputDict) {
    return inputDict["*/*"];
  } else if ("*/json" in inputDict) {
    return inputDict["*/*"];
  } else {
    return undefined;
  }
}

export function getHeader(
  headers: { [key: string]: string } | Headers | null,
  name: string,
): string | null {
  if (headers === null) return null;
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase());
  }
  // @ts-ignore
  return headers[name] || headers[name.toLowerCase()] || null;
}

export function getParam(
  parameters: Record<string, any>,
  key: string,
  allowObjects: boolean = false,
): any {
  let out: any = undefined;
  if (key in parameters) out = parameters[key];
  if (!out) {
    // Sometimes (rarely) the AI replaces hyphens with underscores. This is a hacky fix
    const found = Object.keys(parameters).find(
      (k) => k.replace(/-/g, "_") === key.replace(/-/g, "_"),
    );
    if (found) out = parameters[found];
  }
  if (out === undefined) return undefined;
  if (allowObjects && typeof out === "object") {
    return JSON.stringify(out);
  }
  return out;
}

export function parseErrorHtml(str: string): string {
  const elements = [];
  const regexes = [
    /<title.*?>(.*)<\/title>/,
    /<h1.*?>(.*)<\/h1>/,
    /<h2.*?>(.*)<\/h2>/,
    /<h3.*?>(.*)<\/h3>/,
  ];
  for (const regex of regexes) {
    const match = str.match(regex);
    if (match) {
      elements.push(match[1].trim().replace(/\s+/g, " "));
    }
  }
  const result = elements.filter(Boolean).join("\n");
  return result.length > 0 ? result : str;
}

export function formatString() {
  const args = Array.prototype.slice.call(arguments);
  if (args.length === 0) return null;
  if (args.length === 1) {
    if (typeof args[0] === "object") {
      return JSON.stringify(args[0]);
    }
    return String(args[0]);
  }
  let firstArg = args[0];
  let i = 1;
  let formatted = "";
  if (typeof firstArg === "string") {
    firstArg.replace(/%([a-z%])/g, function (x: string) {
      if (i < args.length) {
        switch (x) {
          case "%s":
            return String(args[i++]);
          case "%d":
            return Number(args[i++]);
          case "%j":
            return JSON.stringify(args[i++]);
          case "%%":
            return "%";
          default:
            return x;
        }
      } else {
        return x;
      }
    });
  } else {
    formatted = JSON.stringify(firstArg);
  }
  for (; i < args.length; i++) {
    formatted += JSON.stringify(args[i]);
  }
  return formatted;
}

export function formatError(e: any, code: string) {
  let stackTrace =
    "" + (typeof e === "object" && e !== null && "stack" in e ? e.stack : "");
  let irrelevantStackIdx = stackTrace
    .split("\n")
    .findIndex((line) => line.includes("doNotWriteAnotherFunctionCalledThis"));
  if (irrelevantStackIdx === -1) {
    irrelevantStackIdx = stackTrace
      .split("\n")
      .findIndex((line) => line.includes("execute-code-2"));
  }
  return stackTrace
    .split("\n")
    .slice(0, irrelevantStackIdx)
    .map((line) =>
      line.replace(
        /eval at <anonymous>.*<anonymous>:(\d{1,3}):(\d{1,4})/g,
        (_, lineNumStr, charNumStr) => {
          const errLineNum = parseInt(lineNumStr);
          const aiCodeStartLineNum =
            code
              .split("\n")
              .findIndex((line) => line === "// AI code starts below") + 1;
          return `line ${errLineNum - aiCodeStartLineNum}, char ${charNumStr}`;
        },
      ),
    )
    .join("\n");
}
