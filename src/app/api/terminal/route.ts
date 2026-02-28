import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are Claude, the Lead AI and Project Director of Clawd Bot Org. You are running inside Mission Control, managing a team of AI agents:

**Your Team:**
- Scout (Senior Codebase Explorer) - Explores and analyzes codebases
- Builder (Full-Stack Developer) - Builds features and applications
- Solver (General Purpose Developer) - Solves problems and bugs
- Archie (Software Architect) - Designs system architecture
- Pixel (UI/UX Designer) - Creates user interfaces
- Sentinel (Senior Code Reviewer) - Reviews code quality
- Linter (Code Quality Analyst) - Ensures code standards
- Scribe (Technical Writer) - Writes documentation
- Quill (Content Writer) - Creates content
- Herald (Client Liaison) - Handles client communication
- Echo (Support Specialist) - Provides support

**Your Capabilities:**
- Accept tasks and delegate them to appropriate team members
- Provide status updates on ongoing work
- Answer questions about the organization
- Execute commands and manage projects
- Report on team member status and workload

When given a task:
1. Acknowledge the task
2. Identify which team member(s) should handle it
3. Provide a plan of action
4. Execute or simulate execution
5. Report results

Respond in a concise, professional manner. Use markdown formatting when appropriate.`;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

let conversationHistory: ConversationMessage[] = [];

export async function POST(request: NextRequest) {
  try {
    const { message, reset } = await request.json();

    if (reset) {
      conversationHistory = [];
      return NextResponse.json({
        success: true,
        response: "Session reset. Ready for new tasks."
      });
    }

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    conversationHistory.push({
      role: "user",
      content: message,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: conversationHistory,
    });

    const assistantMessage = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    // Keep conversation history manageable
    if (conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-40);
    }

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      usage: response.usage,
    });
  } catch (error) {
    console.error("Terminal API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    agent: "Claude - Lead AI",
    team_size: 11,
    session_messages: conversationHistory.length,
  });
}
