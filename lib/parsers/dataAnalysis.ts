export function parseDataAnalysisResponse(
  response: string,
  userDefinedVariables: string[] = [],
): { code: string } | null {
  const codeRegex =
    /\n```(javascript|typescript|js|ts)?\n([\w\W]+?)\n```/g.exec(response);
  if (!codeRegex) {
    console.error("No code block found in:\n---\n" + response + "\n---");
    return null;
  }
  const rawCode = codeRegex[2];

  // Automated output checks below

  // Remove comments (stops false positives from comments containing illegal stuff)
  const code = rawCode.replace(/\/\/.*/g, "");

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
