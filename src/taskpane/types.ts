export type IssueCategory = "grammar" | "style" | "tone" | "structure" | "clarity";

export interface Issue {
  category: IssueCategory;
  original: string;
  suggestion: string;
  explanation: string;
}

export type Provider = "claude" | "openai" | "custom";

export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: "claude",
  apiKey: "",
  model: "claude-sonnet-4-6",
};

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  claude: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  custom: [],
};
