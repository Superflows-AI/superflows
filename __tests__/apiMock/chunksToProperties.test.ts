import { Chunk, Properties } from "../../lib/models";
import { chunksToProperties } from "../../lib/utils";

describe("chunksToProperties", () => {
  it("converts an array of chunks into properties with type, description, and path correctly.", () => {
    const chunks: Chunk[] = [
      { path: ["id", "type"], data: "integer" },
      { path: ["id", "description"], data: "Customer id" },
    ];

    const properties: Properties = chunksToProperties(chunks);

    expect(properties).toEqual({
      id: { type: "integer", description: "Customer id", path: ["id"] },
    });
  });

  it("handles multiple paths correctly", () => {
    const chunks: Chunk[] = [
      { path: ["id", "type"], data: "integer" },
      { path: ["id", "description"], data: "Customer id" },
      { path: ["name", "type"], data: "string" },
      { path: ["name", "description"], data: "Customer name" },
    ];

    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({
      id: { type: "integer", description: "Customer id", path: ["id"] },
      name: { type: "string", description: "Customer name", path: ["name"] },
    });
  });
  it("multiple properties with the same name ", () => {
    const chunks: Chunk[] = [
      { path: ["id", "type"], data: "integer" },
      { path: ["id", "description"], data: "Customer id" },
      { path: ["name", "id", "type"], data: "string" },
      { path: ["name", "id", "description"], data: "Customer name" },
    ];

    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({
      id: { type: "integer", description: "Customer id", path: ["id"] },
      "name.id": {
        type: "string",
        description: "Customer name",
        path: ["name", "id"],
      },
    });
  });

  it("merges chunks with the same path", () => {
    const chunks: Chunk[] = [
      { path: ["id", "type"], data: "integer" },
      { path: ["id", "description"], data: "Customer id" },
      { path: ["id", "format"], data: "int64" },
    ];

    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({
      id: { type: "integer", description: "Customer id", path: ["id"] },
    });
  });

  it("handles numeric paths correctly", () => {
    const chunks: Chunk[] = [
      { path: [0, "type"], data: "integer" },
      { path: [0, "description"], data: "Customer id" },
    ];

    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({
      0: { type: "integer", description: "Customer id", path: [0] },
    });
  });

  it("handles no path chunks correctly", () => {
    const chunks: Chunk[] = [{ path: [], data: "No path" }];

    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({});
  });

  it("handles undefined chunks correctly", () => {
    const chunks: Chunk[] = [
      { path: ["id", "type"], data: undefined },
      { path: ["id", "description"], data: "Customer id" },
    ];

    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({
      id: { description: "Customer id", path: ["id"] },
    });
  });

  it("handles empty chunks array correctly", () => {
    const chunks: Chunk[] = [];
    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({});
  });

  it("Handles nesting correctly ", () => {
    const chunks: Chunk[] = [
      { path: ["customer", "id", "type"], data: "string" },
      { path: ["customer", "id", "description"], data: "Customer ID" },
      { path: ["customer", "name", "description"], data: "Customer name" },
      { path: ["order", "id", "type"], data: "integer" },
      { path: ["order", "id", "description"], data: undefined },
    ];

    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({
      "customer.id": {
        path: ["customer", "id"],
        type: "string",
        description: "Customer ID",
      },
      "customer.name": {
        description: "Customer name",
        path: ["customer", "name"],
      },
      "order.id": { type: "integer", path: ["order", "id"] },
    });
  });

  it("handles empty chunks array correctly", () => {
    const chunks: Chunk[] = [];
    const properties: Properties = chunksToProperties(chunks);
    expect(properties).toEqual({});
  });
});
