import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env");

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

// GET - Check which keys are configured
export async function GET() {
  const env = await parseEnvFile();

  const configured: Record<string, boolean> = {
    ANTHROPIC_API_KEY: !!env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY !== "your-key-here",
    MINIMAX_API_KEY: !!env.MINIMAX_API_KEY && env.MINIMAX_API_KEY !== "your-key-here",
    OPENROUTER_API_KEY: !!env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY !== "your-key-here",
    OPENAI_API_KEY: !!env.OPENAI_API_KEY && env.OPENAI_API_KEY !== "your-key-here",
    SLACK_BOT_TOKEN: !!env.SLACK_BOT_TOKEN && env.SLACK_BOT_TOKEN !== "your-token-here",
    SLACK_SIGNING_SECRET: !!env.SLACK_SIGNING_SECRET && env.SLACK_SIGNING_SECRET !== "your-secret-here",
    DISCORD_BOT_TOKEN: !!env.DISCORD_BOT_TOKEN && env.DISCORD_BOT_TOKEN !== "your-token-here",
    TELEGRAM_BOT_TOKEN: !!env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_TOKEN !== "your-token-here",
  };

  return NextResponse.json({
    configured,
    timestamp: new Date().toISOString(),
  });
}

// POST - Save API keys
export async function POST(request: NextRequest) {
  try {
    const { keys } = await request.json();

    if (!keys || typeof keys !== "object") {
      return NextResponse.json({ success: false, error: "Invalid keys format" }, { status: 400 });
    }

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

    return NextResponse.json({
      success: true,
      message: "API keys saved. Restart the server to apply changes.",
    });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
