import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const OUTPUT_DIR = path.resolve(process.cwd(), "output");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

interface ProjectTask {
  id: string;
  agent: string;
  type: "content" | "code" | "design" | "marketing" | "social" | "outreach" | "research";
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "pending" | "in_progress" | "completed" | "failed";
  dependencies: string[];
  output?: {
    type: "file" | "post" | "ad" | "email" | "code";
    path?: string;
    content?: string;
    metadata?: Record<string, unknown>;
  };
  createdAt: string;
  completedAt?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  goal: string;
  status: "planning" | "in_progress" | "completed" | "paused";
  tasks: ProjectTask[];
  deliverables: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectsData {
  projects: Project[];
  lastUpdated: string;
}

const AGENTS = {
  quill: { name: "Quill", skills: ["blog posts", "SEO content", "copywriting", "social media copy", "ad copy", "email sequences"] },
  builder: { name: "Builder", skills: ["code", "websites", "landing pages", "components", "APIs", "automation"] },
  pixel: { name: "Pixel", skills: ["UI design", "graphics", "ad creatives", "brand assets", "mockups"] },
  scout: { name: "Scout", skills: ["research", "competitor analysis", "market research", "data gathering"] },
  herald: { name: "Herald", skills: ["outreach", "sales emails", "client communication", "proposals", "follow-ups"] },
  archie: { name: "Archie", skills: ["strategy", "planning", "architecture", "project scoping"] },
  sentinel: { name: "Sentinel", skills: ["review", "quality assurance", "editing", "optimization"] },
};

const ORCHESTRATOR_PROMPT = `You are the Master Orchestrator for Clawd Bot Org. Your job is to take a user's request and create a comprehensive execution plan that assigns specific tasks to agents.

**Available Agents:**
- Quill (Content Writer): Blog posts, SEO content, copywriting, social media copy, ad copy, email sequences
- Builder (Developer): Code, websites, landing pages, components, APIs, automation
- Pixel (Designer): UI design, graphics, ad creatives, brand assets, mockups
- Scout (Researcher): Research, competitor analysis, market research, data gathering
- Herald (Outreach): Sales emails, client communication, proposals, follow-ups
- Archie (Architect): Strategy, planning, architecture, project scoping
- Sentinel (Reviewer): Quality assurance, editing, optimization

**Output Format:**
You MUST respond with a valid JSON object in this exact format:
{
  "projectName": "Short project name",
  "projectDescription": "Brief description",
  "goal": "What success looks like",
  "tasks": [
    {
      "agent": "quill|builder|pixel|scout|herald|archie|sentinel",
      "type": "content|code|design|marketing|social|outreach|research",
      "title": "Task title",
      "description": "Detailed instructions for the agent",
      "priority": "High|Medium|Low",
      "dependencies": ["task-id-if-depends-on-another"],
      "outputType": "file|post|ad|email|code",
      "outputFilename": "suggested-filename.ext"
    }
  ],
  "executionOrder": "Explain the order and dependencies"
}

**Important:**
- Break complex requests into specific, actionable tasks
- Assign the RIGHT agent for each task
- Include dependencies (e.g., research before writing)
- Be specific in task descriptions so agents can execute independently
- Consider the full workflow: research → create → review → publish
- For marketing campaigns, include all pieces: ads, landing page, emails, social posts`;

async function loadProjects(): Promise<Project[]> {
  try {
    const raw = await fs.readFile(PROJECTS_FILE, "utf-8");
    const data: ProjectsData = JSON.parse(raw);
    return data.projects || [];
  } catch {
    return [];
  }
}

async function saveProjects(projects: Project[]): Promise<void> {
  const data: ProjectsData = {
    projects,
    lastUpdated: new Date().toISOString(),
  };
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function callAI(prompt: string): Promise<string | null> {
  // Try Anthropic first
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: ORCHESTRATOR_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0].type === "text" ? response.content[0].text : null;
    } catch (e) {
      console.error("Anthropic error:", e);
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
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
            { role: "system", content: ORCHESTRATOR_PROMPT },
            { role: "user", content: prompt }
          ],
          max_tokens: 4096,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error("OpenAI error:", e);
    }
  }

  return null;
}

