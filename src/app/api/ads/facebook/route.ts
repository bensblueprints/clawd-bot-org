import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const ADS_FILE = path.join(DATA_DIR, "facebook-ads.json");
const OUTPUT_DIR = path.resolve(process.cwd(), "output/ads");

// Facebook Marketing API credentials
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || "EAAKJuvYZBJbgBQpCZAdughfZC4VrLQaozR8eJIQ0EW6TJ4gyXgUDeGrbzPET8mhFalgA8SuYSxdvYj9wFMY7QZBinRJbY11U1GMX06ZBsK1pz8YVAzjFd3eAtZCHmmLdZClMgZA0cZBnlRZAW7LYItiRyCuZCdJXnS2fEeEpGWBYtGZCPschTcBKAwNqe6zJsnnK79SZAyjZBt8PlVFEYO65ZBMxZAmAPDBj3TSq1ETYykc8pSGZBmjjfkrA2rWKWJ5uNXOfOOp7RXY4FMiuUNAAKwcq6niOPXAbHm9L4taxXmWKMnA9cMZCbm498RkO4zv2z6tnHQ0oMZD";
const FB_APP_ID = "1367190391759798";
const FB_BUSINESS_ID = "1534510457804917";
const FB_AD_ACCOUNTS = [
  "act_1207951698129371",
  "act_925247233788598",
  "act_317998050601523",
  "act_1126006145134371",
  "act_992190159627520",
  "act_939684504368516",
];

interface AdCreative {
  id: string;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  linkUrl?: string;
  imageUrl?: string;
  status: "draft" | "active" | "paused" | "completed";
  performance?: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
  };
  createdAt: string;
}

interface AdCampaign {
  id: string;
  name: string;
  objective: string;
  budget: number;
  budgetType: "daily" | "lifetime";
  targetAudience: {
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    locations?: string[];
    interests?: string[];
  };
  creatives: AdCreative[];
  status: "draft" | "pending_review" | "active" | "paused" | "completed";
  fbCampaignId?: string;
  fbAdSetId?: string;
  createdAt: string;
}

interface AdsData {
  campaigns: AdCampaign[];
  lastUpdated: string;
}

async function loadAds(): Promise<AdCampaign[]> {
  try {
    const raw = await fs.readFile(ADS_FILE, "utf-8");
    const data: AdsData = JSON.parse(raw);
    return data.campaigns || [];
  } catch {
    return [];
  }
}

async function saveAds(campaigns: AdCampaign[]): Promise<void> {
  const data: AdsData = {
    campaigns,
    lastUpdated: new Date().toISOString(),
  };
  await fs.writeFile(ADS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Generate ad copy using AI
async function generateAdCopy(prompt: string, objective: string): Promise<AdCreative[] | null> {
  const systemPrompt = `You are an expert Facebook Ads copywriter. Create high-converting ad variations.

Objective: ${objective}

Create 3 ad variations with:
- Headline (max 40 chars): Hook that grabs attention
- Primary Text (max 125 chars): Main message with value prop
- Description (max 30 chars): Supporting text
- Call to Action: One of: LEARN_MORE, SIGN_UP, SHOP_NOW, GET_OFFER, CONTACT_US

Output as JSON array:
[
  {
    "headline": "...",
    "primaryText": "...",
    "description": "...",
    "callToAction": "LEARN_MORE"
  }
]

Best practices:
- Use emotional triggers
- Include social proof when possible
- Create urgency without being pushy
- Focus on benefits, not features
- Test different angles (pain point, aspiration, curiosity)`;

  let response: string | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const result = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });
      response = result.content[0].type === "text" ? result.content[0].text : null;
    } catch (e) {
      console.error("Anthropic error:", e);
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
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
        }),
      });
      const data = await res.json();
      response = data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error("OpenAI error:", e);
    }
  }

  if (!response) return null;

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((ad: Record<string, string>, i: number) => ({
        id: `creative-${Date.now()}-${i}`,
        headline: ad.headline,
        primaryText: ad.primaryText,
        description: ad.description,
        callToAction: ad.callToAction,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      }));
    }
  } catch (e) {
    console.error("Failed to parse ad copy:", e);
  }

  return null;
}

