import { replacePlaceholdersDuringStreaming } from "../../lib/edge-runtime/angelaUtils";
import tokenizer from "gpt-tokenizer";

describe("replacePlaceholdersDuringStreaming", () => {
  it("no placeholders", () => {
    const out = replacePlaceholdersDuringStreaming(
      "This is a test string",
      "",
      {},
    );
    expect(out.content).toEqual("This is a test string");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder, but none in string", () => {
    const out = replacePlaceholdersDuringStreaming(
      "This is a test string",
      "",
      {
        URL1: "https://google.com",
      },
    );
    expect(out.content).toEqual("This is a test string");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("ID in string, but not at the end", () => {
    const out = replacePlaceholdersDuringStreaming("ID ", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("ID ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder, ID included", () => {
    const out = replacePlaceholdersDuringStreaming("ID", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("ID");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder, buffer filled, no match", () => {
    const out = replacePlaceholdersDuringStreaming(" baby", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("URL baby");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder, matches format, no match", () => {
    const out = replacePlaceholdersDuringStreaming("2 ", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("URL2 ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder in 1 chunk, match", () => {
    const out = replacePlaceholdersDuringStreaming("content=URL1 ", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("content=https://google.com ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("URL, buffer filled, match", () => {
    const out = replacePlaceholdersDuringStreaming("1 ", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("https://google.com ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("ID, buffer filled, match", () => {
    const out = replacePlaceholdersDuringStreaming("2 ", "ID", {
      ID1: "ff3a5-3f3a5-3f3a5-3f3a5",
      ID2: "ff3a5-3f3a5-3f3a5-77877",
    });
    expect(out.content).toEqual("ff3a5-3f3a5-3f3a5-77877 ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("FUNCTION, put in buffer", () => {
    const out = replacePlaceholdersDuringStreaming("FUNCTION", "", {
      FUNCTIONS: "functions",
      "FUNCTION ": "function ",
    });
    expect(out.content).toEqual("");
    expect(out.placeholderBuffer).toEqual("FUNCTION");
  });
  it("FUNCTION, match", () => {
    const out = replacePlaceholdersDuringStreaming(" is", "FUNCTION", {
      FUNCTIONS: "functions",
      "FUNCTION ": "function ",
    });
    expect(out.content).toEqual("function is");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("FUNCTIONS, ", () => {
    const out = replacePlaceholdersDuringStreaming("S ", "FUNCTION", {
      FUNCTIONS: "functions",
      "FUNCTION ": "function ",
    });
    expect(out.content).toEqual("functions ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("URLs in markdown links", () => {
    const textToStream = `1. [10 Healthiest Fruits To Eat Every Day - Eat This Not That](URL1)
  2. [12 Healthiest Fruits to Eat, According to Nutrutionists - Prevention](URL2)
  3. [Best Fruits to Eat: A Dietitian's Picks - Cleveland Clinic Health ...](URL3)`;
    const tokens = tokenizer.encode(textToStream);
    const placeHolderMap = {
      URL1: "https://www.eatthis.com/healthiest-fruits/",
      URL2: "https://www.prevention.com/food-nutrition/g20484029/healthiest-fruits/",
      URL3: "https://health.clevelandclinic.org/10-best-fruits-to-eat/",
    };
    let placeholderBuffer = "",
      content = "",
      entireContent = "";
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const encodedToken = tokenizer.decode([token]);
      ({ content, placeholderBuffer } = replacePlaceholdersDuringStreaming(
        encodedToken,
        placeholderBuffer,
        placeHolderMap,
      ));
      entireContent += content;
    }
    expect(entireContent)
      .toEqual(`1. [10 Healthiest Fruits To Eat Every Day - Eat This Not That](https://www.eatthis.com/healthiest-fruits/)
  2. [12 Healthiest Fruits to Eat, According to Nutrutionists - Prevention](https://www.prevention.com/food-nutrition/g20484029/healthiest-fruits/)
  3. [Best Fruits to Eat: A Dietitian's Picks - Cleveland Clinic Health ...](https://health.clevelandclinic.org/10-best-fruits-to-eat/)`);
  });
  it("Non-ID, non-FUNCTION, placeholder, put in buffer", () => {
    const out = replacePlaceholdersDuringStreaming("<", "", {
      "<tellUser>": "Tell user:",
    });
    expect(out.content).toEqual("");
    expect(out.placeholderBuffer).toEqual("<");
    const out2 = replacePlaceholdersDuringStreaming("tell", "<", {
      "<tellUser>": "Tell user:",
    });
    expect(out2.content).toEqual("");
    expect(out2.placeholderBuffer).toEqual("<tell");
    const out3 = replacePlaceholdersDuringStreaming("User", "<tell", {
      "<tellUser>": "Tell user:",
    });
    expect(out3.content).toEqual("");
    expect(out3.placeholderBuffer).toEqual("<tellUser");
    const out4 = replacePlaceholdersDuringStreaming(">\n", "<tellUser", {
      "<tellUser>": "Tell user:",
    });
    expect(out4.content).toEqual("Tell user:\n");
    expect(out4.placeholderBuffer).toEqual("");
  });
  it("Non-ID, non-FUNCTION, placeholder, match", () => {
    const out = replacePlaceholdersDuringStreaming("> ", "<tellUser", {
      "<tellUser>": "Tell user:",
    });
    expect(out.content).toEqual("Tell user: ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("Non-ID, non-FUNCTION, placeholder, streaming", () => {
    const text = ` which items have the most projected sales in the next 6 months.
3. What does the table show? The table shows the top 5 products by projected revenue over the next 6 months.
4. What key information should be given to the user as a summary? I should summarize the key points about the top 5 products and their projected sales.
</thinking>

<tellUser>
Según los datos proyectados para los próximos 6 meses, los 5 productos con mayores ingresos esperados son:

- sku-656: $7.997.737
- sku-2122: $3.976.288
- sku-653: $3.182.867
- sku-1592: $2.756.306
- sku-1039: $2.406.548

En total, estos 5 productos representan $20.319.747 en ingresos proyectados para el próximo semestre. Esto se calculó a partir de los registros y llamadas a la API del sistema de ERP.`;
    const placeHolderMap = {
      "<tellUser>": "Tell user:",
      "</thinking>\n": "",
    };
    let placeholderBuffer = "",
      content = "",
      entireContent = "";
    for (let i = 0; i < text.length; i++) {
      const token = text[i];
      ({ content, placeholderBuffer } = replacePlaceholdersDuringStreaming(
        token,
        placeholderBuffer,
        placeHolderMap,
      ));
      entireContent += content;
    }
    expect(entireContent)
      .toEqual(` which items have the most projected sales in the next 6 months.
3. What does the table show? The table shows the top 5 products by projected revenue over the next 6 months.
4. What key information should be given to the user as a summary? I should summarize the key points about the top 5 products and their projected sales.

Tell user:
Según los datos proyectados para los próximos 6 meses, los 5 productos con mayores ingresos esperados son:

- sku-656: $7.997.737
- sku-2122: $3.976.288
- sku-653: $3.182.867
- sku-1592: $2.756.306
- sku-1039: $2.406.548

En total, estos 5 productos representan $20.319.747 en ingresos proyectados para el próximo semestre. Esto se calculó a partir de los registros y llamadas a la API del sistema de ERP.`);
  });
});
