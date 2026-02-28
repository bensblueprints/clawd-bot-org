import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env");
const DATA_DIR = path.join(process.cwd(), "data");
const APP_SETTINGS_PATH = path.join(DATA_DIR, "app-settings.json");

interface AppSettings {
  theme: string;
  updatedAt: string;
}

// Parse .env file
async function parseEnvFile(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(ENV_PATH, "utf-8");
    const lines = content.split("\n");
    const env: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key) {
          env[key] = valueParts.join("=");
        }
      }
    }

    return env;
  } catch {
    return {};
  }
}

// Write .env file
async function writeEnvFile(env: Record<string, string>): Promise<void> {
  const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
  await fs.writeFile(ENV_PATH, lines.join("\n") + "\n");
}

// Load app settings
async function loadAppSettings(): Promise<AppSettings> {
  try {
    const content = await fs.readFile(APP_SETTINGS_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { theme: "default", updatedAt: new Date().toISOString() };
  }
}

// Save app settings
async function saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await loadAppSettings();
  const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(APP_SETTINGS_PATH, JSON.stringify(updated, null, 2));
}

// GET - Check which keys are configured
export async function GET() {
  const env = await parseEnvFile();
  const appSettings = await loadAppSettings();

  const configured: Record<string, boolean> = {
    ANTHROPIC_API_KEY: !!env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY !== "your-key-here",
    MINIMAX_API_KEY: !!env.MINIMAX_API_KEY && env.MINIMAX_API_KEY !== "your-key-here",
    OPENROUTER_API_KEY: !!env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY !== "your-key-here",
    OPENAI_API_KEY: !!env.OPENAI_API_KEY && env.OPENAI_API_KEY !== "your-key-here",
    SLACK_BOT_TOKEN: !!env.SLACK_BOT_TOKEN && env.SLACK_BOT_TOKEN !== "your-token-here",
    SLACK_SIGNING_SECRET: !!env.SLACK_SIGNING_SECRET && env.SLACK_SIGNING_SECRET !== "your-secret-here",
    DISCORD_BOT_TOKEN: !!env.DISCORD_BOT_TOKEN && env.DISCORD_BOT_TOKEN !== "your-token-here",
    TELEGRAM_BOT_TOKEN: !!env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_TOKEN !== "your-token-here",
    CLICKUP_API_KEY: !!env.CLICKUP_API_KEY && env.CLICKUP_API_KEY !== "your-key-here",
    CLICKUP_WORKSPACE_ID: !!env.CLICKUP_WORKSPACE_ID && env.CLICKUP_WORKSPACE_ID !== "your-id-here",
    FB_ACCESS_TOKEN: !!env.FB_ACCESS_TOKEN && env.FB_ACCESS_TOKEN !== "your-token-here",
    TWITTER_BEARER_TOKEN: !!env.TWITTER_BEARER_TOKEN && env.TWITTER_BEARER_TOKEN !== "your-token-here",
    TWITTER_ACCESS_TOKEN: !!env.TWITTER_ACCESS_TOKEN && env.TWITTER_ACCESS_TOKEN !== "your-token-here",
    TWITTER_ACCESS_SECRET: !!env.TWITTER_ACCESS_SECRET && env.TWITTER_ACCESS_SECRET !== "your-secret-here",
    LINKEDIN_ACCESS_TOKEN: !!env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_ACCESS_TOKEN !== "your-token-here",
    REDDIT_CLIENT_ID: !!env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_ID !== "your-id-here",
    REDDIT_CLIENT_SECRET: !!env.REDDIT_CLIENT_SECRET && env.REDDIT_CLIENT_SECRET !== "your-secret-here",
    REDDIT_USERNAME: !!env.REDDIT_USERNAME && env.REDDIT_USERNAME !== "your-username-here",
    REDDIT_PASSWORD: !!env.REDDIT_PASSWORD && env.REDDIT_PASSWORD !== "your-password-here",
    THREADS_ACCESS_TOKEN: !!env.THREADS_ACCESS_TOKEN && env.THREADS_ACCESS_TOKEN !== "your-token-here",
    THREADS_USER_ID: !!env.THREADS_USER_ID && env.THREADS_USER_ID !== "your-id-here",
    GHL_API_KEY: !!env.GHL_API_KEY && env.GHL_API_KEY !== "your-key-here",
    GHL_LOCATION_ID: !!env.GHL_LOCATION_ID && env.GHL_LOCATION_ID !== "your-id-here",
    GHL_PIPELINE_ID: !!env.GHL_PIPELINE_ID && env.GHL_PIPELINE_ID !== "your-id-here",
  };

  return NextResponse.json({
    configured,
    theme: appSettings.theme,
    timestamp: new Date().toISOString(),
  });
}

// POST - Save API keys and/or theme
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keys, theme } = body;

    // Handle theme update
    if (theme && typeof theme === "string") {
      await saveAppSettings({ theme });
    }

    // Handle API keys update
    if (keys && typeof keys === "object") {
      // Read existing env
      const env = await parseEnvFile();

      // Update with new keys (only non-empty values)
      for (const [key, value] of Object.entries(keys)) {
        if (typeof value === "string" && value.trim()) {
          env[key] = value.trim();
        }
      }

      // Write back to .env
      await writeEnvFile(env);
    }

    return NextResponse.json({
      success: true,
      message: theme ? "Settings saved." : "API keys saved. Restart the server to apply changes.",
    });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
