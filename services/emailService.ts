import { CompanyProfile, Lead, EmailCampaign, EmailTemplate } from '../types';
import { callLLM, parseJSONFromLLM, LLMOptions } from './freeLLMService';

// Generate personalized email for a lead
export async function generateLeadEmail(
    lead: Lead,
    profile: CompanyProfile,
    objective: string = 'collaboration'
): Promise<EmailTemplate> {
    const prompt = `
You are an expert B2B email copywriter. Write a personalized outreach email for:

SENDER COMPANY:
- Name: ${profile.name}
- Industry: ${profile.industry}
- Description: ${profile.description}
- Brand Voice: ${profile.brandVoice}

TARGET LEAD:
- Company: ${lead.companyName}
- Industry: ${lead.industry}
- Contact: ${lead.contactName || 'the team'}
- Summary: ${lead.summary}

OBJECTIVE: ${objective}

Generate a professional, personalized email that:
1. Has an attention-grabbing subject line
2. References something specific about their company
3. Clearly states the value proposition
4. Has a clear call-to-action
5. Is concise (under 200 words)

Return JSON with format:
{
  "subject": "Email subject line",
  "body": "Full email body with proper formatting"
}`;

    const options: LLMOptions = {
        type: 'reasoning',
        systemPrompt: 'You are an expert B2B email copywriter. Write compelling, personalized outreach emails.',
        temperature: 0.8
    };

    const response = await callLLM(prompt, options);
    const parsed = parseJSONFromLLM<{ subject: string; body: string }>(response.text);

    return {
        id: `email-${Date.now()}`,
        subject: parsed?.subject || 'Partnership Opportunity',
        body: parsed?.body || 'Unable to generate email content.',
        variant: 'A',
        sent: false
    };
}

// Generate A/B variant of an email
export async function generateEmailVariant(
    original: EmailTemplate,
    profile: CompanyProfile
): Promise<EmailTemplate> {
    const prompt = `
Create an A/B test variant of this email. Keep the same general message but change:
- Subject line approach (different hook)
- Opening line
- Call-to-action style

ORIGINAL EMAIL:
Subject: ${original.subject}
Body: ${original.body}

BRAND VOICE: ${profile.brandVoice}

Return JSON with format:
{
  "subject": "New subject line",
  "body": "New email body"
}`;

    const response = await callLLM(prompt, { type: 'fast', temperature: 0.9 });
    const parsed = parseJSONFromLLM<{ subject: string; body: string }>(response.text);

    return {
        id: `email-${Date.now()}-B`,
        subject: parsed?.subject || `RE: ${original.subject}`,
        body: parsed?.body || original.body,
        variant: 'B',
        sent: false
    };
}

// Create drip sequence
export async function generateDripSequence(
    lead: Lead,
    profile: CompanyProfile,
    emailCount: number = 3
): Promise<EmailTemplate[]> {
    const prompt = `
Create a ${emailCount}-email drip sequence for B2B outreach:

SENDER: ${profile.name} (${profile.industry})
TARGET: ${lead.companyName} (${lead.industry})
CONTACT: ${lead.contactName || 'the team'}

EMAIL SEQUENCE:
1. Initial outreach (Day 0)
2. Follow-up with value proposition (Day 3)
3. Final check-in with urgency (Day 7)

Each email should:
- Build on the previous without repeating
- Be progressively shorter
- Have unique subject lines
- Include clear CTAs

Return JSON array:
[
  { "subject": "...", "body": "...", "delayDays": 0 },
  { "subject": "...", "body": "...", "delayDays": 3 },
  { "subject": "...", "body": "...", "delayDays": 7 }
]`;

    const response = await callLLM(prompt, { type: 'reasoning', temperature: 0.7 });
    const parsed = parseJSONFromLLM<Array<{ subject: string; body: string; delayDays: number }>>(response.text);

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
    // In production, integrate with SendGrid API
    const SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY;

    if (!SENDGRID_API_KEY) {
        console.log('[Email] SendGrid not configured - simulating send');
        console.log('[Email] To:', lead.contactEmail);
        console.log('[Email] Subject:', template.subject);

        // Simulate send delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
    }

    // TODO: Implement actual SendGrid API call
    // const { subject, body } = previewEmail(template, lead, profile);
    // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {...});

    return { success: true };
}
