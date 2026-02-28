import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const SOCIAL_FILE = path.join(DATA_DIR, "social-posts.json");
const OUTPUT_DIR = path.resolve(process.cwd(), "output/social-media");

interface SocialPost {
  id: string;
  platform: "twitter" | "facebook" | "instagram" | "linkedin" | "threads";
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  scheduledFor?: string;
  status: "draft" | "scheduled" | "posted" | "failed";
  postedAt?: string;
  postId?: string;
  error?: string;
  createdAt: string;
}

interface SocialData {
  posts: SocialPost[];
  lastUpdated: string;
}

// Facebook Marketing API credentials from CLAUDE.md
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || "EAAKJuvYZBJbgBQpCZAdughfZC4VrLQaozR8eJIQ0EW6TJ4gyXgUDeGrbzPET8mhFalgA8SuYSxdvYj9wFMY7QZBinRJbY11U1GMX06ZBsK1pz8YVAzjFd3eAtZCHmmLdZClMgZA0cZBnlRZAW7LYItiRyCuZCdJXnS2fEeEpGWBYtGZCPschTcBKAwNqe6zJsnnK79SZAyjZBt8PlVFEYO65ZBMxZAmAPDBj3TSq1ETYykc8pSGZBmjjfkrA2rWKWJ5uNXOfOOp7RXY4FMiuUNAAKwcq6niOPXAbHm9L4taxXmWKMnA9cMZCbm498RkO4zv2z6tnHQ0oMZD";
const FB_PAGE_ID = process.env.FB_PAGE_ID;

async function loadPosts(): Promise<SocialPost[]> {
  try {
    const raw = await fs.readFile(SOCIAL_FILE, "utf-8");
    const data: SocialData = JSON.parse(raw);
    return data.posts || [];
  } catch {
    return [];
  }
}

async function savePosts(posts: SocialPost[]): Promise<void> {
  const data: SocialData = {
    posts,
    lastUpdated: new Date().toISOString(),
  };
  await fs.writeFile(SOCIAL_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Generate social content using AI
async function generateContent(prompt: string, platform: string): Promise<string | null> {
  const platformLimits: Record<string, number> = {
    twitter: 280,
    threads: 500,
    linkedin: 3000,
    facebook: 2000,
    instagram: 2200,
  };

  const limit = platformLimits[platform] || 500;

  const systemPrompt = `You are an expert social media content creator. Create engaging, viral-worthy content for ${platform}.

Rules:
- Maximum ${limit} characters
- Use appropriate tone for ${platform}
- Include relevant hashtags (2-5)
- Make it attention-grabbing
- Include a call to action when appropriate
- For Twitter: be punchy and use threads for longer content
- For LinkedIn: be professional but engaging
- For Instagram/Threads: be visual and use emojis appropriately

Output ONLY the post content, nothing else. Include hashtags at the end.`;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0].type === "text" ? response.content[0].text : null;
    } catch (e) {
      console.error("Anthropic error:", e);
    }
  }

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
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 500,
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

