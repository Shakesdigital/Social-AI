import { CompanyProfile, Lead, LeadSearchCriteria } from '../types';
import { callLLM, parseJSONFromLLM, LLMOptions } from './freeLLMService';

// Generate leads based on search criteria
export async function generateLeads(
    criteria: LeadSearchCriteria,
    profile: CompanyProfile,
    count: number = 10
): Promise<Lead[]> {
    const prompt = `
You are a B2B lead research specialist. Generate ${count} realistic potential business leads for outreach based on:

COMPANY SEEKING LEADS:
- Name: ${profile.name}
- Industry: ${profile.industry}
- Description: ${profile.description}
- Goals: ${profile.goals}

SEARCH CRITERIA:
- Target Industry: ${criteria.industry}
- Location: ${criteria.location}
- Company Size: ${criteria.companySize}
- Keywords: ${criteria.keywords.join(', ')}

Generate leads that would be good collaboration/marketing partners. Return a JSON array with this structure:
[
  {
    "companyName": "Company Name",
    "industry": "Industry",
    "location": "City, Country",
    "size": "10-50 employees",
    "contactEmail": "contact@company.com",
    "contactName": "John Doe, Marketing Director",
    "website": "https://company.com",
    "linkedIn": "https://linkedin.com/company/...",
    "summary": "Brief description of the company and why they're a good lead",
    "outreachPotential": "High" | "Medium" | "Low"
  }
]

Make the leads realistic and relevant. Return ONLY valid JSON.`;

    const options: LLMOptions = {
        type: 'reasoning',
        systemPrompt: 'You are a B2B lead research specialist. Always return valid JSON arrays.',
        temperature: 0.8
    };

    const response = await callLLM(prompt, options);
    const parsed = parseJSONFromLLM<any[]>(response.text);

    if (!parsed || !Array.isArray(parsed)) {
        console.error('Failed to parse leads from LLM response');
        return [];
    }

    return parsed.map((item, index) => ({
        id: `lead-${Date.now()}-${index}`,
        companyName: item.companyName || 'Unknown Company',
        industry: item.industry || criteria.industry,
        location: item.location || criteria.location,
        size: item.size || criteria.companySize,
        contactEmail: item.contactEmail,
        contactName: item.contactName,
        website: item.website,
        linkedIn: item.linkedIn,
        summary: item.summary || '',
        outreachPotential: item.outreachPotential || 'Medium',
        createdAt: new Date(),
        notes: ''
    }));
}

// Export leads to CSV format
export function exportLeadsToCSV(leads: Lead[]): string {
    const headers = [
        'Company Name', 'Industry', 'Location', 'Size',
        'Contact Email', 'Contact Name', 'Website', 'LinkedIn',
        'Summary', 'Outreach Potential', 'Created At'
    ];

    const rows = leads.map(lead => [
        lead.companyName,
        lead.industry,
        lead.location,
        lead.size,
        lead.contactEmail || '',
        lead.contactName || '',
        lead.website || '',
        lead.linkedIn || '',
        `"${(lead.summary || '').replace(/"/g, '""')}"`,
        lead.outreachPotential,
        lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Download CSV file
export function downloadCSV(leads: Lead[], filename: string = 'leads.csv'): void {
    const csv = exportLeadsToCSV(leads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

// GDPR compliance check
export function getGDPRDisclaimer(): string {
    return `
GDPR & Privacy Compliance Notice:
- This tool generates simulated lead data for demonstration purposes
- In production, ensure you have proper consent before collecting personal data
- Always provide opt-out options in outreach communications
- Data should be stored securely and deleted when no longer needed
- Comply with local data protection regulations (GDPR, CCPA, etc.)
  `.trim();
}

// Calculate lead score based on criteria match
export function calculateLeadScore(lead: Lead, criteria: LeadSearchCriteria): number {
    let score = 50; // Base score

    if (lead.industry.toLowerCase().includes(criteria.industry.toLowerCase())) score += 15;
    if (lead.location.toLowerCase().includes(criteria.location.toLowerCase())) score += 15;
    if (lead.contactEmail) score += 10;
    if (lead.linkedIn) score += 5;
    if (lead.outreachPotential === 'High') score += 15;
    else if (lead.outreachPotential === 'Medium') score += 10;

    return Math.min(100, score);
}
