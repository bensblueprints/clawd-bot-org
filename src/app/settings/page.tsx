"use client";

import { useState, useEffect } from "react";
import { HelpCircle, ExternalLink, Download, X, Plus, Trash2, Play, Pause, AlertTriangle, CheckCircle, Zap } from "lucide-react";

interface AIProviderStatus {
  name: string;
  configured: boolean;
  status: "ready" | "not_configured" | "error";
  message: string;
}

interface SystemStatus {
  ai: {
    available: boolean;
    activeProvider: string;
    message: string;
    providers: AIProviderStatus[];
  };
  summary: {
    aiConfigured: boolean;
    aiProviderCount: number;
    integrationsConfigured: number;
    totalIntegrations: number;
    systemReady: boolean;
  };
}

interface ApiKeyConfig {
  id: string;
  name: string;
  key: string;
  description: string;
  required: boolean;
  configured: boolean;
  docUrl: string;
  steps: string[];
}

interface PersistentTask {
  id: string;
  title: string;
  description: string;
  assignedAgent: string;
  schedule: "continuous" | "hourly" | "daily" | "weekly";
  priority: "High" | "Medium" | "Low";
  enabled: boolean;
  createdAt: string;
}

const AGENTS_LIST = [
  { id: "claude", name: "Claude", role: "Lead AI & Project Director" },
  { id: "scout", name: "Scout", role: "Senior Codebase Explorer" },
  { id: "builder", name: "Builder", role: "Full-Stack Developer" },
  { id: "solver", name: "Solver", role: "General Purpose Developer" },
  { id: "archie", name: "Archie", role: "Software Architect" },
  { id: "pixel", name: "Pixel", role: "UI/UX Designer" },
  { id: "sentinel", name: "Sentinel", role: "Senior Code Reviewer" },
  { id: "quill", name: "Quill", role: "Content Writer" },
  { id: "herald", name: "Herald", role: "Client Liaison" },
];

