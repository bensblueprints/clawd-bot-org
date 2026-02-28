import { NextRequest, NextResponse } from "next/server";

// Verify different API key types
async function verifyApiKey(keyId: string, value: string): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (keyId) {
      case "ANTHROPIC_API_KEY":
        // Test Anthropic API
        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": value,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 10,
            messages: [{ role: "user", content: "Hi" }],
          }),
        });
        if (anthropicRes.ok || anthropicRes.status === 400) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid Anthropic API key" };

      case "OPENAI_API_KEY":
        // Test OpenAI API
        const openaiRes = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${value}` },
        });
        if (openaiRes.ok) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid OpenAI API key" };

      case "OPENROUTER_API_KEY":
        // Test OpenRouter API
        const orRes = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${value}` },
        });
        if (orRes.ok) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid OpenRouter API key" };

      case "SLACK_BOT_TOKEN":
        // Test Slack API
        const slackRes = await fetch("https://slack.com/api/auth.test", {
          headers: { Authorization: `Bearer ${value}` },
        });
        const slackData = await slackRes.json();
        if (slackData.ok) {
          return { valid: true };
        }
        return { valid: false, error: slackData.error || "Invalid Slack token" };

      case "DISCORD_BOT_TOKEN":
        // Test Discord API
        const discordRes = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bot ${value}` },
        });
        if (discordRes.ok) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid Discord bot token" };

      case "CLICKUP_API_KEY":
        // Test ClickUp API
        const clickupRes = await fetch("https://api.clickup.com/api/v2/user", {
          headers: { Authorization: value },
        });
        if (clickupRes.ok) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid ClickUp API key" };

      case "TWITTER_BEARER_TOKEN":
        // Test Twitter API
        const twitterRes = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${value}` },
        });
        if (twitterRes.ok) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid Twitter bearer token" };

      case "GHL_API_KEY":
        // Test GoHighLevel API
        const ghlRes = await fetch("https://rest.gohighlevel.com/v1/users/", {
          headers: { Authorization: `Bearer ${value}` },
        });
        if (ghlRes.ok) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid GHL API key" };

      // For keys that can't be easily verified, just check format
      case "SLACK_SIGNING_SECRET":
        if (value.length >= 20) {
          return { valid: true };
        }
        return { valid: false, error: "Signing secret appears too short" };

      case "TELEGRAM_BOT_TOKEN":
        // Telegram tokens have format: 123456:ABC-DEF...
        if (/^\d+:[A-Za-z0-9_-]+$/.test(value)) {
          const telegramRes = await fetch(`https://api.telegram.org/bot${value}/getMe`);
          const telegramData = await telegramRes.json();
          if (telegramData.ok) {
            return { valid: true };
          }
          return { valid: false, error: "Invalid Telegram bot token" };
        }
        return { valid: false, error: "Invalid token format" };

      case "FB_ACCESS_TOKEN":
        // Test Facebook API
        const fbRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${value}`);
        if (fbRes.ok) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid Facebook access token" };

      case "LINKEDIN_ACCESS_TOKEN":
        // Test LinkedIn API
        const linkedinRes = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${value}` },
        });
        if (linkedinRes.ok || linkedinRes.status === 403) {
          // 403 means token is valid but missing scopes
          return { valid: true };
        }
        return { valid: false, error: "Invalid LinkedIn access token" };

      case "REDDIT_CLIENT_ID":
      case "REDDIT_CLIENT_SECRET":
      case "REDDIT_USERNAME":
      case "REDDIT_PASSWORD":
        // Reddit credentials - just validate they're not empty
        if (value.trim().length > 0) {
          return { valid: true };
        }
        return { valid: false, error: "Field cannot be empty" };

      case "THREADS_ACCESS_TOKEN":
        // Test Threads/Meta API
        const threadsRes = await fetch(`https://graph.threads.net/v1.0/me?access_token=${value}`);
        if (threadsRes.ok) {
          return { valid: true };
        }
        return { valid: false, error: "Invalid Threads access token" };

      case "THREADS_USER_ID":
      case "GHL_LOCATION_ID":
      case "GHL_PIPELINE_ID":
      case "CLICKUP_WORKSPACE_ID":
      case "TWITTER_ACCESS_TOKEN":
      case "TWITTER_ACCESS_SECRET":
      case "MINIMAX_API_KEY":
        // These are validated by format only
        if (value.trim().length >= 5) {
          return { valid: true };
        }
        return { valid: false, error: "Value appears too short" };

      default:
        // For unknown keys, just accept if not empty
        if (value.trim()) {
          return { valid: true };
        }
        return { valid: false, error: "Value cannot be empty" };
    }
  } catch (error) {
    console.error(`Verification error for ${keyId}:`, error);
    // If verification request fails, assume key is valid (network issue)
    return { valid: true };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyId, value } = body;

    if (!keyId || !value) {
      return NextResponse.json(
        { valid: false, error: "Missing keyId or value" },
        { status: 400 }
      );
    }

    const result = await verifyApiKey(keyId, value);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Settings verify API error:", error);
    return NextResponse.json(
      { valid: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
