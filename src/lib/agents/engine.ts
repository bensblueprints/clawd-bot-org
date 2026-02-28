import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const TASKS_FILE = path.join(DATA_DIR, "agent-tasks.json");
const MESSAGES_FILE = path.join(DATA_DIR, "agent-messages.json");

// Agent definitions with unique personalities and capabilities
export const AGENTS = {
  claude: {
    name: "Claude",
    role: "Lead AI & Project Director",
    emoji: "🧠",
    skills: ["orchestration", "planning", "delegation", "oversight"],
    personality: "Strategic and clear-minded. You coordinate the team, break down complex tasks, and ensure quality delivery.",
    canDelegateTo: ["scout", "builder", "solver", "archie", "pixel", "sentinel", "quill", "herald"],
  },
  scout: {
    name: "Scout",
    role: "Senior Codebase Explorer",
    emoji: "🔍",
    skills: ["codebase analysis", "file exploration", "dependency mapping", "research"],
    personality: "Thorough and analytical. You dig deep into codebases, find patterns, and report your findings clearly.",
    canDelegateTo: ["builder", "archie"],
  },
  builder: {
    name: "Builder",
    role: "Full-Stack Developer",
    emoji: "🔧",
    skills: ["development", "coding", "implementation", "features", "APIs"],
    personality: "Pragmatic and efficient. You write clean, working code and focus on getting things done right.",
    canDelegateTo: ["pixel", "sentinel"],
  },
  solver: {
    name: "Solver",
    role: "General Purpose Developer",
    emoji: "💡",
    skills: ["debugging", "bug fixes", "problem solving", "optimization"],
    personality: "Creative problem-solver. You enjoy tackling tricky bugs and finding elegant solutions.",
    canDelegateTo: ["sentinel"],
  },
  archie: {
    name: "Archie",
    role: "Software Architect",
    emoji: "🏗️",
    skills: ["architecture", "system design", "planning", "scalability"],
    personality: "Big-picture thinker. You design robust systems and guide technical decisions.",
    canDelegateTo: ["builder", "scout"],
  },
  pixel: {
    name: "Pixel",
    role: "UI/UX Designer",
    emoji: "🎨",
    skills: ["design", "UI", "UX", "frontend", "styling", "components"],
    personality: "Creative and detail-oriented. You create beautiful, intuitive interfaces.",
    canDelegateTo: ["herald"],
  },
  sentinel: {
    name: "Sentinel",
    role: "Senior Code Reviewer",
    emoji: "🛡️",
    skills: ["code review", "quality", "best practices", "security"],
    personality: "Meticulous and thorough. You catch issues early and maintain high code quality standards.",
    canDelegateTo: ["herald"],
  },
  linter: {
    name: "Linter",
    role: "Code Quality Analyst",
    emoji: "📐",
    skills: ["linting", "formatting", "standards", "consistency"],
    personality: "Precise and consistent. You ensure code follows standards and best practices.",
    canDelegateTo: [],
  },
  scribe: {
    name: "Scribe",
    role: "Technical Writer",
    emoji: "📝",
    skills: ["documentation", "README", "API docs", "guides"],
    personality: "Clear and organized. You write documentation that developers actually want to read.",
    canDelegateTo: [],
  },
  quill: {
    name: "Quill",
    role: "Content Writer",
    emoji: "✍️",
    skills: ["content", "SEO", "blog posts", "copywriting", "marketing"],
    personality: "Creative wordsmith. You craft compelling content that engages and converts.",
    canDelegateTo: ["herald"],
  },
  herald: {
    name: "Herald",
    role: "Client Liaison",
    emoji: "📣",
    skills: ["communication", "reports", "client updates", "presentations"],
    personality: "Professional and personable. You keep clients informed and handle communications gracefully.",
    canDelegateTo: [],
  },
  echo: {
    name: "Echo",
    role: "Support Specialist",
    emoji: "🎧",
    skills: ["support", "help", "troubleshooting", "user assistance"],
    personality: "Patient and helpful. You assist users with clear, friendly guidance.",
    canDelegateTo: [],
  },
};

export type AgentId = keyof typeof AGENTS;

