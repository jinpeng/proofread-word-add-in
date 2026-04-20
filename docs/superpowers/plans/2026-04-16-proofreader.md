# Proofreader Add-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scaffold Word add-in with a proofreading tool that sends document text to a user-configured LLM API and presents issues in a step-through Accept/Ignore reviewer.

**Architecture:** Direct browser-to-LLM pattern — the task pane calls the LLM API via `fetch` with no backend. State lives in `App` and is passed as props. Settings (API key, provider, model) persist in `localStorage`.

**Tech Stack:** TypeScript, React 18, Fluent UI v9 (`@fluentui/react-components`), Word JS API, Jest + ts-jest for unit tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/taskpane/types.ts` | `Issue` and `Settings` interfaces |
| Create | `src/taskpane/proofread.ts` | `callProofreadAPI` — fetch LLM, parse JSON |
| Create | `src/taskpane/storage.ts` | `loadSettings`, `saveSettings` — localStorage |
| Create | `src/taskpane/wordApi.ts` | `readDocumentText`, `applyFix` — Word JS API wrappers |
| Create | `src/taskpane/components/AppHeader.tsx` | Header bar with title + gear icon |
| Create | `src/taskpane/components/StatusBar.tsx` | Loading spinner, error, summary text |
| Create | `src/taskpane/components/IssueCard.tsx` | Single issue display with Accept/Ignore |
| Create | `src/taskpane/components/IssueReviewer.tsx` | Step-through N-of-M navigator |
| Create | `src/taskpane/components/SettingsView.tsx` | Provider/key/model form |
| Create | `src/taskpane/components/ProofreadView.tsx` | Main view orchestrator |
| Modify | `src/taskpane/components/App.tsx` | Replace scaffold; route between views |
| Create | `src/taskpane/__tests__/proofread.test.ts` | Unit tests for `callProofreadAPI` |
| Create | `src/taskpane/__tests__/storage.test.ts` | Unit tests for `loadSettings`/`saveSettings` |
| Create | `jest.config.js` | Jest + ts-jest config |
| Delete | `src/taskpane/components/Header.tsx` | Replaced by AppHeader |
| Delete | `src/taskpane/components/HeroList.tsx` | Scaffold — not needed |
| Delete | `src/taskpane/components/TextInsertion.tsx` | Scaffold — not needed |
| Delete | `src/taskpane/taskpane.ts` | Replaced by wordApi.ts |

---

## Task 1: Add types

**Files:**
- Create: `src/taskpane/types.ts`

- [ ] **Step 1: Create `src/taskpane/types.ts`**

```typescript
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
  model: "claude-sonnet-4-5",
};

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  claude: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  custom: [],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/taskpane/types.ts
git commit -m "feat: add Issue and Settings types"
```

---

## Task 2: Add Jest

**Files:**
- Create: `jest.config.js`
- Modify: `package.json` (add `test` script and devDependencies)

- [ ] **Step 1: Install Jest dependencies**

```bash
npm install --save-dev jest ts-jest @types/jest
```

- [ ] **Step 2: Create `jest.config.js`**

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
  },
  moduleNameMapper: {
    "^@fluentui/.*": "<rootDir>/src/taskpane/__tests__/__mocks__/fluentui.ts",
  },
};
```

