import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const OUTPUT_DIR = path.resolve(process.cwd(), "output");

interface Deliverable {
  name: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
}

interface DeliverablesByCategory {
  [key: string]: Deliverable[];
}

async function getFilesInDir(dir: string, category: string): Promise<Deliverable[]> {
  try {
    const files = await fs.readdir(dir);
    const deliverables: Deliverable[] = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          deliverables.push({
            name: file,
            path: filePath,
            type: path.extname(file).slice(1) || "txt",
            size: stat.size,
            createdAt: stat.birthtime.toISOString(),
          });
        }
      } catch {
        // Skip files we can't read
      }
    }

    return deliverables.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  // If path is provided, return file content
  if (filePath) {
    try {
      // Verify the path is within output directory for security
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(OUTPUT_DIR)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
      }

      const content = await fs.readFile(filePath, "utf-8");
      return NextResponse.json({ content });
    } catch (error) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
  }

  // Otherwise, list all deliverables by category
  const categories = [
    "blog-posts",
    "social-media",
    "ads",
    "code",
    "emails",
    "landing-pages",
  ];

  const byCategory: DeliverablesByCategory = {};
  let totalSize = 0;
  let totalFiles = 0;

  for (const category of categories) {
    const categoryDir = path.join(OUTPUT_DIR, category);
    const files = await getFilesInDir(categoryDir, category);
    byCategory[category] = files;
    totalFiles += files.length;
    totalSize += files.reduce((sum, f) => sum + f.size, 0);
  }

  // Get recent files across all categories
  const allFiles = Object.values(byCategory).flat();
  const recentFiles = allFiles
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return NextResponse.json({
    byCategory,
    recentFiles,
    stats: {
      totalFiles,
      totalSize,
      categories: categories.length,
    },
  });
}
