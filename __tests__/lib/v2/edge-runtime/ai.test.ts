import { hideLongGraphOutputs } from "../../../../lib/v2/edge-runtime/ai";

describe("hideLongGraphOutputs", () => {
  it("basic", () => {
    const out = hideLongGraphOutputs(
      [
        {
          role: "function",
          name: "plot",
          content: JSON.stringify({
            type: "bar",
            data: new Array(250).fill({
              x: "Attack helicopter",
              y: 345769134950.346088724,
              badgers:
                "are sometimes culled in the country because they have bovine TB (colloquially known as badger pox)",
            }),
          }),
        },
      ],
      ["plot"],
    );
    expect(out.chatGptPrompt).toEqual([
      {
        role: "function",
        name: "plot",
        content:
          JSON.stringify({
            type: "bar",
            data: new Array(3).fill({
              x: "Attack helicopter",
              y: 345769134950.346088724,
              badgers:
                "are sometimes culled in the country because they have bovine TB (colloquially known as badger pox)",
            }),
          }).slice(0, -2) +
          ",<further elements cut for brevity (total length: 250) - DO NOT pretend to know the data, instead tell the user to look at this graph>]}",
      },
    ]);
  });
});