// Execute a content task and save real output
async function executeContentTask(task: ProjectTask, projectId: string): Promise<ProjectTask> {
  const contentPrompt = `You are ${AGENTS[task.agent as keyof typeof AGENTS]?.name || task.agent}, an expert content creator.

Task: ${task.title}
Description: ${task.description}

Create the complete, production-ready content. Output ONLY the content itself, no explanations or meta-commentary. Make it professional, engaging, and ready to publish.`;

  const content = await callAI(contentPrompt);

  if (content) {
    // Determine file extension based on type
    const ext = task.type === "code" ? ".tsx" : task.type === "social" ? ".md" : ".md";
    const filename = `${projectId}-${task.id}${ext}`;
    const subdir = task.type === "code" ? "code" :
                   task.type === "social" ? "social-media" :
                   task.type === "marketing" ? "ads" :
                   task.type === "outreach" ? "emails" :
                   "blog-posts";

    const filePath = path.join(OUTPUT_DIR, subdir, filename);
    await fs.writeFile(filePath, content, "utf-8");

    task.status = "completed";
    task.completedAt = new Date().toISOString();
    task.output = {
      type: "file",
      path: filePath,
      content: content.substring(0, 500) + (content.length > 500 ? "..." : ""),
    };
  } else {
    task.status = "failed";
  }

  return task;
}

// Execute a code task
async function executeCodeTask(task: ProjectTask, projectId: string): Promise<ProjectTask> {
  const codePrompt = `You are Builder, an expert full-stack developer.

Task: ${task.title}
Description: ${task.description}

Write production-ready code. Include:
- Clear comments explaining key sections
- Error handling
- TypeScript types where applicable
- Best practices

Output ONLY the code, no explanations before or after.`;

  const content = await callAI(codePrompt);

  if (content) {
    const filename = `${projectId}-${task.id}.tsx`;
    const filePath = path.join(OUTPUT_DIR, "code", filename);
    await fs.writeFile(filePath, content, "utf-8");

    task.status = "completed";
    task.completedAt = new Date().toISOString();
    task.output = {
      type: "code",
      path: filePath,
      content: content.substring(0, 500) + (content.length > 500 ? "..." : ""),
    };
  } else {
    task.status = "failed";
  }

  return task;
}

// Execute an outreach/email task
async function executeOutreachTask(task: ProjectTask, projectId: string): Promise<ProjectTask> {
  const outreachPrompt = `You are Herald, an expert sales and outreach specialist.

Task: ${task.title}
Description: ${task.description}

Create professional, personalized outreach content. Make it:
- Compelling but not pushy
- Clear value proposition
- Strong call to action
- Professional tone

Output the complete email/message sequence, ready to send.`;

  const content = await callAI(outreachPrompt);

  if (content) {
    const filename = `${projectId}-${task.id}.md`;
    const filePath = path.join(OUTPUT_DIR, "emails", filename);
    await fs.writeFile(filePath, content, "utf-8");

    task.status = "completed";
    task.completedAt = new Date().toISOString();
    task.output = {
      type: "email",
      path: filePath,
      content: content.substring(0, 500) + (content.length > 500 ? "..." : ""),
    };
  } else {
    task.status = "failed";
  }

  return task;
}

