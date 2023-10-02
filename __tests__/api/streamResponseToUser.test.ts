import { streamResponseToUser } from "../../pages/api/v1/answers";
import { Readable } from "stream";

describe("streamResponseToUser", () => {
  it("very simple", async () => {
    const mockReadable = new Readable();
    mockReadable.push('data: {"choices": [{"delta": {"content": "hello"}}]}');
    mockReadable.push(null);

    const uint8array = new TextEncoder().encode(mockReadable.read());
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(uint8array);
        controller.close();
      },
    });
    const mockFn = jest.fn();
    // @ts-ignore
    const out = await streamResponseToUser(mockStream, mockFn, {});
    expect(out).toEqual("hello");
    expect(mockFn).toBeCalledWith({ role: "assistant", content: "hello" });
  });
  it("replace ID1 with id value correctly", async () => {
    const mockReadable = new Readable();
    mockReadable.push(
      'data: {"choices": [{"delta": {"content": "The id is"}}]}',
    );
    mockReadable.push('data: {"choices": [{"delta": {"content": " ID"}}]}');
    mockReadable.push('data: {"choices": [{"delta": {"content": "1"}}]}');
    mockReadable.push(null); // end the stream

    const uint8array = new TextEncoder().encode(mockReadable.read());
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(uint8array);
        controller.close();
      },
    });
    const mockFn = jest.fn();
    // @ts-ignore
    const out = await streamResponseToUser(mockStream, mockFn, {
      ID1: "53fa4-3f3f3-3f3f3-3f3f3-3f3f3",
    });
    expect(out).toEqual("The id is ID1");
    expect(mockFn).toBeCalledWith({ role: "assistant", content: "The id is" });
    expect(mockFn).toBeCalledWith({
      role: "assistant",
      content: " 53fa4-3f3f3-3f3f3-3f3f3-3f3f3",
    });
  });
});
