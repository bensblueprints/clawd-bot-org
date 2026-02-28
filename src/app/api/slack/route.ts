import { NextRequest, NextResponse } from "next/server";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// Forward messages to the terminal API and get responses
async function sendToTerminal(message: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (data.success) {
      return data.response;
    } else {
      return `Error: ${data.error || "Unknown error"}`;
    }
  } catch (error) {
    return `Connection error: ${error instanceof Error ? error.message : "Unknown"}`;
  }
}

// Send message back to Slack
async function replyToSlack(channel: string, text: string, thread_ts?: string) {
  if (!SLACK_BOT_TOKEN) {
    console.error("SLACK_BOT_TOKEN not configured");
    return;
  }

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel,
      text,
      thread_ts, // Reply in thread if provided
    }),
  });
}

// Handle Slack Events API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // URL Verification challenge from Slack
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Event callback
    if (body.type === "event_callback") {
      const event = body.event;

      // Only process messages, ignore bot messages to prevent loops
      if (event.type === "message" && !event.bot_id && !event.subtype) {
        const userMessage = event.text;
        const channel = event.channel;
        const thread_ts = event.thread_ts || event.ts;

        // Get response from terminal agent
        const agentResponse = await sendToTerminal(userMessage);

        // Reply in Slack
        await replyToSlack(channel, agentResponse, thread_ts);
      }

      // App mention - when someone @mentions the bot
      if (event.type === "app_mention") {
        const userMessage = event.text.replace(/<@[^>]+>/g, "").trim(); // Remove @mention
        const channel = event.channel;
        const thread_ts = event.thread_ts || event.ts;

        const agentResponse = await sendToTerminal(userMessage);
        await replyToSlack(channel, agentResponse, thread_ts);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Slack API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Slack slash command handler
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "online",
    integration: "Slack OpenClaw",
    description: "Connects Slack to Mission Control terminal agent",
    required_env: ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "NEXT_PUBLIC_BASE_URL"],
    configured: {
      bot_token: !!SLACK_BOT_TOKEN,
      signing_secret: !!SLACK_SIGNING_SECRET,
    },
  });
}
