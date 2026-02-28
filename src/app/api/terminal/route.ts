import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CONVERSATION_FILE = path.join(DATA_DIR, "terminal-conversation.json");
const TASKS_FILE = path.join(DATA_DIR, "agent-tasks.json");

const AGENTS = {
  "scout": { name: "Scout", role: "Senior Codebase Explorer", skills: ["codebase analysis", "file exploration", "dependency mapping"] },
  "builder": { name: "Builder", role: "Full-Stack Developer", skills: ["development", "coding", "implementation", "features"] },
  "solver": { name: "Solver", role: "General Purpose Developer", skills: ["debugging", "bug fixes", "problem solving"] },
  "archie": { name: "Archie", role: "Software Architect", skills: ["architecture", "system design", "planning"] },
  "pixel": { name: "Pixel", role: "UI/UX Designer", skills: ["design", "UI", "UX", "frontend", "styling"] },
  "sentinel": { name: "Sentinel", role: "Senior Code Reviewer", skills: ["code review", "quality", "best practices"] },
  "linter": { name: "Linter", role: "Code Quality Analyst", skills: ["linting", "formatting", "standards"] },
  "scribe": { name: "Scribe", role: "Technical Writer", skills: ["documentation", "README", "API docs"] },
  "quill": { name: "Quill", role: "Content Writer", skills: ["content", "SEO", "blog posts", "copywriting"] },
  "herald": { name: "Herald", role: "Client Liaison", skills: ["communication", "reports", "client updates"] },
  "echo": { name: "Echo", role: "Support Specialist", skills: ["support", "help", "troubleshooting"] },
};

const SYSTEM_PROMPT = `You are Claude, the Lead AI and Project Director of Clawd Bot Org. You are running inside Mission Control, managing a team of AI agents.

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

**CRITICAL INSTRUCTIONS FOR TASK ASSIGNMENT:**
When the user asks you to do something that requires work, you MUST assign it to an agent using this EXACT format:

[TASK_ASSIGN]
agent: <agent_name_lowercase>
title: <short task title>
description: <detailed description>
priority: <High|Medium|Low>
[/TASK_ASSIGN]

Example:
User: "Write a blog post about CBD benefits"
Your response should include:
[TASK_ASSIGN]
agent: quill
title: Write CBD benefits blog post
description: Create an SEO-optimized blog post about the health benefits of CBD products
priority: Medium
[/TASK_ASSIGN]

I'm assigning this to Quill, our Content Writer. He'll research and write a compelling blog post about CBD benefits.

You can assign multiple tasks in one response. Always confirm the assignment and explain what the agent will do.

**Your Capabilities:**
- Accept tasks and delegate them to appropriate team members
- Provide status updates on ongoing work
- Answer questions about the organization
- Execute commands and manage projects
- Report on team member status and workload

Respond in a concise, professional manner. Use markdown formatting when appropriate.`;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AgentTask {
  id: string;
  agent: string;
  agentName: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  progress: number;
  logs: { time: string; message: string }[];
}

interface ConversationData {
  messages: ConversationMessage[];
  lastUpdated: string;
}

