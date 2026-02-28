import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { createAgentTask, loadTasks, saveTasks, loadMessages, AGENTS, AgentId, getAIProviderStatus } from "@/lib/agents/engine";

// Helper to check if a key is valid (not a placeholder)
function isValidApiKey(key: string | undefined, prefix: string): boolean {
  if (!key) return false;
  if (!key.startsWith(prefix)) return false;
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("your-key") || lowerKey.includes("your_key")) return false;
  if (lowerKey.includes("placeholder") || lowerKey.includes("example")) return false;
  if (lowerKey.includes("xxx") || lowerKey.includes("test")) return false;
  if (key.length < 40) return false; // Real API keys are typically 40+ characters
  return true;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const CONVERSATION_FILE = path.join(DATA_DIR, "terminal-conversation.json");

const SYSTEM_PROMPT = `You are Claude, the Lead AI and Project Director of Clawd Bot Org. You are running inside Mission Control, managing a team of AI agents.

**Your Team:**
- 🔍 Scout (Senior Codebase Explorer) - Explores and analyzes codebases
- 🔧 Builder (Full-Stack Developer) - Builds features and applications
- 💡 Solver (General Purpose Developer) - Solves problems and bugs
- 🏗️ Archie (Software Architect) - Designs system architecture
- 🎨 Pixel (UI/UX Designer) - Creates user interfaces
- 🛡️ Sentinel (Senior Code Reviewer) - Reviews code quality
- 📐 Linter (Code Quality Analyst) - Ensures code standards
- 📝 Scribe (Technical Writer) - Writes documentation
- ✍️ Quill (Content Writer) - Creates content
- 📣 Herald (Client Liaison) - Handles client communication
- 🎧 Echo (Support Specialist) - Provides support

**CRITICAL INSTRUCTIONS FOR TASK ASSIGNMENT:**
When the user asks you to do something that requires work, you MUST assign it to an agent using this EXACT format:

[TASK_ASSIGN]
agent: <agent_name_lowercase>
title: <short task title>
description: <detailed description of what needs to be done>
priority: <High|Medium|Low>
[/TASK_ASSIGN]

Example:
User: "Write a blog post about CBD benefits"
Your response should include:
[TASK_ASSIGN]
agent: quill
title: Write CBD benefits blog post
description: Create an SEO-optimized blog post about the health benefits of CBD products. Include sections on pain relief, anxiety reduction, sleep improvement, and proper usage guidelines. Aim for 1500+ words with engaging headlines.
priority: Medium
[/TASK_ASSIGN]

I'm assigning this to Quill, our Content Writer. He'll research and write a compelling blog post about CBD benefits.

You can assign multiple tasks in one response. Always confirm the assignment and explain what the agent will do.

**AGENT COLLABORATION:**
Agents can talk to each other and delegate subtasks. For example:
- Scout might find code issues and tell Builder to fix them
- Builder might ask Pixel to design a component
- Sentinel reviews Builder's code and reports back

You'll see their conversations in real-time. Acknowledge when agents complete work and suggest next steps.

**Your Capabilities:**
- Accept tasks and delegate them to appropriate team members
- See real-time agent conversations and task updates
- Provide status updates on ongoing work
- Answer questions about the organization
- Execute commands and manage projects
- Report on team member status and workload

Respond in a concise, professional manner. Use markdown formatting when appropriate.`;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isSystemNotification?: boolean;
}

interface ConversationData {
  messages: ConversationMessage[];
  lastUpdated: string;
}

async function loadConversation(): Promise<ConversationMessage[]> {
  try {
    const raw = await fs.readFile(CONVERSATION_FILE, "utf-8");
    const data: ConversationData = JSON.parse(raw);
    return data.messages || [];
  } catch {
    return [];
  }
}

