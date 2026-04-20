import { loadSettings, saveSettings } from "../storage";
import { DEFAULT_SETTINGS, Settings } from "../types";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

beforeEach(() => localStorageMock.clear());

describe("loadSettings", () => {
  it("returns DEFAULT_SETTINGS when localStorage is empty", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("returns persisted settings when present", () => {
    const saved: Settings = { provider: "openai", apiKey: "sk-abc", model: "gpt-4o" };
    localStorage.setItem("proofread_settings", JSON.stringify(saved));
    expect(loadSettings()).toEqual(saved);
  });

  it("returns DEFAULT_SETTINGS when stored JSON is malformed", () => {
    localStorage.setItem("proofread_settings", "not-json{{{");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("saveSettings", () => {
  it("persists settings to localStorage", () => {
    const settings: Settings = { provider: "claude", apiKey: "key-xyz", model: "claude-sonnet​-4-6" };
    saveSettings(settings);
    expect(JSON.parse(localStorage.getItem("proofread_settings")!)).toEqual(settings);
  });
});
