import { NextResponse } from "next/server";
import { getAIProviderStatus, AGENTS } from "@/lib/agents/engine";

interface ProviderStatus {
  name: string;
  configured: boolean;
  status: "ready" | "not_configured" | "error";
  message: string;
}

interface IntegrationStatus {
  name: string;
  category: "ai" | "communication" | "project" | "social" | "crm";
  configured: boolean;
  envKey: string;
}

export async function GET() {
  // Check AI providers
  const aiStatus = getAIProviderStatus();

  // Helper to check if a key is a real key (not a placeholder)
  const isValidKey = (key: string | undefined, prefix: string): boolean => {
    if (!key) return false;
    if (!key.startsWith(prefix)) return false;
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("your-key") || lowerKey.includes("your_key")) return false;
    if (lowerKey.includes("placeholder") || lowerKey.includes("example")) return false;
    if (lowerKey.includes("xxx") || lowerKey.includes("test")) return false;
    if (key.length < 40) return false; // Real API keys are typically 40+ characters
    return true;
  };

  const anthropicValid = isValidKey(process.env.ANTHROPIC_API_KEY, "sk-ant-");
  const openaiValid = isValidKey(process.env.OPENAI_API_KEY, "sk-");
  const openrouterValid = process.env.OPENROUTER_API_KEY &&
    process.env.OPENROUTER_API_KEY.length > 20 &&
    !process.env.OPENROUTER_API_KEY.includes("your");

  const aiProviders: ProviderStatus[] = [
    {
      name: "Anthropic Claude",
      configured: anthropicValid,
      status: anthropicValid ? "ready" : "not_configured",
      message: anthropicValid
        ? "Connected - Using Claude for AI agents"
        : "Add ANTHROPIC_API_KEY to enable Claude",
    },
    {
      name: "OpenAI GPT-4",
      configured: openaiValid,
      status: openaiValid ? "ready" : "not_configured",
      message: openaiValid
        ? "Connected - Available as fallback"
        : "Add OPENAI_API_KEY as backup provider",
    },
    {
      name: "OpenRouter",
      configured: !!openrouterValid,
      status: openrouterValid ? "ready" : "not_configured",
      message: openrouterValid
        ? "Connected - Available as fallback"
        : "Add OPENROUTER_API_KEY for multi-model access",
    },
  ];

  // Check all integrations
  const integrations: IntegrationStatus[] = [
    // Communication
    { name: "Slack", category: "communication", configured: !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_BOT_TOKEN !== "your-token-here"), envKey: "SLACK_BOT_TOKEN" },
    { name: "Discord", category: "communication", configured: !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN !== "your-token-here"), envKey: "DISCORD_BOT_TOKEN" },
    { name: "Telegram", category: "communication", configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== "your-token-here"), envKey: "TELEGRAM_BOT_TOKEN" },

    // Project Management
    { name: "ClickUp", category: "project", configured: !!(process.env.CLICKUP_API_KEY && process.env.CLICKUP_API_KEY !== "your-key-here"), envKey: "CLICKUP_API_KEY" },

    // Social Media
    { name: "Facebook", category: "social", configured: !!(process.env.FB_ACCESS_TOKEN && process.env.FB_ACCESS_TOKEN !== "your-token-here"), envKey: "FB_ACCESS_TOKEN" },
    { name: "Twitter/X", category: "social", configured: !!(process.env.TWITTER_BEARER_TOKEN && process.env.TWITTER_BEARER_TOKEN !== "your-token-here"), envKey: "TWITTER_BEARER_TOKEN" },
    { name: "LinkedIn", category: "social", configured: !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_ACCESS_TOKEN !== "your-token-here"), envKey: "LINKEDIN_ACCESS_TOKEN" },
    { name: "Reddit", category: "social", configured: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_ID !== "your-id-here"), envKey: "REDDIT_CLIENT_ID" },
    { name: "Threads", category: "social", configured: !!(process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_ACCESS_TOKEN !== "your-token-here"), envKey: "THREADS_ACCESS_TOKEN" },

    // CRM
    { name: "GoHighLevel", category: "crm", configured: !!(process.env.GHL_API_KEY && process.env.GHL_API_KEY !== "your-key-here"), envKey: "GHL_API_KEY" },
  ];

  // Calculate stats
  const configuredAI = aiProviders.filter(p => p.configured).length;
  const configuredIntegrations = integrations.filter(i => i.configured).length;
  const totalIntegrations = integrations.length;

  return NextResponse.json({
    ai: {
      available: aiStatus.available,
      activeProvider: aiStatus.provider,
      message: aiStatus.message,
      providers: aiProviders,
    },
    integrations,
    agents: {
      total: Object.keys(AGENTS).length,
      list: Object.entries(AGENTS).map(([id, agent]) => ({
        id,
        name: agent.name,
        role: agent.role,
        emoji: agent.emoji,
      })),
    },
    summary: {
      aiConfigured: configuredAI > 0,
      aiProviderCount: configuredAI,
      integrationsConfigured: configuredIntegrations,
      totalIntegrations,
      systemReady: aiStatus.available,
    },
    timestamp: new Date().toISOString(),
  });
}
