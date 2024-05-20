import {
  explainPlotChatPrompt,
  formatChatHistoryToAnthropicFormat,
} from "../../../../lib/v3/prompts_parsers/explanation";

const USERMESSAGE = {
  role: "user",
  content: "Plot the data",
};

describe("explainPlotChatPrompt", () => {
  it("table, English", () => {
    const prompt = explainPlotChatPrompt(
      JSON.parse(
        JSON.stringify([
          USERMESSAGE,
          {
            role: "function",
            name: "plot",
            content: JSON.stringify({ type: "table", data: [] }),
          },
        ]),
      ),
      "",
      {
        name: "org",
        description: "description",
        chatbot_instructions: "instructions",
      },
      "English",
      false,
    );
    expect(prompt).toHaveLength(3);
    expect(prompt[0]).toEqual({
      role: "system",
      content: `You are org AI. You help answer user questions. Your task is to write text to complement the table to help the user understand the data better. Follow all the <rules></rules>

<facts>
1. description
2. Today's date is ${new Date().toISOString().split("T")[0]}
</facts>

<rules>
1. Answer the user's question. What you write accompanies the table
2. DO NOT repeat the table contents in a list or in text. THIS IS VERY IMPORTANT. DO NOT FORGET THIS.
3. BE CONCISE
4. Write the contents of <tellUser></tellUser> in English
5. instructions
6. Your reply must follow the <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step: which rules apply?
2. what has the user asked?
3. what does the table show?
4. which key information should be given to the user as a summary (not entire table)?
</thinking>
<tellUser>
Answer the user's request without repeating the table in full

Explain how the table was generated (don't mention functions by name) and how numbers were calculated based on the logs
</tellUser>
</format>`,
    });
    expect(prompt[2]).toEqual({
      role: "assistant",
      content: `<thinking>
1. Which rules apply? I must not list the table's contents.
2. What has the user asked? The user has asked`,
    });
  });
  it("logs only, English", () => {
    const prompt = explainPlotChatPrompt(
      JSON.parse(
        JSON.stringify([
          USERMESSAGE,
          {
            role: "function",
            name: "logs",
            content: "These are some logs",
          },
        ]),
      ),
      "",
      {
        name: "org",
        description: "description",
        chatbot_instructions: "instructions",
      },
      "English",
      false,
    );
    expect(prompt).toHaveLength(3);
    expect(prompt[0]).toEqual({
      role: "system",
      content: `You are org AI. You help answer user questions. Your task is to help the user. Follow all the <rules></rules>

<facts>
1. description
2. Today's date is ${new Date().toISOString().split("T")[0]}
</facts>

<rules>
1. Answer the user's question
2. Repeat all information in the logs that answers the user's question - the user cannot see the logs
3. BE CONCISE
4. Write the contents of <tellUser></tellUser> in English
5. instructions
6. Your reply must follow the <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step: which rules apply?
2. what has the user asked?
</thinking>
<tellUser>
Answer the user's request

Explain how numbers were calculated based on the logs and don't mention functions by name
</tellUser>
</format>`,
    });
    expect(prompt[2]).toEqual({
      role: "assistant",
      content: `<thinking>
1. Which rules apply? I must answer the user's question, including all useful information from the logs.
2. What has the user asked? The user has asked`,
    });
  });
  it("chart, English", () => {
    const prompt = explainPlotChatPrompt(
      JSON.parse(
        JSON.stringify([
          USERMESSAGE,
          {
            role: "function",
            name: "plot",
            content: JSON.stringify({ type: "line", data: [] }),
          },
        ]),
      ),
      "",
      {
        name: "org",
        description: "description",
        chatbot_instructions: "instructions",
      },
      "English",
      false,
    );
    expect(prompt).toHaveLength(3);
    expect(prompt[0]).toEqual({
      role: "system",
      content: `You are org AI. You help answer user questions. Your task is to write text to complement the graph to help the user understand the data better. Follow all the <rules></rules>

<facts>
1. description
2. Today's date is ${new Date().toISOString().split("T")[0]}
</facts>

<rules>
1. Answer the user's question. What you write accompanies the graph
2. DO NOT repeat the graph contents in a list or in text. THIS IS VERY IMPORTANT. DO NOT FORGET THIS.
3. BE CONCISE
4. Write the contents of <tellUser></tellUser> in English
5. instructions
6. Your reply must follow the <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step: which rules apply?
2. what has the user asked?
3. what does the graph show?
4. which key information should be given to the user as a summary (not entire graph)?
</thinking>
<tellUser>
Answer the user's request without repeating the graph in full

Explain how the graph was generated (don't mention functions by name) and how numbers were calculated based on the logs
</tellUser>
</format>`,
    });
    expect(prompt[2]).toEqual({
      role: "assistant",
      content: `<thinking>
1. Which rules apply? I must not list the graph's contents.
2. What has the user asked? The user has asked`,
    });
  });
  // Spanish
  it("table, Spanish", () => {
    const prompt = explainPlotChatPrompt(
      JSON.parse(
        JSON.stringify([
          USERMESSAGE,
          {
            role: "function",
            name: "plot",
            content: JSON.stringify({ type: "table", data: [] }),
          },
        ]),
      ),
      "",
      {
        name: "org",
        description: "description",
        chatbot_instructions: "instructions",
      },
      "Spanish",
      false,
    );
    expect(prompt).toHaveLength(3);
    expect(prompt[0]).toEqual({
      role: "system",
      content: `You are org AI. You help answer user questions. Your task is to write text to complement the table to help the user understand the data better. Follow all the <rules></rules>

<facts>
1. description
2. Today's date is ${new Date().toISOString().split("T")[0]}
</facts>

<rules>
1. Answer the user's question. What you write accompanies the table
2. DO NOT repeat the table contents in a list or in text. THIS IS VERY IMPORTANT. DO NOT FORGET THIS.
3. BE CONCISE
4. Write the contents of <tellUser></tellUser> in Spanish
5. instructions
6. Your reply must follow the <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step: which rules apply?
2. what has the user asked?
3. what does the table show?
4. which key information should be given to the user as a summary (not entire table)?
</thinking>
<tellUser>
Responda la solicitud del usuario sin repetir la tabla en su totalidad

Explique cómo se generó la tabla (no mencione las funciones por su nombre) y cómo se calcularon los números basándose en los registros
</tellUser>
</format>`,
    });
    expect(prompt[2]).toEqual({
      role: "assistant",
      content: `<thinking>
1. Which rules apply? I must not list the table's contents. And also I must write the <tellUser></tellUser> section in Spanish
2. What has the user asked? The user has asked`,
    });
  });
  it("logs only, Spanish", () => {
    const prompt = explainPlotChatPrompt(
      JSON.parse(
        JSON.stringify([
          USERMESSAGE,
          {
            role: "function",
            name: "logs",
            content: "These are some logs",
          },
        ]),
      ),
      "",
      {
        name: "org",
        description: "description",
        chatbot_instructions: "instructions",
      },
      "Spanish",
      false,
    );
    expect(prompt).toHaveLength(3);
    expect(prompt[0]).toEqual({
      role: "system",
      content: `You are org AI. You help answer user questions. Your task is to help the user. Follow all the <rules></rules>

<facts>
1. description
2. Today's date is ${new Date().toISOString().split("T")[0]}
</facts>

<rules>
1. Answer the user's question
2. Repeat all information in the logs that answers the user's question - the user cannot see the logs
3. BE CONCISE
4. Write the contents of <tellUser></tellUser> in Spanish
5. instructions
6. Your reply must follow the <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step: which rules apply?
2. what has the user asked?
</thinking>
<tellUser>
Responda la solicitud del usuario

Explique cómo se calcularon los números en función de los registros y no mencione las funciones por su nombre.
</tellUser>
</format>`,
    });
    expect(prompt[2]).toEqual({
      role: "assistant",
      content: `<thinking>
1. Which rules apply? I must answer the user's question, including all useful information from the logs. And also I must write the <tellUser></tellUser> section in Spanish
2. What has the user asked? The user has asked`,
    });
  });
  it("chart, Spanish", () => {
    const prompt = explainPlotChatPrompt(
      JSON.parse(
        JSON.stringify([
          USERMESSAGE,
          {
            role: "function",
            name: "plot",
            content: JSON.stringify({ type: "line", data: [] }),
          },
        ]),
      ),
      "",
      {
        name: "org",
        description: "description",
        chatbot_instructions: "instructions",
      },
      "Spanish",
      false,
    );
    expect(prompt).toHaveLength(3);
    expect(prompt[0]).toEqual({
      role: "system",
      content: `You are org AI. You help answer user questions. Your task is to write text to complement the graph to help the user understand the data better. Follow all the <rules></rules>

<facts>
1. description
2. Today's date is ${new Date().toISOString().split("T")[0]}
</facts>

<rules>
1. Answer the user's question. What you write accompanies the graph
2. DO NOT repeat the graph contents in a list or in text. THIS IS VERY IMPORTANT. DO NOT FORGET THIS.
3. BE CONCISE
4. Write the contents of <tellUser></tellUser> in Spanish
5. instructions
6. Your reply must follow the <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step: which rules apply?
2. what has the user asked?
3. what does the graph show?
4. which key information should be given to the user as a summary (not entire graph)?
</thinking>
<tellUser>
Responda la solicitud del usuario sin repetir el gráfico en su totalidad

Explique cómo se generó el gráfico (no mencione las funciones por su nombre) y cómo se calcularon los números basándose en los registros
</tellUser>
</format>`,
    });
    expect(prompt[2]).toEqual({
      role: "assistant",
      content: `<thinking>
1. Which rules apply? I must not list the graph's contents. And also I must write the <tellUser></tellUser> section in Spanish
2. What has the user asked? The user has asked`,
    });
  });
  it("user function function message history", () => {
    const prompt = explainPlotChatPrompt(
      JSON.parse(
        JSON.stringify([
          { role: "user", content: "Which guests have unanswered messages?" },
          {
            role: "function",
            name: "logs",
            content:
              "Logs and API calls from code execution:\n" +
              "getGuests(start=0, limit=2500)\n" +
              "There are 2500 guests with unanswered messages, which is 43.60%",
          },
          {
            role: "function",
            name: "plot",
            content:
              '{"type":"table","xLabel":"Guest","yLabel":"Unanswered messages","graphTitle":"Guests with unanswered messages","data":[{"name":"Polina Zitrin","unanswered_messages":true},{"name":"Melissa Parrott","unanswered_messages":true},{"name":"Komoto Coastal Properties Llc","unanswered_messages":true},<further elements cut for brevity (total length: 1090) - DO NOT pretend to know the data, instead tell the user to look at this table>]}',
          },
        ]),
      ),
      "",
      {
        name: "org",
        description: "description",
        chatbot_instructions: "",
      },
      "English",
      true,
    );
    expect(prompt).toHaveLength(3);
    expect(prompt[0].role).toEqual("system");
    expect(prompt[1].role).toEqual("user");
    expect(prompt[2].role).toEqual("assistant");
    expect(prompt[1]).toEqual({
      role: "user",
      content:
        "Which guests have unanswered messages?\n\n### FUNCTION:\nLogs and API calls from code execution:\n" +
        "getGuests(start=0, limit=2500)\n" +
        'There are 2500 guests with unanswered messages, which is 43.60%\n\n### FUNCTION:\n{"type":"table","xLabel":"Guest","yLabel":"Unanswered messages","graphTitle":"Guests with unanswered messages","data":[{"name":"Polina Zitrin","unanswered_messages":true},{"name":"Melissa Parrott","unanswered_messages":true},{"name":"Komoto Coastal Properties Llc","unanswered_messages":true},<further elements cut for brevity (total length: 1090) - DO NOT pretend to know the data, instead tell the user to look at this table>]}',
    });
  });
});

