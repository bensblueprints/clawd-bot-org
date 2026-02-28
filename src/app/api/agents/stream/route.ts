import { NextRequest } from "next/server";
import { loadMessages, loadTasks, subscribeToAgentEvents, AGENTS, AgentMessage, AgentTask } from "@/lib/agents/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state
      const initialMessages = await loadMessages();
      const initialTasks = await loadTasks();

      const initialData = {
        type: "init",
        messages: initialMessages.slice(-100),
        tasks: initialTasks.filter(t => t.status !== "completed" || !t.notified),
        agents: Object.entries(AGENTS).map(([id, agent]) => ({
          id,
          name: agent.name,
          role: agent.role,
          emoji: agent.emoji,
        })),
        timestamp: new Date().toISOString(),
      };

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

      // Subscribe to real-time events
      const unsubscribe = subscribeToAgentEvents((event) => {
        try {
          let eventData: { type: string; message?: AgentMessage; task?: AgentTask; timestamp: string };

          if ("type" in event && event.type === "taskUpdate") {
            eventData = {
              type: "taskUpdate",
              task: event.task,
              timestamp: new Date().toISOString(),
            };
          } else {
            eventData = {
              type: "message",
              message: event as AgentMessage,
              timestamp: new Date().toISOString(),
            };
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
        } catch (error) {
          console.error("Error sending SSE event:", error);
        }
      });

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
