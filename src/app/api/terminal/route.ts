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

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

let conversationHistory: ConversationMessage[] = [];

// Try Anthropic API
async function tryAnthropic(messages: ConversationMessage[]): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    return response.content[0].type === "text" ? response.content[0].text : null;
  } catch (error) {
    console.error("Anthropic API error:", error);
    return null;
  }
}

// Try MiniMax API (OpenAI-compatible)
async function tryMiniMax(messages: ConversationMessage[]): Promise<string | null> {
  if (!process.env.MINIMAX_API_KEY) return null;

  try {
    const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: "MiniMax-Text-01",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      console.error("MiniMax API error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("MiniMax API error:", error);
    return null;
  }
}

// Try OpenRouter API as another fallback
async function tryOpenRouter(messages: ConversationMessage[]): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://mission.clawdbot.army",
        "X-Title": "Mission Control",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter API error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("OpenRouter API error:", error);
    return null;
  }
}

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

    conversationHistory.push({
      role: "user",
      content: message,
    });

    // Try providers in order: MiniMax -> Anthropic -> OpenRouter
    let assistantMessage: string | null = null;
    let provider = "none";

    // Try MiniMax first (primary)
    assistantMessage = await tryMiniMax(conversationHistory);
    if (assistantMessage) {
      provider = "minimax";
    }

    // Fallback to Anthropic
    if (!assistantMessage) {
      assistantMessage = await tryAnthropic(conversationHistory);
      if (assistantMessage) {
        provider = "anthropic";
      }
    }

    // Fallback to OpenRouter
    if (!assistantMessage) {
      assistantMessage = await tryOpenRouter(conversationHistory);
      if (assistantMessage) {
        provider = "openrouter";
      }
    }

    // If all providers failed
    if (!assistantMessage) {
      // Remove the user message since we couldn't process it
      conversationHistory.pop();

      return NextResponse.json({
        success: false,
        error: "No AI provider configured. Please set ANTHROPIC_API_KEY, MINIMAX_API_KEY, or OPENROUTER_API_KEY.",
        availableProviders: {
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          minimax: !!process.env.MINIMAX_API_KEY,
          openrouter: !!process.env.OPENROUTER_API_KEY,
        }
      }, { status: 500 });
    }

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
      provider,
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
    providers: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      minimax: !!process.env.MINIMAX_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
    }
  });
}
