import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const OUTREACH_FILE = path.join(DATA_DIR, "outreach-campaigns.json");
const OUTPUT_DIR = path.resolve(process.cwd(), "output/emails");

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  industry?: string;
  title?: string;
  linkedInUrl?: string;
  source: "manual" | "scraped" | "imported";
  status: "new" | "contacted" | "responded" | "qualified" | "converted" | "lost";
  notes?: string;
  createdAt: string;
}

interface OutreachSequence {
  id: string;
  name: string;
  type: "cold_email" | "follow_up" | "referral" | "partnership";
  emails: EmailTemplate[];
  targetIndustry?: string;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  subject: string;
  body: string;
  sendAfterDays: number;
  personalizationFields: string[];
}

interface OutreachCampaign {
  id: string;
  name: string;
  sequence: OutreachSequence;
  leads: Lead[];
  status: "draft" | "active" | "paused" | "completed";
  stats: {
    sent: number;
    opened: number;
    replied: number;
    converted: number;
  };
  createdAt: string;
}

interface OutreachData {
  campaigns: OutreachCampaign[];
  sequences: OutreachSequence[];
  leads: Lead[];
  lastUpdated: string;
}

async function loadOutreach(): Promise<OutreachData> {
  try {
    const raw = await fs.readFile(OUTREACH_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      campaigns: [],
      sequences: [],
      leads: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

async function saveOutreach(data: OutreachData): Promise<void> {
  data.lastUpdated = new Date().toISOString();
  await fs.writeFile(OUTREACH_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Generate email sequence using AI
async function generateEmailSequence(
  prompt: string,
  type: OutreachSequence["type"],
  targetIndustry?: string
): Promise<EmailTemplate[] | null> {
  const systemPrompt = `You are an expert sales copywriter specializing in B2B outreach. Create a high-converting email sequence.

Type: ${type}
${targetIndustry ? `Target Industry: ${targetIndustry}` : ""}

Create a 3-email sequence with:
1. Initial outreach email
2. Follow-up (sent 3 days later)
3. Final attempt (sent 5 days after first follow-up)

For each email provide:
- Subject line (compelling, no spam triggers)
- Body (personalized, value-focused, clear CTA)
- Personalization fields to use: {{firstName}}, {{company}}, {{industry}}, {{painPoint}}

Output as JSON array:
[
  {
    "subject": "...",
    "body": "...",
    "sendAfterDays": 0,
    "personalizationFields": ["firstName", "company"]
  }
]

Best practices:
- Keep emails under 150 words
- Lead with value, not pitch
- Ask engaging questions
- Include social proof when relevant
- Clear, single CTA
- Professional but human tone`;

  let response: string | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const result = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
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
          max_tokens: 2000,
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
      return parsed.map((email: Record<string, unknown>, i: number) => ({
        id: `email-${Date.now()}-${i}`,
        subject: email.subject as string,
        body: email.body as string,
        sendAfterDays: (email.sendAfterDays as number) || i * 3,
        personalizationFields: (email.personalizationFields as string[]) || ["firstName", "company"],
      }));
    }
  } catch (e) {
    console.error("Failed to parse email sequence:", e);
  }

  return null;
}

// Generate single personalized email
async function generatePersonalizedEmail(
  template: EmailTemplate,
  lead: Lead
): Promise<{ subject: string; body: string }> {
  let subject = template.subject;
  let body = template.body;

  // Replace personalization tokens
  const replacements: Record<string, string> = {
    "{{firstName}}": lead.name.split(" ")[0],
    "{{name}}": lead.name,
    "{{company}}": lead.company,
    "{{industry}}": lead.industry || "your industry",
    "{{title}}": lead.title || "",
  };

  for (const [token, value] of Object.entries(replacements)) {
    subject = subject.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "g"), value);
    body = body.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "g"), value);
  }

  return { subject, body };
}

