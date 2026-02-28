import { NextRequest, NextResponse } from "next/server";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Forward messages to the terminal API
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

// Send delayed response to Slack
async function sendDelayedResponse(responseUrl: string, text: string) {
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      response_type: "in_channel",
      text,
    }),
  });
}

// Handle Slack slash commands (e.g., /clawd, /openclaw)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const command = formData.get("command") as string;
    const text = formData.get("text") as string;
    const responseUrl = formData.get("response_url") as string;
    const userId = formData.get("user_id") as string;
    const userName = formData.get("user_name") as string;

    // Acknowledge immediately (Slack requires response within 3 seconds)
    // Then send the actual response via response_url

    // Process in background
    (async () => {
      const agentResponse = await sendToTerminal(text || "status");

      // Format response with user context
      const formattedResponse = `*${userName}* ran \`${command} ${text}\`\n\n${agentResponse}`;

      await sendDelayedResponse(responseUrl, formattedResponse);
    })();

    // Immediate acknowledgment
    return new NextResponse(
      JSON.stringify({
        response_type: "ephemeral",
        text: `Processing: "${text}"...`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Slack command error:", error);
    return new NextResponse(
      JSON.stringify({
        response_type: "ephemeral",
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