// Main task executor
async function executeTask(task: ProjectTask, projectId: string): Promise<ProjectTask> {
  task.status = "in_progress";

  switch (task.type) {
    case "content":
    case "social":
    case "marketing":
      return executeContentTask(task, projectId);
    case "code":
      return executeCodeTask(task, projectId);
    case "outreach":
      return executeOutreachTask(task, projectId);
    case "research":
      return executeContentTask(task, projectId); // Research outputs as content
    default:
      return executeContentTask(task, projectId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, action, projectId, taskId } = await request.json();

    // Execute a specific task
    if (action === "execute_task" && projectId && taskId) {
      const projects = await loadProjects();
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const taskIndex = project.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Execute the task
      project.tasks[taskIndex] = await executeTask(project.tasks[taskIndex], projectId);
      project.updatedAt = new Date().toISOString();

      // Check if all tasks are done
      if (project.tasks.every(t => t.status === "completed")) {
        project.status = "completed";
        project.deliverables = project.tasks
          .filter(t => t.output?.path)
          .map(t => t.output!.path!);
      }

      await saveProjects(projects);

      return NextResponse.json({
        success: true,
        task: project.tasks[taskIndex],
        projectStatus: project.status,
      });
    }

    // Execute all tasks in a project
    if (action === "execute_all" && projectId) {
      const projects = await loadProjects();
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      project.status = "in_progress";

      // Execute tasks in order (respecting dependencies)
      const completedIds = new Set<string>();
      let maxIterations = project.tasks.length * 2; // Prevent infinite loops

      while (completedIds.size < project.tasks.length && maxIterations > 0) {
        maxIterations--;

        for (const task of project.tasks) {
          if (completedIds.has(task.id)) continue;

          // Check if dependencies are met
          const depsComplete = task.dependencies.every(dep => completedIds.has(dep));
          if (!depsComplete) continue;

          // Execute task
          const result = await executeTask(task, projectId);
          Object.assign(task, result);

          if (task.status === "completed") {
            completedIds.add(task.id);
          }
        }
      }

      // Update project status
      if (project.tasks.every(t => t.status === "completed")) {
        project.status = "completed";
      }

      project.deliverables = project.tasks
        .filter(t => t.output?.path)
        .map(t => t.output!.path!);
      project.updatedAt = new Date().toISOString();

      await saveProjects(projects);

      return NextResponse.json({
        success: true,
        project,
        deliverables: project.deliverables,
      });
    }

    // Create new project from prompt
    if (!prompt) {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }

    const aiResponse = await callAI(prompt);
    if (!aiResponse) {
      return NextResponse.json({ error: "AI planning failed" }, { status: 500 });
    }

    // Parse the JSON response
    let plan;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
                       aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      plan = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI plan:", e);
      return NextResponse.json({
        error: "Failed to parse execution plan",
        raw: aiResponse
      }, { status: 500 });
    }

    // Create project
    const projectIdNew = `proj-${Date.now()}`;
    const project: Project = {
      id: projectIdNew,
      name: plan.projectName || "Untitled Project",
      description: plan.projectDescription || prompt,
      goal: plan.goal || "Complete the requested work",
      status: "planning",
      tasks: (plan.tasks || []).map((t: Record<string, unknown>, i: number) => ({
        id: `task-${i + 1}`,
        agent: t.agent as string || "quill",
        type: t.type as ProjectTask["type"] || "content",
        title: t.title as string || "Untitled Task",
        description: t.description as string || "",
        priority: (t.priority as ProjectTask["priority"]) || "Medium",
        status: "pending" as const,
        dependencies: (t.dependencies as string[]) || [],
        createdAt: new Date().toISOString(),
      })),
      deliverables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save project
    const projects = await loadProjects();
    projects.push(project);
    await saveProjects(projects);

    return NextResponse.json({
      success: true,
      project,
      executionOrder: plan.executionOrder,
      message: `Project "${project.name}" created with ${project.tasks.length} tasks. Use action: "execute_all" to run.`,
    });

  } catch (error) {
    console.error("Orchestrator error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const projects = await loadProjects();

  // Get recent deliverables
  const recentDeliverables: string[] = [];
  for (const project of projects.slice(-5)) {
    recentDeliverables.push(...project.deliverables);
  }

  return NextResponse.json({
    projects,
    stats: {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === "in_progress").length,
      completedProjects: projects.filter(p => p.status === "completed").length,
      totalTasks: projects.reduce((sum, p) => sum + p.tasks.length, 0),
      completedTasks: projects.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "completed").length, 0),
    },
    recentDeliverables,
  });
}
