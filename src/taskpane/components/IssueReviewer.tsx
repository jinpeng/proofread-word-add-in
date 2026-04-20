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
