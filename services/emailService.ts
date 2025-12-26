import { CompanyProfile, Lead, EmailCampaign, EmailTemplate } from '../types';
import { callLLM, parseJSONFromLLM, LLMOptions } from './freeLLMService';
import { searchWeb, getLatestNews, isWebResearchConfigured } from './webResearchService';

/**
 * Generate highly personalized email with real-time research
 */
export async function generateLeadEmail(
    lead: Lead,
    profile: CompanyProfile,
    objective: string = 'collaboration'
): Promise<EmailTemplate> {
    // Research the lead's company for personalization
    let companyContext = '';
    let recentNews = '';

    if (isWebResearchConfigured()) {
        console.log('[Email] Researching lead for personalization...');

        // Search for recent company news/updates
        const searchResults = await searchWeb(`${lead.companyName} ${lead.industry}`, 3);
        if (searchResults.length > 0) {
            companyContext = `
RECENT INSIGHTS ABOUT ${lead.companyName.toUpperCase()}:
${searchResults.map(r => `• ${r.title}: ${r.snippet}`).join('\n')}
`;
        }

        // Get industry news for relevance
        const news = await getLatestNews(lead.industry, 2);
        if (news.length > 0) {
            recentNews = `
INDUSTRY NEWS TO REFERENCE:
${news.map(n => `• ${n.title} (${n.source})`).join('\n')}
`;
        }
    }

    const prompt = `
You are an elite B2B email copywriter who achieves 40%+ open rates and 15%+ response rates. Write a HYPER-PERSONALIZED outreach email.

PSYCHOLOGY OF EFFECTIVE COLD EMAILS:
1. Pattern interrupt in subject line - be unexpected
2. First line must hook them in 3 seconds
3. Make it about THEM, not you
4. One clear call-to-action
5. Create genuine curiosity

SENDER PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━
• Company: ${profile.name}
• Industry: ${profile.industry}
• What We Do: ${profile.description}
• Brand Voice: ${profile.brandVoice}

TARGET LEAD:
━━━━━━━━━━━━━━━━━━━━━━━
• Company: ${lead.companyName}
• Industry: ${lead.industry}
• Contact: ${lead.contactName || 'Decision Maker'}
• Company Size: ${lead.size}
• Why They're a Fit: ${lead.summary}
• Website: ${lead.website || 'N/A'}

${companyContext}
${recentNews}

OBJECTIVE: ${objective}

CREATIVE CONSTRAINTS:
• Subject line: 3-7 words, curiosity-driven, NO spam triggers
• Opening line: Reference something specific about their company
• Body: Under 100 words, clear value proposition
• CTA: Single, low-commitment ask (quick call, reply, etc.)
• Signature: Professional but warm

APPROACH OPTIONS (pick the best fit):
A) "I noticed [specific thing]..." - observation-based
B) "Quick question about..." - curiosity-driven
C) "Congrats on [achievement]..." - celebration hook
D) "[Mutual connection/event]..." - warm introduction
E) "Idea for [their goal]..." - value-first

Return JSON:
{
  "subject": "Intriguing 3-7 word subject line",
  "body": "Full email with proper line breaks and formatting",
  "approachUsed": "Which approach you chose and why",
  "personalizationPoints": ["specific detail 1", "specific detail 2"]
}`;

    const options: LLMOptions = {
        type: 'reasoning',
        systemPrompt: `You are a cold email expert who understands buyer psychology. Your emails feel personal, not templated. You never use spam phrases like "reaching out" or "I hope this email finds you well." Every word earns its place.`,
        temperature: 0.85
    };

    const response = await callLLM(prompt, options);
    const parsed = parseJSONFromLLM<{ subject: string; body: string; approachUsed?: string; personalizationPoints?: string[] }>(response.text);

    return {
        id: `email-${Date.now()}`,
        subject: parsed?.subject || 'Partnership Opportunity',
        body: parsed?.body || 'Unable to generate email content.',
        variant: 'A',
        sent: false
    };
}

/**
 * Generate A/B variant with different psychological approach
 */
export async function generateEmailVariant(
    original: EmailTemplate,
    profile: CompanyProfile
): Promise<EmailTemplate> {
    const prompt = `
Create an A/B test variant that uses a COMPLETELY DIFFERENT psychological approach:

ORIGINAL EMAIL:
Subject: ${original.subject}
Body: ${original.body}

VARIANT STRATEGY:
If original uses:
• Curiosity → Use social proof or urgency
• Value-first → Use question-based opening
• Formal tone → Use conversational/casual
• Long → Make it ultra-short (50 words)
• Direct ask → Use soft CTA

Create a variant that tests a fundamentally different hypothesis.

Brand Voice: ${profile.brandVoice}

Return JSON:
{
  "subject": "Different approach subject line",
  "body": "Variant email body",
  "hypothesisTested": "What this variant tests vs original"
}`;

    const response = await callLLM(prompt, { type: 'fast', temperature: 0.95 });
    const parsed = parseJSONFromLLM<{ subject: string; body: string; hypothesisTested?: string }>(response.text);

    return {
        id: `email-${Date.now()}-B`,
        subject: parsed?.subject || `RE: ${original.subject}`,
        body: parsed?.body || original.body,
        variant: 'B',
        sent: false
    };
}

/**
 * Create intelligent drip sequence with strategic timing
 */
