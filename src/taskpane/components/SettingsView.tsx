import * as React from "react";
import {
  makeStyles, tokens, Button, Field, Input, Select,
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
