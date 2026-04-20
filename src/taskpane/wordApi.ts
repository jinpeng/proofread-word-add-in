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
