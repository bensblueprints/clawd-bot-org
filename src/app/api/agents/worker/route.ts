import { NextRequest, NextResponse } from "next/server";
import { startWorker, stopWorker, isWorkerRunning, getWorkerStatus, generateIdleWork } from "@/lib/agents/worker";

export async function GET() {
  const status = await getWorkerStatus();

  return NextResponse.json({
    ...status,
    message: status.running ? "Worker is running" : "Worker is stopped",
  });
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case "start":
        startWorker();
        return NextResponse.json({
          success: true,
          message: "Worker started",
          running: true,
        });

      case "stop":
        stopWorker();
        return NextResponse.json({
          success: true,
          message: "Worker stopped",
          running: false,
        });

      case "generate":
        const task = await generateIdleWork();
        return NextResponse.json({
          success: true,
          message: task ? `Generated task: ${task.title}` : "Queue not empty, no work generated",
          task: task ? { id: task.id, title: task.title, agent: task.agentName } : null,
        });

      case "status":
        const status = await getWorkerStatus();
        return NextResponse.json(status);

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: start, stop, generate, or status" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
