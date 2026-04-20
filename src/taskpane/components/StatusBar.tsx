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
