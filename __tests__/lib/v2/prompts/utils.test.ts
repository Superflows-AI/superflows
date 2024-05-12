import { parseTellUser } from "../../../../lib/v2/prompts/utils";

describe("parseTellUser", () => {
  it("empty", () => {
    expect(parseTellUser("")).toEqual("");
  });
  it("no keyword", () => {
    expect(parseTellUser("hello")).toEqual("hello");
  });
  it("no keyword, multiple lines", () => {
    expect(parseTellUser("hello\nworld")).toEqual("hello\nworld");
  });
  it("Just tell user", () => {
    expect(parseTellUser("Tell user: hello")).toEqual("hello");
  });
  it("Other section, no tell user", () => {
    expect(parseTellUser("Thoughts: hello")).toEqual("Thoughts: hello");
  });
  it("Other section, tell user", () => {
    expect(parseTellUser("Thoughts: hello\nTell user: world")).toEqual("world");
  });
  it("Other section, tell user, multiple lines", () => {
    expect(parseTellUser("Thoughts: hello\nTell user: world\nworld")).toEqual(
      "world\nworld",
    );
  });
  it("Wacky real world example", () => {
    const input = `Tell user: 
Ava interacted with multiple companies this week. Here is a list of those companies:

1. Company A
2. Company B
3. Company C
4. Company D
5. Company E
6. Company F
7. Company G
8. Company H

Reasoning:
1. The coder used the search_engagements function with the specified parameters to retrieve Ava's engagements this week.
2. For each engagement, they then used the search_contacts function to get the associated contact's information.
3. However, based on the logs, it appears that there was no data returned for the companies Ava interacted with.
4. This could be due to a lack of data or an issue with retrieving company information from contact IDs.

Please note that without specific company names in our database, I am unable to provide you with more detailed information about these interactions at this time.

If you have any other questions or need further assistance, please let me know!`;
    expect(parseTellUser(input)).toEqual(
      `Ava interacted with multiple companies this week. Here is a list of those companies:

1. Company A
2. Company B
3. Company C
4. Company D
5. Company E
6. Company F
7. Company G
8. Company H`,
    );
  });
});
