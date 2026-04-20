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