interface TasksData {
  tasks: AgentTask[];
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
  const data: ConversationData = {
    messages,
    lastUpdated: new Date().toISOString(),
  };
  await fs.writeFile(CONVERSATION_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function loadTasks(): Promise<AgentTask[]> {
  try {
    const raw = await fs.readFile(TASKS_FILE, "utf-8");
    const data: TasksData = JSON.parse(raw);
    return data.tasks || [];
  } catch {
    return [];
  }
}

async function saveTasks(tasks: AgentTask[]): Promise<void> {
  const data: TasksData = {
    tasks,
    lastUpdated: new Date().toISOString(),
  };
  await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function parseTaskAssignments(response: string): Array<{
  agent: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
}> {
  const tasks: Array<{
    agent: string;
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
    const descMatch = block.match(/description:\s*(.+)/i);
    const priorityMatch = block.match(/priority:\s*(High|Medium|Low)/i);

    if (agentMatch && titleMatch) {
      tasks.push({
        agent: agentMatch[1].toLowerCase(),
        title: titleMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : titleMatch[1].trim(),
        priority: (priorityMatch ? priorityMatch[1] : "Medium") as "High" | "Medium" | "Low",
      });
    }
  }

  return tasks;
}

async function createAgentTask(taskData: {
  agent: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
}): Promise<AgentTask | null> {
  const agentInfo = AGENTS[taskData.agent as keyof typeof AGENTS];
  if (!agentInfo) return null;

  const tasks = await loadTasks();

  const newTask: AgentTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agent: taskData.agent,
    agentName: agentInfo.name,
    title: taskData.title,
    description: taskData.description,
    priority: taskData.priority,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 0,
    logs: [{ time: new Date().toISOString(), message: `Task assigned to ${agentInfo.name}` }],
  };

  tasks.push(newTask);
  await saveTasks(tasks);

  // Start simulating task progress
  simulateTaskProgress(newTask.id);

  return newTask;
}

async function simulateTaskProgress(taskId: string): Promise<void> {
  // Simulate task progress over time
  const progressSteps = [10, 25, 45, 65, 85, 100];
  const messages = [
    "Starting task analysis...",
    "Gathering requirements...",
    "Working on implementation...",
    "Testing and refining...",
    "Final review...",
    "Task completed successfully!",
  ];

  for (let i = 0; i < progressSteps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    try {
      const tasks = await loadTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) return;

      tasks[taskIndex].progress = progressSteps[i];
      tasks[taskIndex].status = progressSteps[i] === 100 ? "completed" : "in_progress";
      tasks[taskIndex].updatedAt = new Date().toISOString();
      tasks[taskIndex].logs.push({
        time: new Date().toISOString(),
        message: messages[i],
      });

      await saveTasks(tasks);
    } catch (error) {
      console.error("Error updating task progress:", error);
    }
  }
}

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
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    return response.content[0].type === "text" ? response.content[0].text : null;
  } catch (error) {
    console.error("Anthropic API error:", error);
    return null;
  }
}

// Try OpenAI API
async function tryOpenAI(messages: ConversationMessage[]): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null;
  }
}

// Try MiniMax API (OpenAI-compatible)
async function tryMiniMax(messages: ConversationMessage[]): Promise<string | null> {
  if (!process.env.MINIMAX_API_KEY) return null;

  try {
    const response = await fetch("https://api.minimax.io/v1/chat/completions", {
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

    const data = await response.json();

    if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
      console.error("MiniMax API error:", data.base_resp.status_msg);
      return null;
    }

    if (!response.ok) {
      console.error("MiniMax API error:", data);
      return null;
    }

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

    // Load existing conversation
    const conversationHistory = await loadConversation();

    conversationHistory.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Try providers in order: Anthropic -> OpenAI -> MiniMax -> OpenRouter
    let assistantMessage: string | null = null;
    let provider = "none";

    assistantMessage = await tryAnthropic(conversationHistory);
    if (assistantMessage) {
      provider = "anthropic";
    }

    if (!assistantMessage) {
      assistantMessage = await tryOpenAI(conversationHistory);
      if (assistantMessage) {
        provider = "openai";
      }
    }

    if (!assistantMessage) {
      assistantMessage = await tryMiniMax(conversationHistory);
      if (assistantMessage) {
        provider = "minimax";
      }
    }

    if (!assistantMessage) {
      assistantMessage = await tryOpenRouter(conversationHistory);
      if (assistantMessage) {
        provider = "openrouter";
      }
    }

    if (!assistantMessage) {
      conversationHistory.pop();
      await saveConversation(conversationHistory);

      return NextResponse.json({
        success: false,
        error: "All AI providers failed. Please check your API keys in Settings.",
        availableProviders: {
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          openai: !!process.env.OPENAI_API_KEY,
          minimax: !!process.env.MINIMAX_API_KEY,
          openrouter: !!process.env.OPENROUTER_API_KEY,
        }
      }, { status: 500 });
    }

    // Parse and create tasks from the response
    const taskAssignments = parseTaskAssignments(assistantMessage);
    const createdTasks: AgentTask[] = [];

    for (const taskData of taskAssignments) {
      const task = await createAgentTask(taskData);
      if (task) {
        createdTasks.push(task);
      }
    }

    // Remove task assignment blocks from visible response
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
      tasksCreated: createdTasks.map(t => ({
        id: t.id,
        agent: t.agentName,
        title: t.title,
        priority: t.priority,
      })),
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

  // Get active tasks per agent
  const activeTasks: Record<string, AgentTask[]> = {};
  for (const task of tasks.filter(t => t.status !== "completed")) {
    if (!activeTasks[task.agent]) {
      activeTasks[task.agent] = [];
    }
    activeTasks[task.agent].push(task);
  }

  return NextResponse.json({
    status: "online",
    agent: "Claude - Lead AI",
    team_size: 11,
    session_messages: conversationHistory.length,
    conversation: conversationHistory,
    activeTasks,
    providers: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      minimax: !!process.env.MINIMAX_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
    }
  });
}