export interface AgentMessage {
  id: string;
  timestamp: string;
  from: AgentId;
  to: AgentId | "user" | "broadcast";
  content: string;
  type: "chat" | "task" | "result" | "delegation" | "question" | "update";
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  agent: AgentId;
  agentName: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "pending" | "in_progress" | "completed" | "failed" | "delegated";
  createdAt: string;
  updatedAt: string;
  progress: number;
  logs: { time: string; message: string }[];
  notified?: boolean;
  result?: string;
  parentTaskId?: string;
  childTaskIds?: string[];
  delegatedFrom?: AgentId;
  conversationHistory?: AgentMessage[];
}

interface TasksData {
  tasks: AgentTask[];
  lastUpdated: string;
}

interface MessagesData {
  messages: AgentMessage[];
  lastUpdated: string;
}

// Event emitter for real-time updates
type EventCallback = (event: AgentMessage | { type: "taskUpdate"; task: AgentTask }) => void;
const eventListeners: EventCallback[] = [];

export function subscribeToAgentEvents(callback: EventCallback): () => void {
  eventListeners.push(callback);
  return () => {
    const index = eventListeners.indexOf(callback);
    if (index > -1) eventListeners.splice(index, 1);
  };
}

function emitEvent(event: AgentMessage | { type: "taskUpdate"; task: AgentTask }) {
  eventListeners.forEach(cb => cb(event));
}