// Create Facebook Campaign via API
async function createFBCampaign(campaign: AdCampaign, adAccountId: string): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaign.name,
          objective: campaign.objective.toUpperCase(),
          status: "PAUSED", // Start paused for review
          special_ad_categories: [],
          access_token: FB_ACCESS_TOKEN,
        }),
      }
    );

    const data = await response.json();
    if (data.id) {
      return { success: true, campaignId: data.id };
    } else {
      return { success: false, error: JSON.stringify(data.error || data) };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Create Ad Set
async function createFBAdSet(
  campaignId: string,
  campaign: AdCampaign,
  adAccountId: string
): Promise<{ success: boolean; adSetId?: string; error?: string }> {
  try {
    const targeting: Record<string, unknown> = {
      geo_locations: {
        countries: campaign.targetAudience.locations || ["US"],
      },
    };

    if (campaign.targetAudience.ageMin) {
      targeting.age_min = campaign.targetAudience.ageMin;
    }
    if (campaign.targetAudience.ageMax) {
      targeting.age_max = campaign.targetAudience.ageMax;
    }
    if (campaign.targetAudience.interests?.length) {
      targeting.flexible_spec = [
        {
          interests: campaign.targetAudience.interests.map(i => ({ name: i })),
        },
      ];
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/adsets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${campaign.name} - Ad Set`,
          campaign_id: campaignId,
          daily_budget: campaign.budgetType === "daily" ? campaign.budget * 100 : undefined,
          lifetime_budget: campaign.budgetType === "lifetime" ? campaign.budget * 100 : undefined,
          billing_event: "IMPRESSIONS",
          optimization_goal: "LINK_CLICKS",
          targeting,
          status: "PAUSED",
          access_token: FB_ACCESS_TOKEN,
        }),
      }
    );

    const data = await response.json();
    if (data.id) {
      return { success: true, adSetId: data.id };
    } else {
      return { success: false, error: JSON.stringify(data.error || data) };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Get ad account insights
async function getAccountInsights(adAccountId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=impressions,clicks,spend,actions&date_preset=last_7d&access_token=${FB_ACCESS_TOKEN}`
    );
    const data = await response.json();
    return data.data?.[0] || null;
  } catch (e) {
    console.error("Failed to get insights:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, prompt, objective, budget, budgetType, targetAudience, campaignId, adAccountId } = body;

    // Generate ad creatives
    if (action === "generate") {
      if (!prompt) {
        return NextResponse.json({ error: "Prompt required" }, { status: 400 });
      }

      const creatives = await generateAdCopy(prompt, objective || "conversions");
      if (!creatives) {
        return NextResponse.json({ error: "Failed to generate ad copy" }, { status: 500 });
      }

      // Save to file
      const filename = `ad-creatives-${Date.now()}.json`;
      await fs.writeFile(
        path.join(OUTPUT_DIR, filename),
        JSON.stringify(creatives, null, 2),
        "utf-8"
      );

      return NextResponse.json({
        success: true,
        creatives,
        savedTo: filename,
      });
    }

    // Create full campaign
    if (action === "create_campaign") {
      if (!prompt || !budget) {
        return NextResponse.json({ error: "Prompt and budget required" }, { status: 400 });
      }

      // Generate creatives
      const creatives = await generateAdCopy(prompt, objective || "conversions");
      if (!creatives) {
        return NextResponse.json({ error: "Failed to generate ad copy" }, { status: 500 });
      }

      // Create campaign object
      const campaign: AdCampaign = {
        id: `campaign-${Date.now()}`,
        name: `Campaign - ${new Date().toLocaleDateString()}`,
        objective: objective || "CONVERSIONS",
        budget,
        budgetType: budgetType || "daily",
        targetAudience: targetAudience || { ageMin: 25, ageMax: 55, locations: ["US"] },
        creatives,
        status: "draft",
        createdAt: new Date().toISOString(),
      };

      // Save locally
      const campaigns = await loadAds();
      campaigns.push(campaign);
      await saveAds(campaigns);

      // Save to file
      const filename = `campaign-${campaign.id}.json`;
      await fs.writeFile(
        path.join(OUTPUT_DIR, filename),
        JSON.stringify(campaign, null, 2),
        "utf-8"
      );

      return NextResponse.json({
        success: true,
        campaign,
        message: "Campaign created locally. Use 'launch' action to push to Facebook.",
      });
    }

    // Launch campaign to Facebook
    if (action === "launch") {
      if (!campaignId) {
        return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
      }

      const campaigns = await loadAds();
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const targetAdAccount = adAccountId || FB_AD_ACCOUNTS[0];

      // Create FB campaign
      const fbResult = await createFBCampaign(campaign, targetAdAccount);
      if (!fbResult.success) {
        return NextResponse.json({ error: fbResult.error }, { status: 500 });
      }

      // Create ad set
      const adSetResult = await createFBAdSet(fbResult.campaignId!, campaign, targetAdAccount);

      // Update local record
      campaign.fbCampaignId = fbResult.campaignId;
      campaign.fbAdSetId = adSetResult.adSetId;
      campaign.status = "pending_review";
      await saveAds(campaigns);

      return NextResponse.json({
        success: true,
        fbCampaignId: fbResult.campaignId,
        fbAdSetId: adSetResult.adSetId,
        message: "Campaign launched to Facebook (paused for review)",
      });
    }

    // Get insights
    if (action === "insights") {
      const targetAdAccount = adAccountId || FB_AD_ACCOUNTS[0];
      const insights = await getAccountInsights(targetAdAccount);

      return NextResponse.json({
        success: true,
        adAccount: targetAdAccount,
        insights,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Facebook Ads API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const campaigns = await loadAds();

  // Get insights for active campaigns
  const withInsights = await Promise.all(
    campaigns.slice(-10).map(async (campaign) => {
      if (campaign.fbCampaignId && FB_AD_ACCOUNTS[0]) {
        // In production, fetch real insights here
      }
      return campaign;
    })
  );

  return NextResponse.json({
    campaigns: withInsights,
    adAccounts: FB_AD_ACCOUNTS,
    stats: {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === "active").length,
      draft: campaigns.filter(c => c.status === "draft").length,
    },
  });
}
