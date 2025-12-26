import { CompanyProfile, Lead, LeadSearchCriteria } from '../types';
import { callLLM, parseJSONFromLLM, LLMOptions } from './freeLLMService';
import { searchWeb, researchCompetitors, isWebResearchConfigured } from './webResearchService';
import { getBusinessContext, getLeadsToAvoid, addGeneratedLeads, incrementGeneratedCount, trackAction } from './contextMemoryService';

/**
 * Generate leads with real-time web research enhancement
 */
export async function generateLeads(
    criteria: LeadSearchCriteria,
    profile: CompanyProfile,
    count: number = 10
): Promise<Lead[]> {
    // Step 1: Gather real-time market intelligence
    let webContext = '';
    let competitorInsights = '';

    if (isWebResearchConfigured()) {
        console.log('[Leads] Enriching with web research...');

        // Search for real companies in the target industry/location
        const searchQuery = `${criteria.industry} companies ${criteria.location} ${criteria.companySize} employees`;
        const searchResults = await searchWeb(searchQuery, 10);

        if (searchResults.length > 0) {
            webContext = `
REAL-TIME WEB RESEARCH RESULTS (use these as inspiration for realistic leads):
${searchResults.map((r, i) => `${i + 1}. ${r.title} - ${r.url}
   ${r.snippet}`).join('\n')}
`;
        }

        // Get competitor insights
        const competitors = await researchCompetitors(profile.name, criteria.industry, criteria.location);
        if (competitors.length > 0) {
            competitorInsights = `
COMPETITOR LANDSCAPE:
${competitors.map(c => `- ${c.name}: ${c.website}`).join('\n')}
`;
        }
    }

    // Step 2: Get memory context to avoid duplicates
    const businessContext = getBusinessContext(profile);
    const leadsToAvoid = getLeadsToAvoid();

    // Step 3: Generate leads using enhanced AI reasoning
    const prompt = `
You are an elite B2B lead research specialist with access to current market data. Your task is to generate ${count} highly targeted, REALISTIC business leads.

${businessContext}

THINK CREATIVELY AND STRATEGICALLY:
1. Consider the business synergies between the sender and potential leads
2. Identify companies that would genuinely benefit from collaboration
3. Focus on decision-makers who have authority to engage
4. Prioritize leads with clear pain points that ${profile.name} can solve

SEARCH CRITERIA:
━━━━━━━━━━━━━━━━━━━━━━
• Target Industry: ${criteria.industry}
• Location: ${criteria.location}
• Company Size: ${criteria.companySize}
• Focus Keywords: ${criteria.keywords.length > 0 ? criteria.keywords.join(', ') : 'General'}

${webContext}
${competitorInsights}
${leadsToAvoid}

LEAD GENERATION STRATEGY:
Think about:
- What types of companies need ${profile.industry} services?
- Who are the ideal buyers based on company size and location?
- What signals indicate a company is ready to engage?
- How can we identify decision-makers (CMOs, Marketing Directors, Founders)?


LEAD GENERATION STRATEGY:
Think about:
- What types of companies need ${profile.industry} services?
- Who are the ideal buyers based on company size and location?
- What signals indicate a company is ready to engage?
- How can we identify decision-makers (CMOs, Marketing Directors, Founders)?

Generate ${count} leads as a JSON array. Each lead MUST include:
[
  {
    "companyName": "Actual realistic company name",
    "industry": "Specific sub-industry",
    "location": "City, Country",
    "size": "Employee range",
    "contactEmail": "realistic-format@domain.com",
    "contactName": "Full Name, Title (e.g., Sarah Chen, VP of Marketing)",
    "website": "https://realistic-domain.com",
    "linkedIn": "https://linkedin.com/company/name",
    "summary": "2-3 sentences explaining WHY this is a good lead and the potential value of partnership",
    "outreachPotential": "High/Medium/Low with strategic reasoning"
  }
]

CRITICAL: Make leads feel REAL - use realistic naming conventions, proper email formats, and specific reasons for outreach potential.`;

    const options: LLMOptions = {
        type: 'reasoning',
        systemPrompt: `You are an expert B2B lead researcher with deep knowledge of business development and market intelligence. You think strategically about lead quality, not just quantity. Generate leads that a real sales team would find valuable. Always return valid JSON arrays.`,
        temperature: 0.85,
        maxTokens: 3000
    };

    const response = await callLLM(prompt, options);
    const parsed = parseJSONFromLLM<any[]>(response.text);

    if (!parsed || !Array.isArray(parsed)) {
        console.error('Failed to parse leads from LLM response');
        return [];
    }

    const leads = parsed.map((item, index) => ({
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
        outreachPotential: item.outreachPotential?.split(' ')[0] || 'Medium',
        createdAt: new Date(),
        notes: ''
    }));

    // Track in memory to avoid future duplicates
    addGeneratedLeads(leads);
    incrementGeneratedCount('leads', leads.length);
    trackAction(`Generated ${leads.length} leads for ${criteria.industry}`);

    return leads;
}

/**
 * Research a specific lead for deeper insights
 */
export async function researchLead(lead: Lead): Promise<{
    insights: string;
    recentNews: string[];
    suggestedApproach: string;
}> {
    const webResults = await searchWeb(`${lead.companyName} ${lead.industry} news`, 5);

    const prompt = `
Analyze this potential lead and provide strategic outreach recommendations:

LEAD:
- Company: ${lead.companyName}
- Industry: ${lead.industry}
- Location: ${lead.location}
- Size: ${lead.size}
- Summary: ${lead.summary}

RECENT WEB MENTIONS:
${webResults.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}

Provide:
1. Key insights about the company
2. Potential pain points we could address
3. Recommended outreach approach and talking points

Return JSON:
{
  "insights": "Deep analysis paragraph",
  "recentNews": ["news item 1", "news item 2"],
  "suggestedApproach": "Strategic recommendation for first contact"
}`;

    const response = await callLLM(prompt, { type: 'reasoning', temperature: 0.7 });
    const parsed = parseJSONFromLLM<any>(response.text);

    return {
        insights: parsed?.insights || 'No additional insights available.',
        recentNews: parsed?.recentNews || webResults.slice(0, 3).map(r => r.title),
        suggestedApproach: parsed?.suggestedApproach || 'Personalized outreach recommended.'
    };
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• This tool generates AI-simulated lead data enhanced with public web information
• In production, ensure proper consent before collecting personal data
• Always provide opt-out options in outreach communications
• Data should be stored securely and deleted when no longer needed
• Comply with local data protection regulations (GDPR, CCPA, etc.)
• Web research uses publicly available information only
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