describe("formatChatHistoryToAnthropicFormat", () => {
  it("user function function message history", () => {
    const prompt = formatChatHistoryToAnthropicFormat(
      JSON.parse(
        JSON.stringify([
          USERMESSAGE,
          {
            role: "function",
            name: "logs",
            content: "These are some logs",
          },
          {
            role: "function",
            name: "plot",
            content: JSON.stringify({ type: "line", data: [] }),
          },
        ]),
      ),
    );
    expect(prompt).toHaveLength(1);
    expect(prompt[0]).toEqual({
      role: "user",
      content:
        'Plot the data\n\n### FUNCTION:\nThese are some logs\n\n### FUNCTION:\n{"type":"line","data":[]}',
    });
  });
  it("fn,user,fn,fn message history", () => {
    const prompt = formatChatHistoryToAnthropicFormat(
      JSON.parse(
        JSON.stringify([
          {
            role: "function",
            name: "plot",
            content: JSON.stringify({ type: "line", data: [] }),
          },
          USERMESSAGE,
          {
            role: "function",
            name: "logs",
            content: "These are some logs",
          },
          {
            role: "function",
            name: "plot",
            content: JSON.stringify({ type: "line", data: [] }),
          },
        ]),
      ),
    );
    expect(prompt).toHaveLength(1);
    expect(prompt[0]).toEqual({
      role: "user",
      content:
        'Plot the data\n\n### FUNCTION:\nThese are some logs\n\n### FUNCTION:\n{"type":"line","data":[]}',
    });
  });
  it("real world message history", () => {
    const prompt = formatChatHistoryToAnthropicFormat(
      JSON.parse(
        JSON.stringify([
          { role: "user", content: "how many items are badger supplier for?" },
          {
            role: "function",
            name: "logs",
            content: "Logs and API calls from code execution",
          },
          {
            role: "function",
            name: "plot",
            content: JSON.stringify({ type: "line", data: [] }),
          },
          { role: "user", content: "What are my suppliers?" },
          {
            role: "assistant",
            content:
              "I'm afraid I don't have a function available that can do that for you",
          },
          { role: "user", content: "How many suppliers do I have?" },
          {
            role: "function",
            name: "logs",
            content: "These are some logs",
          },
        ]),
      ),
    );
    expect(prompt).toHaveLength(3);
    expect(prompt).toEqual([
      {
        role: "user",
        content: "What are my suppliers?",
      },
      {
        role: "assistant",
        content:
          "I'm afraid I don't have a function available that can do that for you",
      },
      {
        role: "user",
        content:
          "How many suppliers do I have?\n\n### FUNCTION:\nThese are some logs",
      },
    ]);
  });
  it("DIRECT message history", () => {
    const prompt = formatChatHistoryToAnthropicFormat(
      JSON.parse(
        JSON.stringify([
          { role: "user", content: "What are my suppliers?" },
          {
            role: "assistant",
            content:
              "I'm afraid I don't have a function available that can do that for you",
          },
          { role: "user", content: "How many suppliers do I have?" },
          {
            role: "assistant",
            content: "Commands:\ncall_function()",
          },
          {
            role: "function",
            name: "logs",
            content: "These are some logs",
          },
        ]),
      ),
    );
    expect(prompt).toHaveLength(5);
    expect(prompt).toEqual([
      {
        role: "user",
        content: "What are my suppliers?",
      },
      {
        role: "assistant",
        content:
          "I'm afraid I don't have a function available that can do that for you",
      },
      {
        role: "user",
        content: "How many suppliers do I have?",
      },
      {
        role: "assistant",
        content: "Commands:\ncall_function()",
      },
      {
        role: "user",
        content: "\n\n### FUNCTION:\nThese are some logs",
      },
    ]);
  });
});
