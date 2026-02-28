import { loadTasks, saveTasks, executeAgentTask, addMessage, AGENTS, AgentId } from "./engine";

let workerRunning = false;
let workerInterval: NodeJS.Timeout | null = null;

// Check for pending tasks and execute them
async function processPendingTasks() {
  try {
    const tasks = await loadTasks();

    // Find pending tasks that haven't started
    const pendingTasks = tasks.filter(t => t.status === "pending");

    // Find stuck in_progress tasks (running for more than 5 minutes without update)
    const now = Date.now();
    const stuckTasks = tasks.filter(t => {
      if (t.status !== "in_progress") return false;
      const lastLog = t.logs[t.logs.length - 1];
      if (!lastLog) return true;
      const lastUpdate = new Date(lastLog.time).getTime();
      return (now - lastUpdate) > 5 * 60 * 1000; // 5 minutes
    });

    // Restart stuck tasks
    for (const task of stuckTasks) {
      console.log(`[Worker] Restarting stuck task: ${task.title}`);
      task.status = "pending";
      task.logs.push({
        time: new Date().toISOString(),
        message: "Task was stuck, restarting...",
      });
    }

    if (stuckTasks.length > 0) {
      await saveTasks(tasks);
    }

    // Process pending tasks (limit to 3 concurrent)
    const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
    const availableSlots = Math.max(0, 3 - inProgressCount);

    const tasksToStart = pendingTasks.slice(0, availableSlots);

    for (const task of tasksToStart) {
      console.log(`[Worker] Starting task: ${task.title} (Agent: ${task.agentName})`);
      executeAgentTask(task.id);
    }

    // Log status periodically
    const completed = tasks.filter(t => t.status === "completed").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const pending = tasks.filter(t => t.status === "pending").length;
    const failed = tasks.filter(t => t.status === "failed").length;

    if (pending > 0 || inProgress > 0) {
      console.log(`[Worker] Tasks: ${completed} completed, ${inProgress} in progress, ${pending} pending, ${failed} failed`);
    }

  } catch (error) {
    console.error("[Worker] Error processing tasks:", error);
  }
}

// Start the background worker
export function startWorker() {
  if (workerRunning) {
    console.log("[Worker] Already running");
    return;
  }

  console.log("[Worker] Starting background agent worker...");
  workerRunning = true;

  // Process immediately
  processPendingTasks();

  // Then check every 10 seconds
  workerInterval = setInterval(processPendingTasks, 10000);
}

// Stop the background worker
export function stopWorker() {
  if (!workerRunning) {
    return;
  }

  console.log("[Worker] Stopping background worker...");
  workerRunning = false;

  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

// Check if worker is running
export function isWorkerRunning(): boolean {
  return workerRunning;
}

// Get worker status
export async function getWorkerStatus() {
  const tasks = await loadTasks();

  return {
    running: workerRunning,
    tasks: {
      total: tasks.length,
      completed: tasks.filter(t => t.status === "completed").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      pending: tasks.filter(t => t.status === "pending").length,
      failed: tasks.filter(t => t.status === "failed").length,
    },
    lastCheck: new Date().toISOString(),
  };
}

// Auto-generate work when idle (SEO content, etc.)
export async function generateIdleWork() {
  const tasks = await loadTasks();
  const activeTasks = tasks.filter(t => t.status === "pending" || t.status === "in_progress");

  // Only generate work if completely idle
  if (activeTasks.length > 0) {
    return null;
  }

  // Generate an SEO blog post
  const topics = [
    "CBD oil benefits for anxiety relief",
    "How to choose the right CBD product",
    "CBD vs THC: Understanding the difference",
    "Best CBD products for sleep",
    "CBD for pain management: What the research says",
    "Beginner's guide to CBD dosage",
    "CBD skincare benefits",
    "CBD for pets: Is it safe?",
  ];

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  console.log(`[Worker] Generating idle work: SEO blog post on "${randomTopic}"`);

  await addMessage({
    from: "claude" as AgentId,
    to: "broadcast",
    content: `No pending tasks. Starting fallback work: SEO content generation.`,
    type: "update",
  });

  // Import createAgentTask dynamically to avoid circular deps
  const { createAgentTask } = await import("./engine");

  const task = await createAgentTask({
    agent: "quill",
    title: `Write SEO blog post: ${randomTopic}`,
    description: `Create an SEO-optimized blog post about "${randomTopic}". Include:
- Engaging headline and meta description
- 1500+ words of quality content
- Proper heading structure (H2, H3)
- Internal linking suggestions
- Call-to-action at the end
Target audience: People interested in CBD/wellness products.`,
    priority: "Low",
  });

  return task;
}
