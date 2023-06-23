import {describe, expect, it} from "@jest/globals";
import {parseOutput} from "../lib/parsers/parsers";


describe("Parsers", () => {
    it("should not error", () => {
      const output = parseOutput("Reasoning: We have successfully retrieved the recent information about Mr. Daniel Solís Martínez's case. The most recent event is an insurance note related to water damage from a plumbing issue. The claim has not yet been completed and the case has been passed on to WekLaw.\n" +
        "\n" +
        "Plan:\n" +
        "- Inform the user about the retrieved information.\n" +
        "\n" +
        "Commands:\n" +
        "\n" +
        "Completed:")
        expect(output).toBeDefined()
        expect(output.reasoning).toBe("We have successfully retrieved the recent information about Mr. Daniel Solís Martínez's case. The most recent event is an insurance note related to water damage from a plumbing issue. The claim has not yet been completed and the case has been passed on to WekLaw.")
        expect(output.plan).toBe("- Inform the user about the retrieved information.")
        expect(output.tellUser).toBe("")
        expect(output.commands).toStrictEqual([])
        expect(output.completed).toBe(false)
    });
    it("should not error including tell user", () => {
        const output = parseOutput("Reasoning:\n" +
        "The user's request is vague and needs clarification. We need to understand what kind of trap they are referring to, for which customer this is for, and what the context of the scheduling is about.\n" +
        "\n" +
        "Plan:\n" +
        "- Ask the user for more information about the type of trap, the customer involved, and any other relevant details.\n" +
        "\n" +
        "Tell user:\n" +
        "Could you please provide more information? Who is the customer we need to schedule a trap for and what type of trap are we talking about?\n" +
        "\n" +
        "Completed:")
        expect(output).toBeDefined()
        expect(output.reasoning).toBe("The user's request is vague and needs clarification. We need to understand what kind of trap they are referring to, for which customer this is for, and what the context of the scheduling is about.")
        expect(output.plan).toBe("- Ask the user for more information about the type of trap, the customer involved, and any other relevant details.")
        expect(output.tellUser).toBe("Could you please provide more information? Who is the customer we need to schedule a trap for and what type of trap are we talking about?")
        expect(output.commands).toStrictEqual([])
        expect(output.completed).toBe(false)
    })
    it("should not error no plan, no commands", () => {
      const output = parseOutput("Reasoning: We have successfully retrieved the recent information about Mr. Nestor Alfaras's case.\n" +
          "\n" +
          "Tell user: The most recent update for Mr. Nestor Alfaras's case is an insurance note which has been completed. The subproject type was Plumbing and the details were passed on to WekLaw.\n" +
          "\n" +
          "Completed: true");
      expect(output).toBeDefined()
      expect(output.reasoning).toBe("We have successfully retrieved the recent information about Mr. Nestor Alfaras's case.")
      expect(output.plan).toBe("")
      expect(output.tellUser).toBe("The most recent update for Mr. Nestor Alfaras's case is an insurance note which has been completed. The subproject type was Plumbing and the details were passed on to WekLaw.")
      expect(output.commands).toStrictEqual([])
      expect(output.completed).toBe(true)
    })
    it("should not error no plan, no commands", () => {
      const output = parseOutput("Reasoning: The search results show multiple individuals with the last name \"Martinez\". I need to clarify which Mr. Martinez the user is referring to.\n" +
          "\n" +
          "Plan:\n" +
          "- Ask the user to provide more information about Mr. Martinez so we can identify the correct person.\n" +
          "\n" +
          "Tell user: We have multiple customers with the last name Martinez. Could you please provide more information, such as a first name, to help identify the correct Mr. Martinez?\n" +
          "\n" +
          "Completed: question");
      expect(output).toBeDefined()
      expect(output.reasoning).toBe("The search results show multiple individuals with the last name \"Martinez\". I need to clarify which Mr. Martinez the user is referring to.")
      expect(output.plan).toBe("- Ask the user to provide more information about Mr. Martinez so we can identify the correct person.")
      expect(output.tellUser).toBe("We have multiple customers with the last name Martinez. Could you please provide more information, such as a first name, to help identify the correct Mr. Martinez?")
      expect(output.commands).toStrictEqual([])
      expect(output.completed).toBe(null)
    })
  }

)