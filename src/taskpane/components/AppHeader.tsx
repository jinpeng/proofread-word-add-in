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