async function saveConversation(messages: ConversationMessage[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const data: ConversationData = {
    messages,
    lastUpdated: new Date().toISOString(),
  };
  await fs.writeFile(CONVERSATION_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function parseTaskAssignments(response: string): Array<{
  agent: AgentId;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
}> {
  const tasks: Array<{
    agent: AgentId;
    title: string;
    description: string;
    priority: "High" | "Medium" | "Low";
  }> = [];

  const taskRegex = /\[TASK_ASSIGN\]([\s\S]*?)\[\/TASK_ASSIGN\]/g;
  let match;

  while ((match = taskRegex.exec(response)) !== null) {
    const block = match[1];
    const agentMatch = block.match(/agent:\s*(\w+)/i);
    const titleMatch = block.match(/title:\s*(.+)/i);
    const descMatch = block.match(/description:\s*([\s\S]*?)(?=priority:|$)/i);
    const priorityMatch = block.match(/priority:\s*(High|Medium|Low)/i);

    if (agentMatch && titleMatch) {
      const agentName = agentMatch[1].toLowerCase() as AgentId;
      if (agentName in AGENTS) {
        tasks.push({
          agent: agentName,
          title: titleMatch[1].trim(),
          description: descMatch ? descMatch[1].trim() : titleMatch[1].trim(),
          priority: (priorityMatch ? priorityMatch[1] : "Medium") as "High" | "Medium" | "Low",
        });
      }
    }
  }

  return tasks;
}

// Check for completed tasks that haven't been notified
async function getCompletedUnnotifiedTasks() {
  const tasks = await loadTasks();
  return tasks.filter(t => t.status === "completed" && !t.notified);
}

// Mark tasks as notified
async function markTasksNotified(taskIds: string[]): Promise<void> {
  const tasks = await loadTasks();
  for (const task of tasks) {
    if (taskIds.includes(task.id)) {
      task.notified = true;
    }
  }
  await saveTasks(tasks);
}

// Generate follow-up suggestions using AI
async function generateFollowUp(completedTasks: Array<{ agentName: string; title: string; result?: string }>, conversationHistory: ConversationMessage[]): Promise<string | null> {
  const taskSummary = completedTasks.map(t =>
    `- ${t.agentName} completed: "${t.title}" - Result: ${t.result || "Task finished"}`
  ).join("\n");

  const followUpPrompt = `The following tasks have been completed by your team:

${taskSummary}

Please acknowledge the completion and suggest 2-3 specific next steps the user could take to build on this work. Be concise and actionable.`;

  const messagesForAI = [
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: followUpPrompt }
  ];

  let response: string | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const result = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messagesForAI,
      });
      response = result.content[0].type === "text" ? result.content[0].text : null;
    } catch (e) {
      console.error("Anthropic error for follow-up:", e);
    }
  }

  if (!response && process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messagesForAI
          ],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      response = data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error("OpenAI error for follow-up:", e);
    }
  }

  return response;
}