// Post to Twitter/X
async function postToTwitter(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  // Use Twitter API v2
  const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
  const twitterApiKey = process.env.TWITTER_API_KEY;
  const twitterApiSecret = process.env.TWITTER_API_SECRET;
  const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN;
  const twitterAccessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!twitterAccessToken) {
    return { success: false, error: "Twitter credentials not configured" };
  }

  try {
    // Using Twitter API v2 with OAuth 1.0a
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${twitterBearerToken}`,
      },
      body: JSON.stringify({ text: content }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, postId: data.data?.id };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Post to Facebook Page
async function postToFacebook(content: string, pageId?: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const targetPageId = pageId || FB_PAGE_ID;

  if (!targetPageId || !FB_ACCESS_TOKEN) {
    return { success: false, error: "Facebook credentials not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${targetPageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          access_token: FB_ACCESS_TOKEN,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return { success: true, postId: data.id };
    } else {
      const error = await response.json();
      return { success: false, error: JSON.stringify(error) };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Post to LinkedIn
async function postToLinkedIn(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!linkedinToken) {
    return { success: false, error: "LinkedIn credentials not configured" };
  }

  try {
    // Get user URN first
    const meResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: { "Authorization": `Bearer ${linkedinToken}` },
    });
    const meData = await meResponse.json();
    const authorUrn = `urn:li:person:${meData.id}`;

    // Create post
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${linkedinToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: content },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, postId: data.id };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, platform, content, prompt, scheduledFor, postId } = body;

    // Generate content from prompt
    if (action === "generate") {
      if (!prompt || !platform) {
        return NextResponse.json({ error: "Prompt and platform required" }, { status: 400 });
      }

      const generatedContent = await generateContent(prompt, platform);
      if (!generatedContent) {
        return NextResponse.json({ error: "Content generation failed" }, { status: 500 });
      }

      // Extract hashtags
      const hashtagMatch = generatedContent.match(/#\w+/g);

      return NextResponse.json({
        success: true,
        content: generatedContent,
        hashtags: hashtagMatch || [],
        platform,
        characterCount: generatedContent.length,
      });
    }

    // Schedule a post
    if (action === "schedule") {
      if (!content || !platform) {
        return NextResponse.json({ error: "Content and platform required" }, { status: 400 });
      }

      const posts = await loadPosts();
      const newPost: SocialPost = {
        id: `post-${Date.now()}`,
        platform,
        content,
        scheduledFor,
        status: scheduledFor ? "scheduled" : "draft",
        createdAt: new Date().toISOString(),
      };

      posts.push(newPost);
      await savePosts(posts);

      // Save to file
      const filename = `${newPost.id}-${platform}.md`;
      await fs.writeFile(
        path.join(OUTPUT_DIR, filename),
        `# ${platform.toUpperCase()} Post\n\nScheduled: ${scheduledFor || "Not scheduled"}\n\n---\n\n${content}`,
        "utf-8"
      );

      return NextResponse.json({ success: true, post: newPost });
    }

    // Post immediately
    if (action === "post") {
      if (!content || !platform) {
        return NextResponse.json({ error: "Content and platform required" }, { status: 400 });
      }

      let result: { success: boolean; postId?: string; error?: string };

      switch (platform) {
        case "twitter":
          result = await postToTwitter(content);
          break;
        case "facebook":
          result = await postToFacebook(content);
          break;
        case "linkedin":
          result = await postToLinkedIn(content);
          break;
        default:
          result = { success: false, error: `Platform ${platform} not supported yet` };
      }

      // Save to posts history
      const posts = await loadPosts();
      const newPost: SocialPost = {
        id: `post-${Date.now()}`,
        platform,
        content,
        status: result.success ? "posted" : "failed",
        postId: result.postId,
        error: result.error,
        postedAt: result.success ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };
      posts.push(newPost);
      await savePosts(posts);

      return NextResponse.json({
        success: result.success,
        post: newPost,
        postId: result.postId,
        error: result.error
      });
    }

    // Create multi-platform campaign
    if (action === "campaign") {
      if (!prompt) {
        return NextResponse.json({ error: "Campaign prompt required" }, { status: 400 });
      }

      const platforms = body.platforms || ["twitter", "linkedin", "facebook"];
      const results: SocialPost[] = [];

      for (const plat of platforms) {
        const generatedContent = await generateContent(prompt, plat);
        if (generatedContent) {
          const posts = await loadPosts();
          const newPost: SocialPost = {
            id: `post-${Date.now()}-${plat}`,
            platform: plat,
            content: generatedContent,
            status: "draft",
            createdAt: new Date().toISOString(),
          };
          posts.push(newPost);
          results.push(newPost);
          await savePosts(posts);

          // Save to file
          const filename = `${newPost.id}.md`;
          await fs.writeFile(
            path.join(OUTPUT_DIR, filename),
            `# ${plat.toUpperCase()} Post\n\n${generatedContent}`,
            "utf-8"
          );
        }
      }

      return NextResponse.json({
        success: true,
        campaign: results,
        message: `Created ${results.length} posts for ${platforms.join(", ")}`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Social API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const posts = await loadPosts();

  const stats = {
    total: posts.length,
    posted: posts.filter(p => p.status === "posted").length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
    drafts: posts.filter(p => p.status === "draft").length,
    failed: posts.filter(p => p.status === "failed").length,
    byPlatform: {
      twitter: posts.filter(p => p.platform === "twitter").length,
      facebook: posts.filter(p => p.platform === "facebook").length,
      linkedin: posts.filter(p => p.platform === "linkedin").length,
      instagram: posts.filter(p => p.platform === "instagram").length,
    },
  };

  // Get scheduled posts that are due
  const now = new Date();
  const duePosts = posts.filter(p =>
    p.status === "scheduled" &&
    p.scheduledFor &&
    new Date(p.scheduledFor) <= now
  );

  return NextResponse.json({
    posts: posts.slice(-50).reverse(), // Last 50 posts
    stats,
    duePosts,
  });
}