- [ ] **Step 3: Add Fluent UI mock (Jest can't process ESM from node_modules)**

Create `src/taskpane/__tests__/__mocks__/fluentui.ts`:

```typescript
export const makeStyles = () => () => ({});
export const tokens = {};
export const Button = () => null;
export const Field = () => null;
export const Textarea = () => null;
```

- [ ] **Step 4: Add `test` script to `package.json`**

In the `"scripts"` section of `package.json`, add:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify Jest runs (no tests yet)**

```bash
npm test -- --passWithNoTests
```

Expected: exits 0 with "Test Suites: 0 skipped" or similar.

- [ ] **Step 6: Commit**

```bash
git add jest.config.js src/taskpane/__tests__/__mocks__/fluentui.ts package.json package-lock.json
git commit -m "chore: add Jest + ts-jest test setup"
```

---

## Task 3: Implement `storage.ts` with TDD

**Files:**
- Create: `src/taskpane/__tests__/storage.test.ts`
- Create: `src/taskpane/storage.ts`

- [ ] **Step 1: Write failing tests**

Create `src/taskpane/__tests__/storage.test.ts`:

```typescript
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
    const settings: Settings = { provider: "claude", apiKey: "key-xyz", model: "claude-sonnet-4-6" };
    saveSettings(settings);
    expect(JSON.parse(localStorage.getItem("proofread_settings")!)).toEqual(settings);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- storage.test.ts
```

Expected: FAIL — `Cannot find module '../storage'`

- [ ] **Step 3: Implement `src/taskpane/storage.ts`**

```typescript
import { DEFAULT_SETTINGS, Settings } from "./types";

const STORAGE_KEY = "proofread_settings";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return JSON.parse(raw) as Settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- storage.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/taskpane/storage.ts src/taskpane/__tests__/storage.test.ts
git commit -m "feat: add settings storage with localStorage"
```

---

## Task 4: Implement `proofread.ts` with TDD

**Files:**
- Create: `src/taskpane/__tests__/proofread.test.ts`
- Create: `src/taskpane/proofread.ts`

- [ ] **Step 1: Write failing tests**

Create `src/taskpane/__tests__/proofread.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- proofread.test.ts
```

Expected: FAIL — `Cannot find module '../proofread'`

- [ ] **Step 3: Implement `src/taskpane/proofread.ts`**

```typescript
import { Issue, Settings } from "./types";

const SYSTEM_PROMPT =
  "You are a professional editor. Analyze the provided text for grammar errors, style issues, " +
  "tone problems, structural weaknesses, and clarity improvements. Return ONLY a JSON array of " +
  "issue objects with no additional text. Each object must have: category (one of: grammar, style, " +
  "tone, structure, clarity), original (the exact verbatim text that has the issue), suggestion " +
  "(the corrected text), explanation (one sentence explaining the issue).";

function getEndpoint(settings: Settings): string {
  if (settings.provider === "claude") return "https://api.anthropic.com/v1/messages";
  if (settings.provider === "openai") return "https://api.openai.com/v1/chat/completions";
  return settings.customBaseUrl!;
}

function buildRequest(text: string, settings: Settings): RequestInit {
  if (settings.provider === "claude") {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    };
  }
  // OpenAI and custom (OpenAI-compatible)
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  };
}

function extractText(data: unknown, settings: Settings): string {
  if (settings.provider === "claude") {
    const d = data as { content: { type: string; text: string }[] };
    return d.content.find((b) => b.type === "text")?.text ?? "";
  }
  const d = data as { choices: { message: { content: string } }[] };
  return d.choices?.[0]?.message?.content ?? "";
}

async function attemptCall(text: string, settings: Settings): Promise<Issue[]> {
  const response = await fetch(getEndpoint(settings), buildRequest(text, settings));

  if (response.status === 401) throw new Error("Invalid API key. Check Settings.");
  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const raw = extractText(data, settings);
  return JSON.parse(raw) as Issue[];
}

export async function callProofreadAPI(text: string, settings: Settings): Promise<Issue[]> {
  try {
    try {
      return await attemptCall(text, settings);
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Retry once on malformed JSON
        return await attemptCall(text, settings);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Could not reach the API. Check your connection.");
    }
    if (err instanceof SyntaxError) {
      throw new Error("Unexpected response from API");
    }
    throw err;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- proofread.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/taskpane/proofread.ts src/taskpane/__tests__/proofread.test.ts
git commit -m "feat: add LLM API client with retry and error handling"
```

---

## Task 5: Implement `wordApi.ts`

**Files:**
- Create: `src/taskpane/wordApi.ts`

(Word JS API requires the Office runtime — no unit tests. Manual test in Task 12.)

- [ ] **Step 1: Create `src/taskpane/wordApi.ts`**

```typescript
/* global Word */

export async function readDocumentText(): Promise<{ text: string; hasSelection: boolean }> {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load("text");
    await context.sync();

    if (selection.text.trim().length > 0) {
      return { text: selection.text, hasSelection: true };
    }

    const body = context.document.body;
    body.load("text");
    await context.sync();
    return { text: body.text, hasSelection: false };
  });
}

export async function applyFix(original: string, suggestion: string): Promise<void> {
  await Word.run(async (context) => {
    const body = context.document.body;
    const results = body.search(original, { matchCase: true, matchWholeWord: false });
    results.load("items");
    await context.sync();

    if (results.items.length === 0) {
      throw new Error("Could not find the original text in the document.");
    }

    results.items[0].insertText(suggestion, "Replace");
    await context.sync();
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/taskpane/wordApi.ts
git commit -m "feat: add Word API helpers for reading text and applying fixes"
```

---

## Task 6: Build `AppHeader` component

**Files:**
- Create: `src/taskpane/components/AppHeader.tsx`

- [ ] **Step 1: Create `src/taskpane/components/AppHeader.tsx`**

```tsx
import * as React from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import { Settings24Regular } from "@fluentui/react-icons";

interface AppHeaderProps {
  onSettingsClick: () => void;
}

const useStyles = makeStyles({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    margin: "0",
  },
  gearButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    alignItems: "center",
    padding: tokens.spacingVerticalXS,
  },
});

const AppHeader: React.FC<AppHeaderProps> = ({ onSettingsClick }) => {
  const styles = useStyles();
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Proofreader</h1>
      <button className={styles.gearButton} onClick={onSettingsClick} aria-label="Settings">
        <Settings24Regular />
      </button>
    </header>
  );
};

export default AppHeader;
```

- [ ] **Step 2: Commit**

```bash
git add src/taskpane/components/AppHeader.tsx
git commit -m "feat: add AppHeader component with settings gear icon"
```

---

## Task 7: Build `StatusBar` component

**Files:**
- Create: `src/taskpane/components/StatusBar.tsx`

- [ ] **Step 1: Create `src/taskpane/components/StatusBar.tsx`**

```tsx
import * as React from "react";
import { makeStyles, Spinner, tokens } from "@fluentui/react-components";

export type StatusState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "summary"; accepted: number; ignored: number };

interface StatusBarProps {
  status: StatusState;
  onGoToSettings?: () => void;
}

const useStyles = makeStyles({
  bar: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    fontSize: tokens.fontSizeBase200,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
  },
  summary: {
    color: tokens.colorNeutralForeground3,
  },
});

const StatusBar: React.FC<StatusBarProps> = ({ status, onGoToSettings }) => {
  const styles = useStyles();

  if (status.kind === "idle") return null;

  if (status.kind === "loading") {
    return (
      <div className={styles.bar}>
        <Spinner size="tiny" label="Analyzing document..." />
      </div>
    );
  }

  if (status.kind === "error") {
    const isKeyError = status.message.includes("Invalid API key") || status.message.includes("Configure");
    return (
      <div className={`${styles.bar} ${styles.error}`}>
        {status.message}
        {isKeyError && onGoToSettings && (
          <>
            {" "}
            <button
              onClick={onGoToSettings}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", textDecoration: "underline", padding: 0 }}
            >
              Open Settings
            </button>
          </>
        )}
      </div>
    );
  }

  if (status.kind === "summary") {
    return (
      <div className={`${styles.bar} ${styles.summary}`}>
        Done — {status.accepted} accepted, {status.ignored} ignored.
      </div>
    );
  }

  return null;
};

export default StatusBar;
```

- [ ] **Step 2: Commit**

```bash
git add src/taskpane/components/StatusBar.tsx
git commit -m "feat: add StatusBar component for loading/error/summary states"
```

---

## Task 8: Build `IssueCard` component

**Files:**
- Create: `src/taskpane/components/IssueCard.tsx`

- [ ] **Step 1: Create `src/taskpane/components/IssueCard.tsx`**

```tsx
import * as React from "react";
import { makeStyles, tokens, Button } from "@fluentui/react-components";
import { Issue, IssueCategory } from "../types";

const CATEGORY_COLORS: Record<IssueCategory, string> = {
  grammar: tokens.colorPaletteRedBackground3,
  style: tokens.colorPaletteMarigoldBackground3,
  tone: tokens.colorPaletteLilacBackground2,
  structure: tokens.colorPaletteBlueBorderActive,
  clarity: tokens.colorPaletteTealBackground2,
};

const CATEGORY_TEXT_COLORS: Record<IssueCategory, string> = {
  grammar: tokens.colorPaletteRedForeground1,
  style: tokens.colorPaletteMarigoldForeground2,
  tone: tokens.colorPaletteLilacForeground2,
  structure: tokens.colorPaletteBlueForeground2,
  clarity: tokens.colorPaletteTealForeground2,
};

interface IssueCardProps {
  issue: Issue;
  applyError?: string;
  onAccept: () => void;
  onIgnore: () => void;
}

const useStyles = makeStyles({
  card: {
    padding: tokens.spacingVerticalM,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  badge: {
    display: "inline-block",
    padding: `2px ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  originalBox: {
    backgroundColor: "#fff0f0",
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
  },
  suggestionBox: {
    backgroundColor: "#f0fff4",
    border: `1px solid ${tokens.colorPaletteLightGreenBorder1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
  },
  explanation: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalXS,
  },
  applyError: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteRedForeground1,
  },
});

const IssueCard: React.FC<IssueCardProps> = ({ issue, applyError, onAccept, onIgnore }) => {
  const styles = useStyles();
  return (
    <div className={styles.card}>
      <div>
        <span
          className={styles.badge}
          style={{
            backgroundColor: CATEGORY_COLORS[issue.category],
            color: CATEGORY_TEXT_COLORS[issue.category],
          }}
        >
          {issue.category}
        </span>
      </div>

      <div className={styles.label}>Original</div>
      <div className={styles.originalBox}>{issue.original}</div>

      <div className={styles.label}>Suggestion</div>
      <div className={styles.suggestionBox}>{issue.suggestion}</div>

      <div className={styles.explanation}>{issue.explanation}</div>

      {applyError && <div className={styles.applyError}>{applyError} — edit manually.</div>}

      <div className={styles.actions}>
        <Button appearance="primary" size="small" onClick={onAccept}>
          Accept
        </Button>
        <Button appearance="secondary" size="small" onClick={onIgnore}>
          Ignore
        </Button>
      </div>
    </div>
  );
};

export default IssueCard;
```

- [ ] **Step 2: Commit**

```bash
git add src/taskpane/components/IssueCard.tsx
git commit -m "feat: add IssueCard component with color-coded categories"
```

---

## Task 9: Build `IssueReviewer` component

**Files:**
- Create: `src/taskpane/components/IssueReviewer.tsx`

- [ ] **Step 1: Create `src/taskpane/components/IssueReviewer.tsx`**

```tsx
import * as React from "react";
import { makeStyles, tokens, Button } from "@fluentui/react-components";
import { Issue } from "../types";
import IssueCard from "./IssueCard";

interface IssueReviewerProps {
  issues: Issue[];
  onDone: (accepted: number, ignored: number) => void;
  onApplyFix: (issue: Issue) => Promise<void>;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  counter: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  navButtons: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
  },
  doneScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXXL,
    textAlign: "center",
  },
  doneText: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground1,
  },
  doneSubtext: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
  },
});

const IssueReviewer: React.FC<IssueReviewerProps> = ({ issues, onDone, onApplyFix }) => {
  const styles = useStyles();
  const [index, setIndex] = React.useState(0);
  const [accepted, setAccepted] = React.useState(0);
  const [ignored, setIgnored] = React.useState(0);
  const [applyError, setApplyError] = React.useState<string | undefined>(undefined);
  const [finished, setFinished] = React.useState(false);

  const advance = (nextIndex: number, nextAccepted: number, nextIgnored: number) => {
    setApplyError(undefined);
    if (nextIndex >= issues.length) {
      setFinished(true);
      onDone(nextAccepted, nextIgnored);
    } else {
      setIndex(nextIndex);
    }
  };

  const handleAccept = async () => {
    try {
      await onApplyFix(issues[index]);
      advance(index + 1, accepted + 1, ignored);
      setAccepted((a) => a + 1);
    } catch {
      setApplyError("Could not apply fix");
      advance(index + 1, accepted, ignored + 1);
      setIgnored((ig) => ig + 1);
    }
  };

  const handleIgnore = () => {
    setIgnored((ig) => ig + 1);
    advance(index + 1, accepted, ignored + 1);
  };

  if (finished) {
    return (
      <div className={styles.doneScreen}>
        <div className={styles.doneText}>All done!</div>
        <div className={styles.doneSubtext}>
          {accepted} accepted · {ignored} ignored
        </div>
        <Button appearance="primary" onClick={() => onDone(accepted, ignored)}>
          Proofread Again
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.nav}>
        <span className={styles.counter}>
          Issue {index + 1} of {issues.length}
        </span>
        <div className={styles.navButtons}>
          <Button size="small" disabled={index === 0} onClick={() => { setApplyError(undefined); setIndex(index - 1); }}>
            ‹ Prev
          </Button>
          <Button size="small" disabled={index === issues.length - 1} onClick={() => { setApplyError(undefined); setIndex(index + 1); }}>
            Next ›
          </Button>
        </div>
      </div>
      <IssueCard
        issue={issues[index]}
        applyError={applyError}
        onAccept={handleAccept}
        onIgnore={handleIgnore}
      />
    </div>
  );
};

export default IssueReviewer;
```

- [ ] **Step 2: Commit**

```bash
git add src/taskpane/components/IssueReviewer.tsx
git commit -m "feat: add IssueReviewer step-through navigator"
```

---

## Task 10: Build `SettingsView` component

**Files:**
- Create: `src/taskpane/components/SettingsView.tsx`

- [ ] **Step 1: Create `src/taskpane/components/SettingsView.tsx`**

```tsx
import * as React from "react";
import {
  makeStyles, tokens, Button, Field, Input, Select, Label,
} from "@fluentui/react-components";
import { Settings, Provider, PROVIDER_MODELS } from "../types";
import { saveSettings } from "../storage";

interface SettingsViewProps {
  initialSettings: Settings;
  onBack: () => void;
  onSave: (settings: Settings) => void;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalL,
  },
  backBar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalM,
  },
});

const SettingsView: React.FC<SettingsViewProps> = ({ initialSettings, onBack, onSave }) => {
  const styles = useStyles();
  const [provider, setProvider] = React.useState<Provider>(initialSettings.provider);
  const [apiKey, setApiKey] = React.useState(initialSettings.apiKey);
  const [model, setModel] = React.useState(initialSettings.model);
  const [customBaseUrl, setCustomBaseUrl] = React.useState(initialSettings.customBaseUrl ?? "");

  const models = PROVIDER_MODELS[provider];

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setModel(PROVIDER_MODELS[p][0] ?? "");
  };

  const handleSave = () => {
    const settings: Settings = {
      provider,
      apiKey,
      model: model || (models[0] ?? ""),
      ...(provider === "custom" ? { customBaseUrl } : {}),
    };
    saveSettings(settings);
    onSave(settings);
    onBack();
  };

  return (
    <div className={styles.root}>
      <div className={styles.backBar}>
        <Button appearance="transparent" size="small" onClick={onBack}>
          ← Back
        </Button>
        <span className={styles.sectionTitle}>Settings</span>
      </div>

      <Field label="Provider">
        <Select
          value={provider}
          onChange={(_e, d) => handleProviderChange(d.value as Provider)}
        >
          <option value="claude">Claude (Anthropic)</option>
          <option value="openai">OpenAI</option>
          <option value="custom">Custom (OpenAI-compatible)</option>
        </Select>
      </Field>

      {provider === "custom" && (
        <Field label="Base URL">
          <Input
            value={customBaseUrl}
            onChange={(_e, d) => setCustomBaseUrl(d.value)}
            placeholder="https://your-api.example.com/v1/chat/completions"
          />
        </Field>
      )}

      <Field label="API Key">
        <Input
          type="password"
          value={apiKey}
          onChange={(_e, d) => setApiKey(d.value)}
          placeholder={provider === "claude" ? "sk-ant-..." : "sk-..."}
        />
      </Field>

      <Field label="Model">
        {models.length > 0 ? (
          <Select value={model} onChange={(_e, d) => setModel(d.value)}>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            value={model}
            onChange={(_e, d) => setModel(d.value)}
            placeholder="e.g. llama3"
          />
        )}
      </Field>

      <div className={styles.actions}>
        <Button appearance="primary" onClick={handleSave} disabled={!apiKey.trim()}>
          Save
        </Button>
        <Button appearance="secondary" onClick={onBack}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default SettingsView;
```

- [ ] **Step 2: Commit**

```bash
git add src/taskpane/components/SettingsView.tsx
git commit -m "feat: add SettingsView with provider/key/model configuration"
```

---

## Task 11: Build `ProofreadView` component

**Files:**
- Create: `src/taskpane/components/ProofreadView.tsx`

- [ ] **Step 1: Create `src/taskpane/components/ProofreadView.tsx`**

```tsx
import * as React from "react";
import { makeStyles, tokens, Button } from "@fluentui/react-components";
import { Issue, Settings } from "../types";
import { callProofreadAPI } from "../proofread";
import { readDocumentText, applyFix } from "../wordApi";
import IssueReviewer from "./IssueReviewer";
import StatusBar, { StatusState } from "./StatusBar";

/* global Word */

interface ProofreadViewProps {
  settings: Settings;
  onGoToSettings: () => void;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  idle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXXL,
  },
  noKeyMsg: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
});

const ProofreadView: React.FC<ProofreadViewProps> = ({ settings, onGoToSettings }) => {
  const styles = useStyles();
  const [status, setStatus] = React.useState<StatusState>({ kind: "idle" });
  const [issues, setIssues] = React.useState<Issue[] | null>(null);
  const [hasSelection, setHasSelection] = React.useState(false);

  const hasKey = settings.apiKey.trim().length > 0;

  // Detect selection on mount
  React.useEffect(() => {
    Word.run(async (context) => {
      const sel = context.document.getSelection();
      sel.load("text");
      await context.sync();
      setHasSelection(sel.text.trim().length > 0);
    }).catch(() => {});
  }, []);

  const handleProofread = async () => {
    setStatus({ kind: "loading" });
    setIssues(null);
    try {
      const { text } = await readDocumentText();
      if (!text.trim()) {
        setStatus({ kind: "error", message: "No text to proofread." });
        return;
      }
      const found = await callProofreadAPI(text, settings);
      if (found.length === 0) {
        setStatus({ kind: "summary", accepted: 0, ignored: 0 });
      } else {
        setIssues(found);
        setStatus({ kind: "idle" });
      }
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  };

  const handleDone = (accepted: number, ignored: number) => {
    setIssues(null);
    setStatus({ kind: "summary", accepted, ignored });
  };

  const handleApplyFix = async (issue: Issue) => {
    await applyFix(issue.original, issue.suggestion);
  };

  if (issues && issues.length > 0) {
    return (
      <div className={styles.root}>
        <IssueReviewer issues={issues} onDone={handleDone} onApplyFix={handleApplyFix} />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.idle}>
        {!hasKey && (
          <p className={styles.noKeyMsg}>
            Configure your API key in Settings ⚙ to get started.
          </p>
        )}
        <Button
          appearance="primary"
          size="large"
          disabled={!hasKey || status.kind === "loading"}
          onClick={handleProofread}
        >
          {hasSelection ? "Proofread Selection" : "Proofread Document"}
        </Button>
      </div>
      <StatusBar status={status} onGoToSettings={onGoToSettings} />
    </div>
  );
};

export default ProofreadView;
```

- [ ] **Step 2: Commit**

```bash
git add src/taskpane/components/ProofreadView.tsx
git commit -m "feat: add ProofreadView orchestrating read/call/review flow"
```

---

## Task 12: Wire up `App.tsx` and delete scaffold files

**Files:**
- Modify: `src/taskpane/components/App.tsx`
- Delete: `src/taskpane/components/Header.tsx`
- Delete: `src/taskpane/components/HeroList.tsx`
- Delete: `src/taskpane/components/TextInsertion.tsx`
- Delete: `src/taskpane/taskpane.ts`

- [ ] **Step 1: Replace `src/taskpane/components/App.tsx`**

```tsx
import * as React from "react";
import { makeStyles } from "@fluentui/react-components";
import { Settings } from "../types";
import { loadSettings } from "../storage";
import AppHeader from "./AppHeader";
import ProofreadView from "./ProofreadView";
import SettingsView from "./SettingsView";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
});

type View = "proofread" | "settings";

const App: React.FC = () => {
  const styles = useStyles();
  const [view, setView] = React.useState<View>("proofread");
  const [settings, setSettings] = React.useState<Settings>(loadSettings);

  return (
    <div className={styles.root}>
      <AppHeader onSettingsClick={() => setView("settings")} />
      <div className={styles.content}>
        {view === "proofread" ? (
          <ProofreadView
            settings={settings}
            onGoToSettings={() => setView("settings")}
          />
        ) : (
          <SettingsView
            initialSettings={settings}
            onBack={() => setView("proofread")}
            onSave={setSettings}
          />
        )}
      </div>
    </div>
  );
};

export default App;
```

- [ ] **Step 2: Delete scaffold files**

```bash
rm src/taskpane/components/Header.tsx
rm src/taskpane/components/HeroList.tsx
rm src/taskpane/components/TextInsertion.tsx
rm src/taskpane/taskpane.ts
```

- [ ] **Step 3: Update `src/taskpane/index.tsx` to remove the `title` prop**

The `App` component no longer accepts a `title` prop. Update `index.tsx`:

```tsx
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";

/* global document, Office, module, require, HTMLElement */

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

Office.onReady(() => {
  root?.render(
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  );
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(<NextApp />);
  });
}
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
npm run build:dev
```

Expected: webpack completes with no errors.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: PASS — all storage and proofread tests pass.

- [ ] **Step 6: Manual smoke test in Word**

```bash
npm run start
```

- Open Word, click "Show Task Pane" in the ribbon
- Verify: header shows "Proofreader" with gear icon
- Gear → Settings: can enter API key, select provider, save
- Back → main view: button is enabled after API key saved
- Click "Proofread Document": spinner shows, then step-through reviewer appears
- Accept a fix: text changes in the Word document
- Ignore a fix: advances without changing text
- Complete all issues: done screen shows accepted/ignored counts

- [ ] **Step 7: Commit**

```bash
git add src/taskpane/components/App.tsx src/taskpane/index.tsx
git commit -m "feat: wire up App with view routing, remove scaffold components"
```

---

## Self-Review

**Spec coverage:**
- ✅ Comprehensive proofreading (grammar/style/tone/structure/clarity) — system prompt in `proofread.ts`
- ✅ User-configurable provider/API key/model — `SettingsView` + `storage.ts`
- ✅ Selection vs. full document — `readDocumentText` in `wordApi.ts`, button label in `ProofreadView`
- ✅ Step-through reviewer — `IssueReviewer` + `IssueCard`
- ✅ Settings on separate page via gear icon — `App.tsx` view routing
- ✅ All error scenarios from spec — `proofread.ts` errors, `StatusBar`, `IssueCard.applyError`
- ✅ "No text to proofread" — `ProofreadView` early return
- ✅ "All done" completion screen — `IssueReviewer` finished state

**Placeholder scan:** None found.

**Type consistency:** `Issue`, `Settings`, `Provider`, `PROVIDER_MODELS`, `StatusState` — all defined in Task 1 and used consistently across all subsequent tasks. `onApplyFix: (issue: Issue) => Promise<void>` matches usage in `IssueReviewer` and `ProofreadView`.
