export function parseDataAnalysisResponse(
  response: string,
  userDefinedVariables: string[] = [],
): { code: string } | { error: string } | null {
  /** Parses the response from the LLM in data analysis mode. Returns the code **/
  const codeRegex =
    /\n```(javascript|typescript|js|ts)?\n([\w\W]+?)\n```/g.exec(response);
  if (!codeRegex) {
    console.error("No code block found in:\n---\n" + response + "\n---");
    return null;
  }
  const rawCode = codeRegex[2];

  // Automated output checks below

  // Check if it's just an error
  const errorMatch = /^\n?throw new Error\((.*)\);?$/.exec(rawCode);
  if (errorMatch) {
    console.error(`Error message from generated code: ${errorMatch[1]}`);
    // slice(1, -1) removes the quotes from the error message
    return { error: errorMatch[1].slice(1, -1) };
  }
  // Remove comments (stops false positives from comments containing illegal stuff) & convert from TS to JS
  const code = stripBasicTypescriptTypes(rawCode.replace(/\/\/.*/g, ""));

  // Check that fetch(), eval(), new Function() and WebAssembly aren't used
  const illegalRegexes = [
    /fetch\([\w\W]\)/,
    /eval\([\w\W]\)/,
    /new Function\([\w\W]\)/,
    /WebAssembly\./,
  ];
  for (const regex of illegalRegexes) {
    if (regex.test(code)) {
      console.error(
        `Illegal code found by ${String(regex)}:\n---\n${code}\n---`,
      );
      return null;
    }
  }

  // Check expected variable is defined
  const expectedVarName = [/var graphData/, /let graphData/, /const graphData/];
  const expectedVarFound = expectedVarName.some((regex) => regex.test(code));
  if (!expectedVarFound) {
    console.error(
      `Expected variable 'graphData' not found:\n---\n${code}\n---`,
    );
    return null;
  }

  // Check that the userDefined variables haven't been redefined
  const userDefinedVarNameRegexes = userDefinedVariables
    .map((v) => [
      new RegExp(`var ${v}`),
      new RegExp(`let ${v}`),
      new RegExp(`const ${v}`),
    ])
    .flat();
  const userDefinedVarFound = userDefinedVarNameRegexes.some((regex) =>
    regex.test(code),
  );
  if (userDefinedVarFound) {
    console.error(`User-defined variable redefined:\n---\n${code}\n---`);
    return null;
  }

  return { code };
}

function stripBasicTypescriptTypes(jsCodeString: string): string {
  // Remove type definitions like `: string`, `: number`, `: any` etc.
  jsCodeString = jsCodeString.replace(/:\s*\w*(?=\s*=\s*)/g, "");

  // Remove interface definitions
  jsCodeString = jsCodeString.replace(
    /(export )?interface\s+\w+\s*\{[^}]+\}/g,
    "",
  );

  return jsCodeString;
}