// Try AI providers
async function tryAI(messages: ConversationMessage[]): Promise<{ response: string | null; provider: string }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  // Try Anthropic first
  if (isValidApiKey(anthropicKey, "sk-ant-")) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });
      const text = response.content[0].type === "text" ? response.content[0].text : null;
      if (text) return { response: text, provider: "anthropic" };
    } catch (error) {
      console.error("Anthropic API error:", error);
    }
  }

  // Try OpenAI
  if (isValidApiKey(openaiKey, "sk-")) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map(m => ({ role: m.role, content: m.content }))
          ],
          max_tokens: 4096,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return { response: text, provider: "openai" };
      }
    } catch (error) {
      console.error("OpenAI API error:", error);
    }
  }

  // Try MiniMax
  if (minimaxKey && minimaxKey.length > 20 && !minimaxKey.includes("your")) {
    try {
      const response = await fetch("https://api.minimax.io/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${minimaxKey}`,
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

      const data = await response.json();
      if (response.ok && !data.base_resp?.status_code) {
        const text = data.choices?.[0]?.message?.content;
        if (text) return { response: text, provider: "minimax" };
      }
    } catch (error) {
      console.error("MiniMax API error:", error);
    }
  }

  // Try OpenRouter
  if (openrouterKey && openrouterKey.length > 20 && !openrouterKey.includes("your")) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openrouterKey}`,
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

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return { response: text, provider: "openrouter" };
      }
    } catch (error) {
      console.error("OpenRouter API error:", error);
    }
  }

  return { response: null, provider: "none" };
}

export async function POST(request: NextRequest) {
  try {
    const { message, reset, checkCompletions } = await request.json();

    // Check for completed tasks and generate follow-up
    if (checkCompletions) {
      const completedTasks = await getCompletedUnnotifiedTasks();

      if (completedTasks.length === 0) {
        return NextResponse.json({ hasCompletions: false });
      }

      const conversationHistory = await loadConversation();
      const followUp = await generateFollowUp(completedTasks, conversationHistory);

      if (followUp) {
        const notificationMessage = completedTasks.map(t =>
          `**${t.agentName}** completed: "${t.title}"\n> ${t.result || "Task finished"}`
        ).join("\n\n");

        conversationHistory.push({
          role: "assistant",
          content: `## Task Completion Report\n\n${notificationMessage}\n\n---\n\n${followUp}`,
          timestamp: new Date().toISOString(),
          isSystemNotification: true,
        });

        await saveConversation(conversationHistory);
        await markTasksNotified(completedTasks.map(t => t.id));

        return NextResponse.json({
          hasCompletions: true,
          completedTasks: completedTasks.map(t => ({
            id: t.id,
            agent: t.agentName,
            title: t.title,
            result: t.result,
          })),
          followUp,
          fullMessage: `## Task Completion Report\n\n${notificationMessage}\n\n---\n\n${followUp}`,
        });
      }

      return NextResponse.json({ hasCompletions: false });
    }

    if (reset) {
      await saveConversation([]);
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

    const conversationHistory = await loadConversation();

    conversationHistory.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Get AI response
    const { response: assistantMessage, provider } = await tryAI(conversationHistory);

    if (!assistantMessage) {
      conversationHistory.pop();
      await saveConversation(conversationHistory);

      const aiStatus = getAIProviderStatus();
      return NextResponse.json({
        success: false,
        error: aiStatus.available
          ? "All AI providers failed. Check API key validity."
          : "No AI provider configured. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY in Settings.",
        aiStatus,
        availableProviders: {
          anthropic: isValidApiKey(process.env.ANTHROPIC_API_KEY, "sk-ant-"),
          openai: isValidApiKey(process.env.OPENAI_API_KEY, "sk-"),
          minimax: !!(process.env.MINIMAX_API_KEY && process.env.MINIMAX_API_KEY.length > 20),
          openrouter: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 20),
        }
      }, { status: 500 });
    }

    // Parse and create tasks using the new engine
    const taskAssignments = parseTaskAssignments(assistantMessage);
    const createdTasks: Array<{ id: string; agent: string; title: string; priority: string }> = [];

    for (const taskData of taskAssignments) {
      const task = await createAgentTask(taskData);
      if (task) {
        createdTasks.push({
          id: task.id,
          agent: task.agentName,
          title: task.title,
          priority: task.priority,
        });
      }
    }

    // Clean response (remove task assignment blocks)
    const cleanResponse = assistantMessage.replace(/\[TASK_ASSIGN\][\s\S]*?\[\/TASK_ASSIGN\]/g, '').trim();

    conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
      timestamp: new Date().toISOString(),
    });

    // Keep conversation history manageable
    if (conversationHistory.length > 100) {
      conversationHistory.splice(0, conversationHistory.length - 80);
    }

    await saveConversation(conversationHistory);

    return NextResponse.json({
      success: true,
      response: cleanResponse,
      provider,
      tasksCreated: createdTasks,
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
  const conversationHistory = await loadConversation();
  const tasks = await loadTasks();
  const messages = await loadMessages();

  const activeTasks: Record<string, typeof tasks> = {};
  for (const task of tasks.filter(t => t.status !== "completed")) {
    if (!activeTasks[task.agent]) {
      activeTasks[task.agent] = [];
    }
    activeTasks[task.agent].push(task);
  }

  const pendingNotifications = tasks.filter(t => t.status === "completed" && !t.notified);

  return NextResponse.json({
    status: "online",
    agent: "Claude - Lead AI",
    team_size: Object.keys(AGENTS).length,
    session_messages: conversationHistory.length,
    conversation: conversationHistory,
    activeTasks,
    pendingNotifications: pendingNotifications.length,
    recentAgentMessages: messages.slice(-50),
providers: {
      anthropic: isValidApiKey(process.env.ANTHROPIC_API_KEY, "sk-ant-"),
      openai: isValidApiKey(process.env.OPENAI_API_KEY, "sk-"),
      minimax: !!(process.env.MINIMAX_API_KEY && process.env.MINIMAX_API_KEY.length > 20 && !process.env.MINIMAX_API_KEY.includes("your")),
      openrouter: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 20 && !process.env.OPENROUTER_API_KEY.includes("your")),
    },
    aiStatus: getAIProviderStatus()
  });
}
