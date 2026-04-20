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