const API_KEYS_CONFIG: Omit<ApiKeyConfig, "key" | "configured">[] = [
  {
    id: "ANTHROPIC_API_KEY",
    name: "Anthropic API",
    description: "Powers Claude AI responses in the terminal",
    required: false,
    docUrl: "https://console.anthropic.com/settings/keys",
    steps: [
      "Go to console.anthropic.com",
      "Sign in or create an account",
      "Navigate to Settings → API Keys",
      "Click 'Create Key' and copy your key",
    ],
  },
  {
    id: "MINIMAX_API_KEY",
    name: "MiniMax API",
    description: "Primary AI provider for agent communication",
    required: true,
    docUrl: "https://www.minimaxi.com/platform",
    steps: [
      "Visit minimaxi.com/platform",
      "Create an account or sign in",
      "Go to API section in dashboard",
      "Generate a new API key and copy it",
    ],
  },
  {
    id: "OPENROUTER_API_KEY",
    name: "OpenRouter API",
    description: "Fallback AI provider with multiple models",
    required: false,
    docUrl: "https://openrouter.ai/keys",
    steps: [
      "Go to openrouter.ai",
      "Sign in with Google/GitHub/Email",
      "Navigate to Keys tab",
      "Create new key and copy",
    ],
  },
  {
    id: "SLACK_BOT_TOKEN",
    name: "Slack Bot Token",
    description: "Connect Mission Control to Slack workspace",
    required: false,
    docUrl: "https://api.slack.com/apps",
    steps: [
      "Go to api.slack.com/apps",
      "Click 'Create New App' → From scratch",
      "Add OAuth scopes under 'OAuth & Permissions'",
      "Install to workspace, copy Bot User OAuth Token",
    ],
  },
  {
    id: "SLACK_SIGNING_SECRET",
    name: "Slack Signing Secret",
    description: "Verify Slack webhook requests",
    required: false,
    docUrl: "https://api.slack.com/apps",
    steps: [
      "Go to api.slack.com/apps",
      "Select your app",
      "Go to 'Basic Information'",
      "Copy 'Signing Secret' under App Credentials",
    ],
  },
  {
    id: "DISCORD_BOT_TOKEN",
    name: "Discord Bot Token",
    description: "Connect bots to Discord servers",
    required: false,
    docUrl: "https://discord.com/developers/applications",
    steps: [
      "Go to discord.com/developers/applications",
      "Click 'New Application', give it a name",
      "Go to 'Bot' tab → Add Bot",
      "Click 'Reset Token' and copy the token",
    ],
  },
  {
    id: "TELEGRAM_BOT_TOKEN",
    name: "Telegram Bot Token",
    description: "Connect bots to Telegram",
    required: false,
    docUrl: "https://t.me/BotFather",
    steps: [
      "Open Telegram and search @BotFather",
      "Send /newbot command",
      "Follow prompts to name your bot",
      "Copy the API token provided",
    ],
  },
  {
    id: "OPENAI_API_KEY",
    name: "OpenAI API",
    description: "GPT models for additional AI capabilities",
    required: false,
    docUrl: "https://platform.openai.com/api-keys",
    steps: [
      "Go to platform.openai.com",
      "Sign in and go to API Keys",
      "Click 'Create new secret key'",
      "Name it and copy the key immediately",
    ],
  },
  {
    id: "CLICKUP_API_KEY",
    name: "ClickUp API",
    description: "Monitor your ClickUp tasks and auto-execute with agents",
    required: false,
    docUrl: "https://app.clickup.com/settings/apps",
    steps: [
      "Go to ClickUp → Settings → Apps",
      "Scroll to 'API Token'",
      "Click 'Generate' or copy existing token",
      "Token starts with 'pk_'",
    ],
  },
  {
    id: "CLICKUP_WORKSPACE_ID",
    name: "ClickUp Workspace ID",
    description: "Your ClickUp workspace ID to monitor",
    required: false,
    docUrl: "https://app.clickup.com/settings/teams",
    steps: [
      "Go to ClickUp → Settings → Workspaces",
      "Click on your workspace",
      "The ID is in the URL after /t/",
      "Or use API: GET /team to list workspaces",
    ],
  },
  {
    id: "FB_ACCESS_TOKEN",
    name: "Facebook Access Token",
    description: "Facebook Marketing API for ads management",
    required: false,
    docUrl: "https://developers.facebook.com/tools/explorer/",
    steps: [
      "Go to developers.facebook.com",
      "Create an app if needed",
      "Use Graph API Explorer",
      "Generate token with ads_management permissions",
    ],
  },
  {
    id: "TWITTER_BEARER_TOKEN",
    name: "Twitter Bearer Token",
    description: "Post and schedule tweets automatically",
    required: false,
    docUrl: "https://developer.twitter.com/en/portal/dashboard",
    steps: [
      "Go to developer.twitter.com/portal",
      "Create a project and app",
      "Go to Keys and Tokens tab",
      "Generate Bearer Token",
    ],
  },
  {
    id: "TWITTER_ACCESS_TOKEN",
    name: "Twitter Access Token",
    description: "Twitter OAuth access token for posting",
    required: false,
    docUrl: "https://developer.twitter.com/en/portal/dashboard",
    steps: [
      "In Twitter Developer Portal",
      "Select your app → Keys and Tokens",
      "Under User Authentication Tokens",
      "Generate Access Token and Secret",
    ],
  },
  {
    id: "TWITTER_ACCESS_SECRET",
    name: "Twitter Access Secret",
    description: "Twitter OAuth access secret",
    required: false,
    docUrl: "https://developer.twitter.com/en/portal/dashboard",
    steps: [
      "Generated alongside Access Token",
      "In Keys and Tokens section",
      "Click 'Generate' if not yet created",
      "Save immediately - shown once only",
    ],
  },
  {
    id: "LINKEDIN_ACCESS_TOKEN",
    name: "LinkedIn Access Token",
    description: "Post to LinkedIn company pages",
    required: false,
    docUrl: "https://www.linkedin.com/developers/apps",
    steps: [
      "Go to linkedin.com/developers/apps",
      "Create a new app",
      "Request Marketing Developer Platform access",
      "Generate OAuth 2.0 token with w_member_social scope",
    ],
  },
  {
    id: "REDDIT_CLIENT_ID",
    name: "Reddit Client ID",
    description: "Reddit API client ID for posting",
    required: false,
    docUrl: "https://www.reddit.com/prefs/apps",
    steps: [
      "Go to reddit.com/prefs/apps",
      "Scroll down and click 'create another app'",
      "Select 'script' type for personal use",
      "Copy the client ID (under app name)",
    ],
  },
  {
    id: "REDDIT_CLIENT_SECRET",
    name: "Reddit Client Secret",
    description: "Reddit API client secret",
    required: false,
    docUrl: "https://www.reddit.com/prefs/apps",
    steps: [
      "In your Reddit app settings",
      "Find the 'secret' field",
      "Copy the secret key",
      "Keep this secure - never share publicly",
    ],
  },
  {
    id: "REDDIT_USERNAME",
    name: "Reddit Username",
    description: "Your Reddit account username",
    required: false,
    docUrl: "https://www.reddit.com/prefs/apps",
    steps: [
      "Your Reddit username without u/",
      "This is the account that will post",
      "Must be the same account that created the app",
      "Example: YourUsername",
    ],
  },
  {
    id: "REDDIT_PASSWORD",
    name: "Reddit Password",
    description: "Your Reddit account password",
    required: false,
    docUrl: "https://www.reddit.com/prefs/apps",
    steps: [
      "Your Reddit account password",
      "Required for script-type apps",
      "Consider using an app-specific password",
      "Keep secure - stored encrypted",
    ],
  },
  {
    id: "THREADS_ACCESS_TOKEN",
    name: "Threads Access Token",
    description: "Meta Threads API for posting",
    required: false,
    docUrl: "https://developers.facebook.com/docs/threads",
    steps: [
      "Go to developers.facebook.com",
      "Create or select your app",
      "Add Threads API product",
      "Generate access token with threads_publish scope",
    ],
  },
  {
    id: "THREADS_USER_ID",
    name: "Threads User ID",
    description: "Your Threads profile user ID",
    required: false,
    docUrl: "https://developers.facebook.com/docs/threads/get-started",
    steps: [
      "Use Threads API to get your user ID",
      "Call GET /me endpoint with access token",
      "Copy the 'id' field from response",
      "This is your numeric user ID",
    ],
  },
  {
    id: "GHL_API_KEY",
    name: "Go High Level API Key",
    description: "Master API key for GoHighLevel CRM",
    required: false,
    docUrl: "https://highlevel.stoplight.io/docs/integrations",
    steps: [
      "Go to GoHighLevel → Settings → API Keys",
      "Generate new API key or use existing",
      "Copy the full API key",
      "Ensure it has appropriate permissions",
    ],
  },
  {
    id: "GHL_LOCATION_ID",
    name: "GHL Location ID",
    description: "GoHighLevel location/sub-account ID",
    required: false,
    docUrl: "https://highlevel.stoplight.io/docs/integrations/locations",
    steps: [
      "In GHL, go to Settings → Business Profile",
      "Find Location ID in the URL or settings",
      "Usually starts with a long alphanumeric string",
      "Each sub-account has its own Location ID",
    ],
  },
  {
    id: "GHL_PIPELINE_ID",
    name: "GHL Pipeline ID",
    description: "Default sales pipeline ID",
    required: false,
    docUrl: "https://highlevel.stoplight.io/docs/integrations/pipelines",
    steps: [
      "Go to GHL → Opportunities → Pipelines",
      "Click on your target pipeline",
      "Copy pipeline ID from URL or API",
      "This is where new opportunities are created",
    ],
  },
];

