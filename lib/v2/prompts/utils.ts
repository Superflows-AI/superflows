export function parseTellUser(output: string): string {
  // If no "Keyword: " is found, return the whole output
  if (!output.match(/^.+:\s?/m)) {
    return output;
  }

  // If "Tell user:" is found, return the string after it, but before the next "Keyword: "
  if (output.includes("Tell user:")) {
    const textAfterTellUser = output.split("Tell user:")[1];
    console.log("textAfterTellUser:", textAfterTellUser);
    return textAfterTellUser.split(/^.+:\s?$/m)[0].trim();
  }

  // Otherwise, return an empty string
  return "";
}
