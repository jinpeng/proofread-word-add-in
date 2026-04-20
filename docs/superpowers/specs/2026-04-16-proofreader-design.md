# Proofreader Add-in Design

**Date:** 2026-04-16  
**Scope:** Word task pane add-in that calls a user-configured LLM API to proofread the document or current selection, then presents issues in a step-through reviewer UI.

---

## Overview

Replace the existing scaffold with a focused proofreading tool. The add-in reads text from the Word document (selection or full body), sends it to an LLM API, and returns a structured list of issues across grammar, style, tone, structure, and clarity. The user reviews issues one at a time and can accept or ignore each fix.

---

## Architecture

Direct browser-to-LLM pattern. The task pane calls the LLM provider API directly via `fetch`. No backend or proxy is needed. The API key is stored in `localStorage` and supplied by the user via the Settings view.

### Component Tree

```
App
├── AppHeader          (title + gear icon → toggles between views)
├── ProofreadView      (main view)
│   ├── ProofreadButton    (detects selection vs. full doc; triggers LLM call)
│   ├── IssueReviewer      (step-through UI, shown after results arrive)
│   │   └── IssueCard      (one issue: category, original, suggestion, explanation, Accept/Ignore)
│   └── StatusBar          (loading spinner, error messages, summary text)
└── SettingsView
    ├── ProviderSelector   (Claude / OpenAI / custom base URL)
    ├── ApiKeyInput        (masked input, persisted to localStorage)
    └── ModelSelector      (model dropdown, options vary by provider)
```

**State** lives in `App`: current view (`'proofread' | 'settings'`), issues array, current issue index, and settings object. Passed as props — no state library needed.

### New Module

`src/taskpane/proofread.ts` — pure async function, no React dependency:

```ts
async function callProofreadAPI(text: string, settings: Settings): Promise<Issue[]>
```

Sends a structured prompt to the configured provider and parses the JSON response.

---

## Data Flow

1. **Read text** — `Word.run()` checks for a non-empty selection; falls back to `context.document.body.text`.
2. **LLM call** — `proofread.ts` POSTs to the provider API with a system prompt instructing the model to return a JSON array of issues.
3. **Issue schema:**
   ```ts
   interface Issue {
     category: 'grammar' | 'style' | 'tone' | 'structure' | 'clarity';
     original: string;      // exact text to find in the document
     suggestion: string;    // replacement text
     explanation: string;   // plain-English reason
   }
   ```
   Character offsets are not used for location — instead, `Range.search()` is used to find the original text in the document at accept time, which is more robust against minor index drift.
4. **Review** — issues stored in state; `IssueReviewer` steps through them.
5. **Accept** — `Word.run()` calls `body.search(original)[0].insertText(suggestion, 'Replace')`, then advances index.
6. **Ignore** — advances index, no Word API call.
7. **Settings persistence** — `localStorage` key `proofread_settings`, loaded once in `Office.onReady`.

---

## UI Details

### ProofreadView — idle state
- Button label: "Proofread Selection" if selection detected on mount, otherwise "Proofread Document"
- If no API key configured: button disabled, message "Configure your API key in Settings ⚙"

### IssueReviewer — active state
- Header: "Issue N of M" with Prev / Next buttons
- IssueCard:
  - Category badge (color-coded: red=grammar, orange=style, purple=tone, blue=structure, teal=clarity)
  - Original text in red-tinted box
  - Suggestion in green-tinted box
  - Plain-English explanation
  - "Accept" and "Ignore" buttons
- Accepting auto-advances to next issue
- After last issue: "All done — N accepted, M ignored" + "Proofread Again" button

### SettingsView
- Provider dropdown: Claude (Anthropic), OpenAI, Custom
- API key masked input field
- Model selector (populated based on provider)
- Custom provider: shows a base URL field
- Save button writes to `localStorage`

---

## Error Handling

| Scenario | Behavior |
|---|---|
| No API key | Button disabled; link to Settings |
| Invalid API key / 401 | StatusBar: "Invalid API key. Check Settings." |
| Network failure | StatusBar: "Could not reach the API. Check your connection." |
| Malformed JSON from LLM | Retry once silently; on second failure: "Unexpected response from API" |
| Word API failure on Accept | Inline error on IssueCard: "Could not apply fix — edit manually"; advance to next issue |
| Empty document / selection | Button disabled or StatusBar: "No text to proofread" |

---

## LLM Prompt Design

**System prompt (sent once):**
> You are a professional editor. Analyze the provided text for grammar errors, style issues, tone problems, structural weaknesses, and clarity improvements. Return ONLY a JSON array of issue objects with no additional text. Each object must have: category (one of: grammar, style, tone, structure, clarity), original (the exact verbatim text that has the issue), suggestion (the corrected text), explanation (one sentence explaining the issue).

**User message:** the raw text extracted from Word.

---

## Out of Scope

- Applying all fixes at once ("Accept All")
- Saving issue history across sessions
- Diff/tracked-changes view in the document
- Multi-language support
