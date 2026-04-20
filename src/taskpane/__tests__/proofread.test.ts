import { callProofreadAPI } from "../proofread";
import { Settings, Issue } from "../types";

const claudeSettings: Settings = {
  provider: "claude",
  apiKey: "test-key",
  model: "claude-sonnet-4-6",
};

const openAiSettings: Settings = {
  provider: "openai",
  apiKey: "sk-test",
  model: "gpt-4o",
};

const mockIssues: Issue[] = [
  {
    category: "grammar",
    original: "Their going",
    suggestion: "They're going",
    explanation: "\"Their\" is possessive; \"They're\" is the contraction for \"they are\".",
  },
];

function makeFetch(responseBody: string, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(responseBody),
    text: async () => responseBody,
  });
}

describe("callProofreadAPI — Claude", () => {
  it("returns parsed issues on success", async () => {
    const body = JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(mockIssues) }],
    });
    global.fetch = makeFetch(body) as unknown as typeof fetch;

    const result = await callProofreadAPI("Their going to the store.", claudeSettings);
    expect(result).toEqual(mockIssues);
  });

  it("retries once on malformed JSON and throws on second failure", async () => {
    const badBody = JSON.stringify({
      content: [{ type: "text", text: "not json{{{" }],
    });
    global.fetch = makeFetch(badBody) as unknown as typeof fetch;

    await expect(callProofreadAPI("some text", claudeSettings)).rejects.toThrow(
      "Unexpected response from API"
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws on 401", async () => {
    global.fetch = makeFetch('{"error":"unauthorized"}', 401) as unknown as typeof fetch;
    await expect(callProofreadAPI("text", claudeSettings)).rejects.toThrow(
      "Invalid API key"
    );
  });

  it("throws on network error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    await expect(callProofreadAPI("text", claudeSettings)).rejects.toThrow(
      "Could not reach the API"
    );
  });
});

describe("callProofreadAPI — OpenAI", () => {
  it("returns parsed issues on success", async () => {
    const body = JSON.stringify({
      choices: [{ message: { content: JSON.stringify(mockIssues) } }],
    });
    global.fetch = makeFetch(body) as unknown as typeof fetch;

    const result = await callProofreadAPI("Their going to the store.", openAiSettings);
    expect(result).toEqual(mockIssues);
  });
});