export async function generateDripSequence(
    lead: Lead,
    profile: CompanyProfile,
    emailCount: number = 3
): Promise<EmailTemplate[]> {
    // Research for personalization across the sequence
    let context = '';
    if (isWebResearchConfigured()) {
        const news = await getLatestNews(lead.industry, 3);
        if (news.length > 0) {
            context = `
INDUSTRY CONTEXT FOR RELEVANCE:
${news.map(n => `• ${n.title}`).join('\n')}
`;
        }
    }

    const prompt = `
Design a ${emailCount}-email drip sequence that tells a STORY and builds trust over time.

SEQUENCE PSYCHOLOGY:
━━━━━━━━━━━━━━━━━━━━━━━
Email 1 (Day 0): Pattern interrupt + establish relevance
Email 2 (Day 3): Provide value without asking for anything  
Email 3 (Day 7): The "breakup email" - create urgency through scarcity

SENDER: ${profile.name} (${profile.industry})
• Value Prop: ${profile.description}
• Voice: ${profile.brandVoice}

TARGET: ${lead.companyName} (${lead.industry})
• Contact: ${lead.contactName || 'Decision Maker'}
• Why They're a Fit: ${lead.summary}
• Size: ${lead.size}

${context}

SEQUENCE REQUIREMENTS:
1. Each email should stand alone but also connect to the narrative
2. Subject lines should vary in style (question, statement, curiosity)
3. Progressively shorter emails (150 → 100 → 50 words)
4. Different CTAs: soft → medium → direct
5. Final email creates FOMO or urgency

Return JSON array:
[
  {
    "subject": "Email 1 subject",
    "body": "Email 1 body",
    "delayDays": 0,
    "purpose": "What this email achieves",
    "cta": "What action we're asking for"
  },
  ...
]`;

    const response = await callLLM(prompt, { type: 'reasoning', temperature: 0.8, maxTokens: 2500 });
    const parsed = parseJSONFromLLM<Array<{ subject: string; body: string; delayDays: number; purpose?: string; cta?: string }>>(response.text);

    if (!parsed || !Array.isArray(parsed)) {
        return [];
    }

    return parsed.map((email, index) => ({
        id: `email-${Date.now()}-${index}`,
        subject: email.subject,
        body: email.body,
        variant: 'A',
        delayDays: email.delayDays,
        sent: false
    }));
}

/**
 * Generate follow-up email based on previous interaction
 */
export async function generateFollowUp(
    original: EmailTemplate,
    lead: Lead,
    interaction: 'opened' | 'clicked' | 'no_response',
    profile: CompanyProfile
): Promise<EmailTemplate> {
    const interactionContext = {
        opened: "They opened but didn't respond - they're interested but not convinced",
        clicked: "They clicked a link - highly engaged, ready for the next step",
        no_response: "No engagement yet - try a completely different angle"
    };

    const prompt = `
Generate a strategic follow-up based on recipient behavior:

PREVIOUS EMAIL:
Subject: ${original.subject}
Body: ${original.body}

BEHAVIOR: ${interaction}
INSIGHT: ${interactionContext[interaction]}

LEAD: ${lead.contactName} at ${lead.companyName}

FOLLOW-UP STRATEGY:
• If opened: Acknowledge their interest, provide more value
• If clicked: Be more direct, they're warm
• If no response: Try pattern interrupt, new angle, or shorter format

Return JSON:
{
  "subject": "Follow-up subject (consider reply threading)",
  "body": "Follow-up email body",
  "strategyUsed": "Why this approach for this behavior"
}`;

    const response = await callLLM(prompt, { type: 'fast', temperature: 0.8 });
    const parsed = parseJSONFromLLM<{ subject: string; body: string }>(response.text);

    return {
        id: `email-${Date.now()}-followup`,
        subject: parsed?.subject || `Re: ${original.subject}`,
        body: parsed?.body || 'Quick follow-up on my previous note.',
        variant: 'A',
        delayDays: interaction === 'clicked' ? 1 : 3,
        sent: false
    };
}

// Create new campaign
export function createCampaign(name: string, leadIds: string[]): EmailCampaign {
    return {
        id: `campaign-${Date.now()}`,
        name,
        status: 'Draft',
        leadIds,
        emails: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// Email preview with variable replacement
export function previewEmail(template: EmailTemplate, lead: Lead, profile: CompanyProfile): { subject: string; body: string } {
    const replacements: Record<string, string> = {
        '{{company}}': lead.companyName,
        '{{contact_name}}': lead.contactName || 'there',
        '{{first_name}}': lead.contactName?.split(' ')[0] || 'there',
        '{{industry}}': lead.industry,
        '{{sender_company}}': profile.name,
        '{{sender_name}}': profile.name
    };

    let subject = template.subject;
    let body = template.body;

    Object.entries(replacements).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key, 'g'), value);
        body = body.replace(new RegExp(key, 'g'), value);
    });

    return { subject, body };
}

// Mock send email (placeholder for SendGrid integration)
export async function sendEmail(
    template: EmailTemplate,
    lead: Lead,
    profile: CompanyProfile
): Promise<{ success: boolean; error?: string }> {
    const SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY;

    if (!SENDGRID_API_KEY) {
        console.log('[Email] SendGrid not configured - simulating send');
        console.log('[Email] To:', lead.contactEmail);
        console.log('[Email] Subject:', template.subject);

        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
    }

    // TODO: Implement actual SendGrid API call
    return { success: true };
}