function TooltipContent({ config, onClose }: { config: typeof API_KEYS_CONFIG[0]; onClose: () => void }) {
  return (
    <div className="absolute z-50 top-full left-0 mt-2 w-80 bg-bg border border-border rounded-xl shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-accent">{config.name} Setup</h4>
        <button onClick={onClose} className="text-text-muted hover:text-text p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <ol className="space-y-2 mb-4">
        {config.steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-text-muted">{step}</span>
          </li>
        ))}
      </ol>

      <a
        href={config.docUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-accent hover:underline"
      >
        <ExternalLink className="w-4 h-4" />
        Open {config.name} Dashboard
      </a>
    </div>
  );
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [verified, setVerified] = useState<Record<string, boolean | null>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [persistentTasks, setPersistentTasks] = useState<PersistentTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<PersistentTask>>({
    title: "",
    description: "",
    assignedAgent: "claude",
    schedule: "continuous",
    priority: "Medium",
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetchKeyStatus();
    fetchPersistentTasks();
    fetchSystemStatus();
  }, []);

  async function fetchSystemStatus() {
    try {
      setLoadingStatus(true);
      const res = await fetch("/api/settings/status");
      const data = await res.json();
      setSystemStatus(data);
    } catch (error) {
      console.error("Failed to fetch system status:", error);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function fetchKeyStatus() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setConfigured(data.configured || {});
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }

  async function fetchPersistentTasks() {
    try {
      const res = await fetch("/api/tasks/persistent");
      const data = await res.json();
      setPersistentTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  }

  async function saveAndVerifyKey(keyId: string) {
    if (!keys[keyId]?.trim()) return;

    setSaving(prev => ({ ...prev, [keyId]: true }));
    setVerifying(prev => ({ ...prev, [keyId]: true }));
    setVerified(prev => ({ ...prev, [keyId]: null }));

    try {
      // First save the key
      const saveRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: { [keyId]: keys[keyId] } }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save key");
      }

      // Then verify the connection
      const verifyRes = await fetch("/api/settings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, value: keys[keyId] }),
      });

      const verifyData = await verifyRes.json();

      setVerified(prev => ({ ...prev, [keyId]: verifyData.valid }));
      setConfigured(prev => ({ ...prev, [keyId]: verifyData.valid }));

      if (verifyData.valid) {
        setMessage({ type: "success", text: `${keyId.replace(/_/g, " ")} verified and saved!` });
        setKeys(prev => {
          const newKeys = { ...prev };
          delete newKeys[keyId];
          return newKeys;
        });
      } else {
        setMessage({ type: "error", text: verifyData.error || `${keyId.replace(/_/g, " ")} verification failed` });
      }
    } catch (error) {
      setVerified(prev => ({ ...prev, [keyId]: false }));
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setSaving(prev => ({ ...prev, [keyId]: false }));
      setVerifying(prev => ({ ...prev, [keyId]: false }));
    }
  }

  async function addPersistentTask() {
    if (!newTask.title?.trim()) return;

    try {
      const res = await fetch("/api/tasks/persistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTask,
          id: `task-${Date.now()}`,
          enabled: true,
          createdAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        fetchPersistentTasks();
        setShowAddTask(false);
        setNewTask({
          title: "",
          description: "",
          assignedAgent: "claude",
          schedule: "continuous",
          priority: "Medium",
        });
        setMessage({ type: "success", text: "Task added successfully!" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to add task" });
    }
  }

  async function toggleTaskEnabled(taskId: string, enabled: boolean) {
    try {
      await fetch("/api/tasks/persistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, enabled }),
      });
      fetchPersistentTasks();
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  }

  async function deleteTask(taskId: string) {
    try {
      await fetch("/api/tasks/persistent", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId }),
      });
      fetchPersistentTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  function downloadGuide() {
    const guideContent = `# Mission Control - API Setup Guide
Generated: ${new Date().toLocaleDateString()}

## Overview
This guide walks you through setting up each API integration for Mission Control.

---

## AI Provider Keys

### Anthropic API (Claude)
Powers intelligent AI responses in your terminal.

**Steps:**
1. Go to https://console.anthropic.com/settings/keys
2. Sign in or create an account
3. Navigate to Settings → API Keys
4. Click 'Create Key' and copy your key

---

### MiniMax API
Primary AI provider for agent communication.

**Steps:**
1. Visit https://www.minimaxi.com/platform
2. Create an account or sign in
3. Go to API section in dashboard
4. Generate a new API key and copy it

---

### OpenRouter API
Access multiple AI models through one API.

**Steps:**
1. Go to https://openrouter.ai/keys
2. Sign in with Google/GitHub/Email
3. Navigate to Keys tab
4. Create new key and copy

---

### OpenAI API
GPT models for additional AI capabilities.

**Steps:**
1. Go to https://platform.openai.com/api-keys
2. Sign in and go to API Keys
3. Click 'Create new secret key'
4. Name it and copy the key immediately (shown once)

---

## Platform Integrations

### Slack Bot Token
Connect Mission Control to your Slack workspace.

**Steps:**
1. Go to https://api.slack.com/apps
2. Click 'Create New App' → From scratch
3. Add OAuth scopes: chat:write, channels:read, commands
4. Install to workspace
5. Copy Bot User OAuth Token (starts with xoxb-)

**Signing Secret:**
- Found in Basic Information → App Credentials

---

### Discord Bot Token
Deploy bots to Discord servers.

**Steps:**
1. Go to https://discord.com/developers/applications
2. Click 'New Application'
3. Go to 'Bot' tab → Add Bot
4. Enable MESSAGE CONTENT INTENT
5. Click 'Reset Token' and copy

---

### Telegram Bot Token
Connect to Telegram.

**Steps:**
1. Open Telegram, search @BotFather
2. Send /newbot command
3. Follow prompts to name your bot
4. Copy the HTTP API token provided

---

## Task Management

### ClickUp API Key
Monitor and auto-execute ClickUp tasks.

**Steps:**
1. Go to ClickUp → Settings (bottom left) → Apps
2. Scroll to 'API Token' section
3. Click 'Generate' or regenerate
4. Token starts with 'pk_'

**Workspace ID:**
- Found in URL when viewing workspace: app.clickup.com/t/WORKSPACE_ID/...
- Or use API endpoint: GET https://api.clickup.com/api/v2/team

---

## Marketing & Social Media

### Facebook Access Token
Manage Facebook ads and posts.

**Steps:**
1. Go to https://developers.facebook.com
2. Create an app (Business type)
3. Add 'Marketing API' product
4. Use Graph API Explorer to generate token
5. Required permissions: ads_management, pages_manage_posts

---

### Twitter/X API Tokens
Automate tweets and engagement.

**Steps:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a project and app
3. Set User Authentication to Read and Write
4. Generate Bearer Token (for reading)
5. Generate Access Token & Secret (for posting)

---

### LinkedIn Access Token
Post to company pages.

**Steps:**
1. Go to https://www.linkedin.com/developers/apps
2. Create a new app
3. Request Marketing Developer Platform access
4. Set up OAuth 2.0 with w_member_social scope
5. Generate token via OAuth flow

---

## Security Best Practices

1. **Never share** API keys publicly
2. **Rotate keys** regularly (every 90 days)
3. **Use minimal permissions** only what's needed
4. **Monitor usage** for unexpected activity
5. **Revoke immediately** if compromised

---

## Support

Need help? Contact your system administrator or visit the documentation for each service linked above.
`;

    const blob = new Blob([guideContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mission-control-api-setup-guide.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderKeySection(
    title: string,
    description: string,
    keyIds: string[]
  ) {
    const sectionKeys = API_KEYS_CONFIG.filter((k) => keyIds.includes(k.id));

    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <p className="text-text-muted text-sm mb-6">{description}</p>

        <div className="space-y-4">
          {sectionKeys.map((keyConfig) => (
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
                <div className="relative">
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === keyConfig.id ? null : keyConfig.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-accent transition-colors"
                    title="How to get this API key"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                  {activeTooltip === keyConfig.id && (
                    <TooltipContent
                      config={keyConfig}
                      onClose={() => setActiveTooltip(null)}
                    />
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
                    className={`w-full bg-bg border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent ${
                      verified[keyConfig.id] === true ? "border-green-500" :
                      verified[keyConfig.id] === false ? "border-red-500" : "border-border"
                    }`}
                  />
                  {verified[keyConfig.id] === true && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">Verified</span>
                  )}
                </div>
                <button
                  onClick={() => setShowKey({ ...showKey, [keyConfig.id]: !showKey[keyConfig.id] })}
                  className="px-3 py-2 border border-border rounded-lg hover:bg-white/5 text-sm"
                >
                  {showKey[keyConfig.id] ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => saveAndVerifyKey(keyConfig.id)}
                  disabled={!keys[keyConfig.id]?.trim() || saving[keyConfig.id]}
                  className="px-4 py-2 bg-accent text-bg font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  {saving[keyConfig.id] ? (
                    <>
                      <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                      {verifying[keyConfig.id] ? "Verifying..." : "Saving..."}
                    </>
                  ) : (
                    "Save & Verify"
                  )}
                </button>
                <a
                  href={keyConfig.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 border border-border rounded-lg hover:bg-white/5 hover:border-accent transition-colors"
                  title={`Get ${keyConfig.name}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            <span className="text-accent">Settings</span>
          </h1>
          <p className="text-text-muted mt-1">
            Configure API keys and integrations for Mission Control
          </p>
        </div>
        <button
          onClick={downloadGuide}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Download Setup Guide
        </button>
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

      {/* AI System Status Banner */}
      {!loadingStatus && systemStatus && (
        <div className={`mb-6 p-6 rounded-xl border ${
          systemStatus.ai.available
            ? "bg-green-500/5 border-green-500/30"
            : "bg-red-500/10 border-red-500/50"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              systemStatus.ai.available ? "bg-green-500/20" : "bg-red-500/20"
            }`}>
              {systemStatus.ai.available ? (
                <CheckCircle className="w-8 h-8 text-green-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-bold mb-1 ${
                systemStatus.ai.available ? "text-green-400" : "text-red-400"
              }`}>
                {systemStatus.ai.available ? "AI System Ready" : "AI System Not Configured"}
              </h2>
              <p className={`text-sm mb-4 ${
                systemStatus.ai.available ? "text-green-400/70" : "text-red-400/70"
              }`}>
                {systemStatus.ai.message}
              </p>

              {/* Provider Status Grid */}
              <div className="grid grid-cols-3 gap-3">
                {systemStatus.ai.providers.map((provider) => (
                  <div
                    key={provider.name}
                    className={`p-3 rounded-lg border ${
                      provider.configured
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-white/5 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {provider.configured ? (
                        <Zap className="w-4 h-4 text-green-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-text-muted/30" />
                      )}
                      <span className={`text-sm font-medium ${
                        provider.configured ? "text-green-400" : "text-text-muted"
                      }`}>
                        {provider.name}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted pl-6">{provider.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!systemStatus.ai.available && (
            <div className="mt-4 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <p className="text-sm text-red-400 font-medium mb-2">
                Agents cannot work without an AI provider!
              </p>
              <p className="text-sm text-red-400/70">
                Add at least one of these API keys below: <strong>Anthropic API</strong>, <strong>OpenAI API</strong>, or <strong>OpenRouter API</strong>.
                The terminal and agent system require AI to function.
              </p>
            </div>
          )}
        </div>
      )}

      {loadingStatus && (
        <div className="mb-6 p-6 rounded-xl border border-border bg-surface animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10" />
            <div className="flex-1">
              <div className="h-6 w-48 bg-white/10 rounded mb-2" />
              <div className="h-4 w-64 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {renderKeySection(
          "AI Provider Keys",
          "Configure AI providers for the Agent Terminal. At least one provider is required.",
          ["ANTHROPIC_API_KEY", "MINIMAX_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"]
        )}

        {renderKeySection(
          "Platform Integrations",
          "Connect Mission Control to messaging platforms for bot deployment.",
          ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "DISCORD_BOT_TOKEN", "TELEGRAM_BOT_TOKEN"]
        )}

        {renderKeySection(
          "Task Management (ClickUp)",
          "Connect to ClickUp to automatically monitor your tasks and execute them with agents.",
          ["CLICKUP_API_KEY", "CLICKUP_WORKSPACE_ID"]
        )}

        {renderKeySection(
          "Marketing & Social Media",
          "Connect social platforms for automated posting and ad management.",
          ["FB_ACCESS_TOKEN", "TWITTER_BEARER_TOKEN", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET", "LINKEDIN_ACCESS_TOKEN"]
        )}

        {renderKeySection(
          "Reddit Integration",
          "Auto-post to Reddit subreddits and engage with communities.",
          ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USERNAME", "REDDIT_PASSWORD"]
        )}

        {renderKeySection(
          "Threads Integration",
          "Post to Meta Threads (Instagram's text platform) automatically.",
          ["THREADS_ACCESS_TOKEN", "THREADS_USER_ID"]
        )}

        {renderKeySection(
          "Go High Level CRM",
          "Connect to GoHighLevel for sales pipelines and lead management.",
          ["GHL_API_KEY", "GHL_LOCATION_ID", "GHL_PIPELINE_ID"]
        )}

        {/* Persistent Work Tasks Section */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Persistent Work Tasks</h2>
              <p className="text-text-muted text-sm mt-1">
                Assign recurring tasks to agents. These run automatically based on schedule.
              </p>
            </div>
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-bg font-medium rounded-lg hover:bg-accent/90 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>

          {/* Add Task Form */}
          {showAddTask && (
            <div className="mb-6 p-4 bg-bg border border-border rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-text-muted block mb-1">Task Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Daily SEO Blog Post"
                    value={newTask.title || ""}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-muted block mb-1">Assign Agent</label>
                  <select
                    value={newTask.assignedAgent || "claude"}
                    onChange={(e) => setNewTask({ ...newTask, assignedAgent: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                  >
                    {AGENTS_LIST.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} - {agent.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-sm text-text-muted block mb-1">Description</label>
                <textarea
                  placeholder="Describe what this task should accomplish..."
                  value={newTask.description || ""}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-text-muted block mb-1">Schedule</label>
                  <select
                    value={newTask.schedule || "continuous"}
                    onChange={(e) => setNewTask({ ...newTask, schedule: e.target.value as PersistentTask["schedule"] })}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="continuous">Continuous (always running)</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-muted block mb-1">Priority</label>
                  <select
                    value={newTask.priority || "Medium"}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as PersistentTask["priority"] })}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-white/5 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addPersistentTask}
                  disabled={!newTask.title?.trim()}
                  className="px-4 py-2 bg-accent text-bg font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 text-sm"
                >
                  Add Task
                </button>
              </div>
            </div>
          )}

          {/* Task List */}
          {persistentTasks.length > 0 ? (
            <div className="space-y-3">
              {persistentTasks.map(task => {
                const agent = AGENTS_LIST.find(a => a.id === task.assignedAgent);
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      task.enabled ? "bg-bg border-border" : "bg-bg/50 border-border/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium">{task.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.priority === "High" ? "bg-red-500/20 text-red-400" :
                            task.priority === "Medium" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-green-500/20 text-green-400"
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                            {task.schedule}
                          </span>
                          {task.enabled && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-text-muted text-sm mb-2">{task.description}</p>
                        <p className="text-xs text-text-muted">
                          Assigned to: <span className="text-accent">{agent?.name || task.assignedAgent}</span>
                          {agent && <span className="text-text-muted/60"> ({agent.role})</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTaskEnabled(task.id, !task.enabled)}
                          className={`p-2 rounded-lg border transition-colors ${
                            task.enabled
                              ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                              : "border-border text-text-muted hover:bg-white/5"
                          }`}
                          title={task.enabled ? "Pause task" : "Resume task"}
                        >
                          {task.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-2 rounded-lg border border-border text-text-muted hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <p className="mb-2">No persistent tasks configured</p>
              <p className="text-sm">Add tasks to keep your agents working automatically</p>
            </div>
          )}
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

    </div>
  );
}
