import * as React from "react";
import { makeStyles, tokens, Button } from "@fluentui/react-components";
import { Issue, IssueCategory } from "../types";

const CATEGORY_COLORS: Record<IssueCategory, string> = {
  grammar: tokens.colorPaletteRedBackground2,
  style: tokens.colorPaletteMarigoldBackground3,
  tone: tokens.colorPaletteLilacBackground2,
  structure: tokens.colorPaletteBlueBackground2,
  clarity: tokens.colorPaletteTealBackground2,
};

const CATEGORY_TEXT_COLORS: Record<IssueCategory, string> = {
  grammar: tokens.colorPaletteRedForeground3,
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
