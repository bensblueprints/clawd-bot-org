"use client";

import { useState, useEffect } from "react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  description: string;
  required: boolean;
  configured: boolean;
}

const API_KEYS_CONFIG = [
  {
    id: "ANTHROPIC_API_KEY",
    name: "Anthropic API",
    description: "Powers Claude AI responses in the terminal",
    required: false,
  },
  {
    id: "MINIMAX_API_KEY",
    name: "MiniMax API",
    description: "Primary AI provider for agent communication",
    required: true,
  },
  {
    id: "OPENROUTER_API_KEY",
    name: "OpenRouter API",
    description: "Fallback AI provider with multiple models",
    required: false,
  },
  {
    id: "SLACK_BOT_TOKEN",
    name: "Slack Bot Token",
    description: "Connect Mission Control to Slack workspace",
    required: false,
  },
  {
    id: "SLACK_SIGNING_SECRET",
    name: "Slack Signing Secret",
    description: "Verify Slack webhook requests",
    required: false,
  },
  {
    id: "DISCORD_BOT_TOKEN",
    name: "Discord Bot Token",
    description: "Connect bots to Discord servers",
    required: false,
  },
  {
    id: "TELEGRAM_BOT_TOKEN",
    name: "Telegram Bot Token",
    description: "Connect bots to Telegram",
    required: false,
  },
  {
    id: "OPENAI_API_KEY",
    name: "OpenAI API",
    description: "GPT models for additional AI capabilities",
    required: false,
  },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchKeyStatus();
  }, []);

  async function fetchKeyStatus() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setConfigured(data.configured || {});
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "API keys saved successfully!" });
        setKeys({});
        fetchKeyStatus();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save keys" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">
          <span className="text-accent">Settings</span>
        </h1>
        <p className="text-text-muted mt-1">
          Configure API keys and integrations for Mission Control
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">AI Provider Keys</h2>
          <p className="text-text-muted text-sm mb-6">
            Configure AI providers for the Agent Terminal. At least one provider is required.
          </p>

          <div className="space-y-4">
            {API_KEYS_CONFIG.filter((k) =>
              ["ANTHROPIC_API_KEY", "MINIMAX_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"].includes(k.id)
            ).map((keyConfig) => (
              <div key={keyConfig.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{keyConfig.name}</span>
                    {keyConfig.required && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        Required
                      </span>
                    )}
                    {configured[keyConfig.id] && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        Configured
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-text-muted text-sm mb-3">{keyConfig.description}</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey[keyConfig.id] ? "text" : "password"}
                      placeholder={configured[keyConfig.id] ? "••••••••••••••••" : "Enter API key..."}
                      value={keys[keyConfig.id] || ""}
                      onChange={(e) => setKeys({ ...keys, [keyConfig.id]: e.target.value })}
                      className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <button
                    onClick={() => setShowKey({ ...showKey, [keyConfig.id]: !showKey[keyConfig.id] })}
                    className="px-3 py-2 border border-border rounded-lg hover:bg-white/5"
                  >
                    {showKey[keyConfig.id] ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Platform Integrations</h2>
          <p className="text-text-muted text-sm mb-6">
            Connect Mission Control to messaging platforms for bot deployment.
          </p>

          <div className="space-y-4">
            {API_KEYS_CONFIG.filter((k) =>
              ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "DISCORD_BOT_TOKEN", "TELEGRAM_BOT_TOKEN"].includes(k.id)
            ).map((keyConfig) => (
              <div key={keyConfig.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{keyConfig.name}</span>
                    {configured[keyConfig.id] && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        Configured
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-text-muted text-sm mb-3">{keyConfig.description}</p>
                <div className="flex gap-2">
                  <input
                    type={showKey[keyConfig.id] ? "text" : "password"}
                    placeholder={configured[keyConfig.id] ? "••••••••••••••••" : "Enter token..."}
                    value={keys[keyConfig.id] || ""}
                    onChange={(e) => setKeys({ ...keys, [keyConfig.id]: e.target.value })}
                    className="flex-1 bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => setShowKey({ ...showKey, [keyConfig.id]: !showKey[keyConfig.id] })}
                    className="px-3 py-2 border border-border rounded-lg hover:bg-white/5"
                  >
                    {showKey[keyConfig.id] ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Server Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-bg rounded-lg">
              <span className="text-text-muted">Instance Type</span>
              <p className="font-medium mt-1">Mission Control</p>
            </div>
            <div className="p-3 bg-bg rounded-lg">
              <span className="text-text-muted">Node.js Version</span>
              <p className="font-medium mt-1">v22.x</p>
            </div>
            <div className="p-3 bg-bg rounded-lg">
              <span className="text-text-muted">Next.js Version</span>
              <p className="font-medium mt-1">v16.1.6</p>
            </div>
            <div className="p-3 bg-bg rounded-lg">
              <span className="text-text-muted">Environment</span>
              <p className="font-medium mt-1">Production</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(keys).length === 0}
          className="px-6 py-2.5 bg-accent text-bg font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