// Generate sales proposal
async function generateProposal(
  clientName: string,
  projectDescription: string,
  services: string[]
): Promise<string | null> {
  const systemPrompt = `You are a professional sales proposal writer. Create a compelling proposal document.

Include:
1. Executive Summary
2. Understanding of Client Needs
3. Proposed Solution
4. Services Breakdown
5. Timeline (general phases)
6. Investment (leave pricing blank for manual fill)
7. Next Steps

Format as clean markdown. Professional tone, client-focused, results-oriented.`;

  const prompt = `Create a proposal for:
Client: ${clientName}
Project: ${projectDescription}
Services: ${services.join(", ")}`;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const result = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });
      return result.content[0].type === "text" ? result.content[0].text : null;
    } catch (e) {
      console.error("Anthropic error:", e);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, prompt, type, targetIndustry, lead, leads, sequenceId, campaignId } = body;

    // Generate new email sequence
    if (action === "generate_sequence") {
      if (!prompt) {
        return NextResponse.json({ error: "Prompt required" }, { status: 400 });
      }

      const emails = await generateEmailSequence(
        prompt,
        type || "cold_email",
        targetIndustry
      );

      if (!emails) {
        return NextResponse.json({ error: "Failed to generate sequence" }, { status: 500 });
      }

      const sequence: OutreachSequence = {
        id: `seq-${Date.now()}`,
        name: `Sequence - ${new Date().toLocaleDateString()}`,
        type: type || "cold_email",
        emails,
        targetIndustry,
        createdAt: new Date().toISOString(),
      };

      // Save sequence
      const data = await loadOutreach();
      data.sequences.push(sequence);
      await saveOutreach(data);

      // Save to file
      const filename = `sequence-${sequence.id}.md`;
      const fileContent = `# ${sequence.name}\n\nType: ${sequence.type}\nIndustry: ${sequence.targetIndustry || "General"}\n\n${sequence.emails.map((e, i) => `## Email ${i + 1} (Day ${e.sendAfterDays})\n\n**Subject:** ${e.subject}\n\n${e.body}\n\n---\n`).join("\n")}`;
      await fs.writeFile(path.join(OUTPUT_DIR, filename), fileContent, "utf-8");

      return NextResponse.json({
        success: true,
        sequence,
        savedTo: filename,
      });
    }

    // Add leads
    if (action === "add_leads") {
      if (!leads || !Array.isArray(leads)) {
        return NextResponse.json({ error: "Leads array required" }, { status: 400 });
      }

      const data = await loadOutreach();
      const newLeads: Lead[] = leads.map((l: Partial<Lead>, i: number) => ({
        id: `lead-${Date.now()}-${i}`,
        name: l.name || "Unknown",
        company: l.company || "Unknown",
        email: l.email || "",
        industry: l.industry,
        title: l.title,
        linkedInUrl: l.linkedInUrl,
        source: l.source || "manual",
        status: "new",
        createdAt: new Date().toISOString(),
      }));

      data.leads.push(...newLeads);
      await saveOutreach(data);

      return NextResponse.json({
        success: true,
        leads: newLeads,
        totalLeads: data.leads.length,
      });
    }

    // Create campaign
    if (action === "create_campaign") {
      if (!sequenceId) {
        return NextResponse.json({ error: "Sequence ID required" }, { status: 400 });
      }

      const data = await loadOutreach();
      const sequence = data.sequences.find(s => s.id === sequenceId);
      if (!sequence) {
        return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
      }

      // Get leads for campaign (filter by industry if specified)
      let campaignLeads = data.leads.filter(l => l.status === "new");
      if (sequence.targetIndustry) {
        campaignLeads = campaignLeads.filter(l =>
          l.industry?.toLowerCase().includes(sequence.targetIndustry!.toLowerCase())
        );
      }

      const campaign: OutreachCampaign = {
        id: `campaign-${Date.now()}`,
        name: body.name || `Campaign - ${sequence.name}`,
        sequence,
        leads: campaignLeads.slice(0, body.maxLeads || 50),
        status: "draft",
        stats: { sent: 0, opened: 0, replied: 0, converted: 0 },
        createdAt: new Date().toISOString(),
      };

      data.campaigns.push(campaign);
      await saveOutreach(data);

      return NextResponse.json({
        success: true,
        campaign,
        leadsCount: campaign.leads.length,
      });
    }

    // Generate personalized emails for a campaign
    if (action === "personalize") {
      if (!campaignId) {
        return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
      }

      const data = await loadOutreach();
      const campaign = data.campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const personalizedEmails: Array<{
        leadId: string;
        leadName: string;
        emails: Array<{ subject: string; body: string; sendDay: number }>;
      }> = [];

      for (const campaignLead of campaign.leads.slice(0, 10)) { // Limit to 10 for demo
        const emails = [];
        for (const template of campaign.sequence.emails) {
          const personalized = await generatePersonalizedEmail(template, campaignLead);
          emails.push({
            ...personalized,
            sendDay: template.sendAfterDays,
          });
        }
        personalizedEmails.push({
          leadId: campaignLead.id,
          leadName: campaignLead.name,
          emails,
        });
      }

      // Save personalized emails to files
      for (const pe of personalizedEmails) {
        const filename = `personalized-${campaign.id}-${pe.leadId}.md`;
        const fileContent = `# Personalized Emails for ${pe.leadName}\n\n${pe.emails.map((e, i) => `## Day ${e.sendDay}\n\n**Subject:** ${e.subject}\n\n${e.body}\n\n---\n`).join("\n")}`;
        await fs.writeFile(path.join(OUTPUT_DIR, filename), fileContent, "utf-8");
      }

      return NextResponse.json({
        success: true,
        personalizedEmails,
        savedCount: personalizedEmails.length,
      });
    }

    // Generate proposal
    if (action === "generate_proposal") {
      const { clientName, projectDescription, services } = body;
      if (!clientName || !projectDescription) {
        return NextResponse.json({ error: "Client name and project description required" }, { status: 400 });
      }

      const proposal = await generateProposal(
        clientName,
        projectDescription,
        services || ["Marketing Strategy", "Content Creation", "Paid Advertising"]
      );

      if (!proposal) {
        return NextResponse.json({ error: "Failed to generate proposal" }, { status: 500 });
      }

      // Save proposal
      const filename = `proposal-${clientName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.md`;
      await fs.writeFile(path.join(OUTPUT_DIR, filename), proposal, "utf-8");

      return NextResponse.json({
        success: true,
        proposal,
        savedTo: filename,
      });
    }

    // Update lead status
    if (action === "update_lead") {
      if (!lead?.id || !lead?.status) {
        return NextResponse.json({ error: "Lead ID and status required" }, { status: 400 });
      }

      const data = await loadOutreach();
      const leadIndex = data.leads.findIndex(l => l.id === lead.id);
      if (leadIndex === -1) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      data.leads[leadIndex] = { ...data.leads[leadIndex], ...lead };
      await saveOutreach(data);

      return NextResponse.json({
        success: true,
        lead: data.leads[leadIndex],
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Outreach API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const data = await loadOutreach();

  const stats = {
    totalLeads: data.leads.length,
    newLeads: data.leads.filter(l => l.status === "new").length,
    contacted: data.leads.filter(l => l.status === "contacted").length,
    qualified: data.leads.filter(l => l.status === "qualified").length,
    converted: data.leads.filter(l => l.status === "converted").length,
    activeCampaigns: data.campaigns.filter(c => c.status === "active").length,
    totalSequences: data.sequences.length,
  };

  return NextResponse.json({
    campaigns: data.campaigns.slice(-10),
    sequences: data.sequences.slice(-10),
    leads: data.leads.slice(-50),
    stats,
  });
}