// File operations
export async function loadTasks(): Promise<AgentTask[]> {
  try {
    const raw = await fs.readFile(TASKS_FILE, "utf-8");
    const data: TasksData = JSON.parse(raw);
    return data.tasks || [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: AgentTask[]): Promise<void> {
  const data: TasksData = {
    tasks,
    lastUpdated: new Date().toISOString(),
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function loadMessages(): Promise<AgentMessage[]> {
  try {
    const raw = await fs.readFile(MESSAGES_FILE, "utf-8");
    const data: MessagesData = JSON.parse(raw);
    return data.messages || [];
  } catch {
    return [];
  }
}

export async function saveMessages(messages: AgentMessage[]): Promise<void> {
  const data: MessagesData = {
    messages,
    lastUpdated: new Date().toISOString(),
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function addMessage(message: Omit<AgentMessage, "id" | "timestamp">): Promise<AgentMessage> {
  const fullMessage: AgentMessage = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  const messages = await loadMessages();
  messages.push(fullMessage);

  // Keep last 500 messages
  if (messages.length > 500) {
    messages.splice(0, messages.length - 500);
  }

  await saveMessages(messages);
  emitEvent(fullMessage);

  return fullMessage;
}

// Generate system prompt for an agent
function getAgentSystemPrompt(agentId: AgentId, task: AgentTask): string {
  const agent = AGENTS[agentId];
  const teamInfo = Object.entries(AGENTS)
    .filter(([id]) => id !== agentId)
    .map(([id, a]) => `- ${a.emoji} ${a.name} (${a.role}): ${a.skills.join(", ")}`)
    .join("\n");

  return `You are ${agent.emoji} ${agent.name}, the ${agent.role} at Clawd Bot Org.

**Your Personality:** ${agent.personality}

**Your Skills:** ${agent.skills.join(", ")}

**Your Team:**
${teamInfo}

**Current Task:**
Title: ${task.title}
Description: ${task.description}
Priority: ${task.priority}

**Communication Protocol:**
When you need to communicate with another agent, use this format:
[TO:agent_name] Your message here [/TO]

When you want to delegate a subtask to another agent:
[DELEGATE:agent_name]
title: Task title
description: Task description
[/DELEGATE]

When you have completed your work:
[COMPLETED]
Your result summary here
[/COMPLETED]

When you need to ask a question to the user:
[QUESTION]
Your question here
[/QUESTION]

When providing a progress update:
[PROGRESS:percentage]
Status update message
[/PROGRESS]

Execute the task thoroughly. Respond in character as ${agent.name}. Be concise but complete.`;
}

// Parse agent communication from response
interface ParsedCommunication {
  messages: Array<{ to: AgentId; content: string }>;
  delegations: Array<{ to: AgentId; title: string; description: string }>;
  completed?: string;
  question?: string;
  progress?: { percentage: number; message: string };
  remainingContent: string;
}

function parseAgentResponse(response: string): ParsedCommunication {
  const result: ParsedCommunication = {
    messages: [],
    delegations: [],
    remainingContent: response,
  };

  // Parse [TO:agent] messages
  const toRegex = /\[TO:(\w+)\]([\s\S]*?)\[\/TO\]/gi;
  let match;
  while ((match = toRegex.exec(response)) !== null) {
    const agentName = match[1].toLowerCase();
    if (agentName in AGENTS) {
      result.messages.push({
        to: agentName as AgentId,
        content: match[2].trim(),
      });
    }
  }
  result.remainingContent = result.remainingContent.replace(toRegex, "");

  // Parse [DELEGATE:agent] blocks
  const delegateRegex = /\[DELEGATE:(\w+)\]([\s\S]*?)\[\/DELEGATE\]/gi;
  while ((match = delegateRegex.exec(response)) !== null) {
    const agentName = match[1].toLowerCase();
    const block = match[2];
    const titleMatch = block.match(/title:\s*(.+)/i);
    const descMatch = block.match(/description:\s*([\s\S]+)/i);

    if (agentName in AGENTS && titleMatch) {
      result.delegations.push({
        to: agentName as AgentId,
        title: titleMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : titleMatch[1].trim(),
      });
    }
  }
  result.remainingContent = result.remainingContent.replace(delegateRegex, "");

  // Parse [COMPLETED] block - support both [COMPLETED]...[/COMPLETED] and standalone [COMPLETED]\n...
  const completedMatch = response.match(/\[COMPLETED\]([\s\S]*?)\[\/COMPLETED\]/i);
  if (completedMatch) {
    result.completed = completedMatch[1].trim();
    result.remainingContent = result.remainingContent.replace(completedMatch[0], "");
  } else {
    // Also check for standalone [COMPLETED] followed by text on same/next line
    const standaloneMatch = response.match(/\[COMPLETED\]\s*\n?([\s\S]*?)(?=\n\n|\[|$)/i);
    if (standaloneMatch) {
      result.completed = standaloneMatch[1].trim() || "Task completed";
      result.remainingContent = result.remainingContent.replace(standaloneMatch[0], "");
    }
  }

  // Parse [QUESTION] block
  const questionMatch = response.match(/\[QUESTION\]([\s\S]*?)\[\/QUESTION\]/i);
  if (questionMatch) {
    result.question = questionMatch[1].trim();
    result.remainingContent = result.remainingContent.replace(questionMatch[0], "");
  }

  // Parse [PROGRESS:n] block
  const progressMatch = response.match(/\[PROGRESS:(\d+)\]([\s\S]*?)\[\/PROGRESS\]/i);
  if (progressMatch) {
    result.progress = {
      percentage: parseInt(progressMatch[1]),
      message: progressMatch[2].trim(),
    };
    result.remainingContent = result.remainingContent.replace(progressMatch[0], "");
  }

  result.remainingContent = result.remainingContent.trim();
  return result;
}

// Execute a task with a real AI agent
export async function executeAgentTask(taskId: string): Promise<void> {
  const tasks = await loadTasks();
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;

  // Don't re-execute completed or failed tasks
  if (tasks[taskIndex].status === "completed" || tasks[taskIndex].status === "failed") {
    return;
  }

  const task = tasks[taskIndex];
  const agentId = task.agent as AgentId;
  const agent = AGENTS[agentId];

  if (!agent) {
    task.status = "failed";
    task.logs.push({ time: new Date().toISOString(), message: `Unknown agent: ${task.agent}` });
    await saveTasks(tasks);
    return;
  }

  // Mark task as in progress
  task.status = "in_progress";
  task.progress = 10;
  task.logs.push({ time: new Date().toISOString(), message: `${agent.name} is starting work...` });
  await saveTasks(tasks);
  emitEvent({ type: "taskUpdate", task });

  // Send initial message
  await addMessage({
    from: agentId,
    to: "broadcast",
    content: `Starting work on: ${task.title}`,
    type: "update",
    taskId: task.id,
  });

  try {
    // Build conversation history for the agent
    const conversationHistory = task.conversationHistory || [];
    const messagesForAI = conversationHistory.map(m => ({
      role: m.from === agentId ? "assistant" as const : "user" as const,
      content: `[${AGENTS[m.from]?.name || m.from}]: ${m.content}`,
    }));

    // Add the task description as the initial user message if no history
    if (messagesForAI.length === 0) {
      messagesForAI.push({
        role: "user" as const,
        content: `Please complete this task: ${task.title}\n\nDetails: ${task.description}`,
      });
    }

    // Get AI response
    const response = await callAI(getAgentSystemPrompt(agentId, task), messagesForAI);

    if (!response) {
      throw new Error("No response from AI");
    }

    // Parse the response
    const parsed = parseAgentResponse(response);

    // Update progress
    task.progress = 50;
    task.logs.push({ time: new Date().toISOString(), message: "Processing response..." });

    // Handle inter-agent messages
    for (const msg of parsed.messages) {
      await addMessage({
        from: agentId,
        to: msg.to,
        content: msg.content,
        type: "chat",
        taskId: task.id,
      });

      // Log the communication
      task.logs.push({
        time: new Date().toISOString(),
        message: `Sent message to ${AGENTS[msg.to].name}: ${msg.content.substring(0, 50)}...`,
      });
    }

    // Handle delegations
    for (const delegation of parsed.delegations) {
      const newTask = await createAgentTask({
        agent: delegation.to,
        title: delegation.title,
        description: delegation.description,
        priority: task.priority,
        parentTaskId: task.id,
        delegatedFrom: agentId,
      });

      if (newTask) {
        task.childTaskIds = task.childTaskIds || [];
        task.childTaskIds.push(newTask.id);

        await addMessage({
          from: agentId,
          to: delegation.to,
          content: `I'm delegating this task to you: ${delegation.title}`,
          type: "delegation",
          taskId: newTask.id,
        });

        task.logs.push({
          time: new Date().toISOString(),
          message: `Delegated subtask to ${AGENTS[delegation.to].name}: ${delegation.title}`,
        });

        // Start the delegated task
        executeAgentTask(newTask.id);
      }
    }

    // Handle progress updates
    if (parsed.progress) {
      task.progress = parsed.progress.percentage;
      task.logs.push({
        time: new Date().toISOString(),
        message: parsed.progress.message,
      });
    }

    // Handle completion
    if (parsed.completed) {
      task.status = "completed";
      task.progress = 100;
      task.result = parsed.completed;
      task.logs.push({
        time: new Date().toISOString(),
        message: "Task completed successfully!",
      });

      await addMessage({
        from: agentId,
        to: "broadcast",
        content: `Completed: ${task.title}\n\nResult: ${parsed.completed}`,
        type: "result",
        taskId: task.id,
      });

      // Notify parent task if this was a delegation
      if (task.delegatedFrom && task.parentTaskId) {
        await addMessage({
          from: agentId,
          to: task.delegatedFrom,
          content: `I've completed the subtask "${task.title}". Result: ${parsed.completed}`,
          type: "result",
          taskId: task.parentTaskId,
        });
      }
    } else if (parsed.question) {
      // Agent is asking a question - pause for user input
      task.logs.push({
        time: new Date().toISOString(),
        message: `Waiting for user response: ${parsed.question}`,
      });

      await addMessage({
        from: agentId,
        to: "user",
        content: parsed.question,
        type: "question",
        taskId: task.id,
      });
    } else if (parsed.delegations.length > 0) {
      // Task is waiting for delegated tasks
      task.status = "in_progress";
      task.progress = 60;
      task.logs.push({
        time: new Date().toISOString(),
        message: `Waiting for ${parsed.delegations.length} subtask(s) to complete...`,
      });
    } else {
      // Continue working - agent didn't finish yet
      task.progress = Math.min(task.progress + 20, 90);

      // Add response to conversation history for continuation
      task.conversationHistory = task.conversationHistory || [];
      task.conversationHistory.push({
        id: `conv-${Date.now()}`,
        timestamp: new Date().toISOString(),
        from: agentId,
        to: "user",
        content: parsed.remainingContent,
        type: "chat",
        taskId: task.id,
      });

      task.logs.push({
        time: new Date().toISOString(),
        message: parsed.remainingContent.substring(0, 100) + (parsed.remainingContent.length > 100 ? "..." : ""),
      });

      // Continue execution after a short delay
      setTimeout(() => executeAgentTask(taskId), 2000);
    }

    await saveTasks(tasks);
    emitEvent({ type: "taskUpdate", task });

  } catch (error) {
    task.status = "failed";
    task.logs.push({
      time: new Date().toISOString(),
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    await saveTasks(tasks);
    emitEvent({ type: "taskUpdate", task });

    await addMessage({
      from: agentId,
      to: "broadcast",
      content: `Failed to complete: ${task.title}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "update",
      taskId: task.id,
    });
  }
}

// Create a new agent task
export async function createAgentTask(taskData: {
  agent: AgentId;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  parentTaskId?: string;
  delegatedFrom?: AgentId;
}): Promise<AgentTask | null> {
  const agentInfo = AGENTS[taskData.agent];
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
    notified: false,
    parentTaskId: taskData.parentTaskId,
    delegatedFrom: taskData.delegatedFrom,
  };

  tasks.push(newTask);
  await saveTasks(tasks);
  emitEvent({ type: "taskUpdate", task: newTask });

  // Start executing the task
  executeAgentTask(newTask.id);

  return newTask;
}

// Helper to check if a key is valid (not a placeholder)
function isValidApiKey(key: string | undefined, prefix: string): boolean {
  if (!key) return false;
  if (!key.startsWith(prefix)) return false;
  // Reject common placeholder patterns
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("your-key") || lowerKey.includes("your_key")) return false;
  if (lowerKey.includes("placeholder") || lowerKey.includes("example")) return false;
  if (lowerKey.includes("xxx") || lowerKey.includes("test")) return false;
  if (key.length < 40) return false; // Real API keys are typically 40+ characters
  return true;
}

// Check if AI provider is available
export function getAIProviderStatus(): { available: boolean; provider: string; message: string } {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (isValidApiKey(anthropicKey, "sk-ant-")) {
    return { available: true, provider: "Anthropic Claude", message: "Ready" };
  }
  if (isValidApiKey(openaiKey, "sk-")) {
    return { available: true, provider: "OpenAI GPT-4", message: "Ready" };
  }
  if (openrouterKey && openrouterKey.length > 20 && !openrouterKey.includes("your")) {
    return { available: true, provider: "OpenRouter", message: "Ready" };
  }

  return {
    available: false,
    provider: "None",
    message: "No AI API key configured. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY in Settings.",
  };
}

// Call AI provider
async function callAI(systemPrompt: string, messages: Array<{ role: "user" | "assistant"; content: string }>): Promise<string | null> {
  const status = getAIProviderStatus();
  if (!status.available) {
    console.error("No AI provider available:", status.message);
    throw new Error(status.message);
  }

  // Try Anthropic first
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (isValidApiKey(anthropicKey, "sk-ant-")) {
    try {
      console.log("Calling Anthropic API...");
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      });
      console.log("Anthropic API response received");
      return response.content[0].type === "text" ? response.content[0].text : null;
    } catch (error) {
      console.error("Anthropic API error:", error);
    }
  }

  // Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (isValidApiKey(openaiKey, "sk-")) {
    try {
      console.log("Calling OpenAI API...");
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 4096,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("OpenAI API response received");
        return data.choices?.[0]?.message?.content || null;
      } else {
        console.error("OpenAI API error:", await response.text());
      }
    } catch (error) {
      console.error("OpenAI API error:", error);
    }
  }

  // Try OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey.length > 20 && !openrouterKey.includes("your")) {
    try {
      console.log("Calling OpenRouter API...");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://mission.clawdbot.army",
          "X-Title": "Clawd Bot Org",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 4096,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("OpenRouter API response received");
        return data.choices?.[0]?.message?.content || null;
      } else {
        console.error("OpenRouter API error:", await response.text());
      }
    } catch (error) {
      console.error("OpenRouter API error:", error);
    }
  }

  throw new Error("All AI providers failed. Check your API keys in Settings.");
}

// Get recent messages for an agent or all agents
export async function getRecentMessages(agentId?: AgentId, limit = 50): Promise<AgentMessage[]> {
  const messages = await loadMessages();

  let filtered = messages;
  if (agentId) {
    filtered = messages.filter(m => m.from === agentId || m.to === agentId || m.to === "broadcast");
  }

  return filtered.slice(-limit);
}

// Send a user message to an agent
export async function sendUserMessage(toAgent: AgentId, content: string, taskId?: string): Promise<void> {
  await addMessage({
    from: "claude" as AgentId, // User messages go through Claude as coordinator
    to: toAgent,
    content: `[User]: ${content}`,
    type: "chat",
    taskId,
  });

  // If there's an active task for this agent, add to its conversation and continue
  if (taskId) {
    const tasks = await loadTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status === "in_progress") {
      task.conversationHistory = task.conversationHistory || [];
      task.conversationHistory.push({
        id: `conv-${Date.now()}`,
        timestamp: new Date().toISOString(),
        from: "claude" as AgentId,
        to: toAgent,
        content: `[User Response]: ${content}`,
        type: "chat",
        taskId,
      });
      await saveTasks(tasks);

      // Continue the task execution
      executeAgentTask(taskId);
    }
  }
}
