import { CompanyProfile, Lead, LeadSearchCriteria } from '../types';
import { callLLM, parseJSONFromLLM, LLMOptions } from './freeLLMService';
import { searchWeb, searchWebValidated, searchForOutreach, researchCompetitors, isWebResearchConfigured } from './webResearchService';
import { getBusinessContext, getLeadsToAvoid, addGeneratedLeads, incrementGeneratedCount, trackAction } from './contextMemoryService';
import { validateUrls, checkUrlActive } from './urlValidationService';

/**
 * Generate leads with real-time web research enhancement
 * Now includes URL validation and real contact extraction
 */
export async function generateLeads(
    criteria: LeadSearchCriteria,
    profile: CompanyProfile,
    count: number = 10
): Promise<Lead[]> {
    // Step 1: Gather real-time market intelligence with verified contacts
    let webContext = '';
    let competitorInsights = '';
    let verifiedLeads = '';
    let outreachLeads: Awaited<ReturnType<typeof searchForOutreach>> = [];

    if (isWebResearchConfigured()) {
        console.log('[Leads] Enriching with validated web research...');

        // Search for real companies with verified contact info
        const searchQuery = `${criteria.industry} companies ${criteria.location} ${criteria.companySize} employees`;
        outreachLeads = await searchForOutreach(searchQuery, 8);

        if (outreachLeads.length > 0) {
            verifiedLeads = `
VERIFIED LEADS FROM WEB RESEARCH (with active contact info):
${outreachLeads.map((l, i) => `${i + 1}. ${l.name}
   Website: ${l.website} (Verified Active ✓)
   ${l.contactInfo.emails?.length ? `Emails: ${l.contactInfo.emails.join(', ')}` : ''}
   ${l.contactInfo.phones?.length ? `Phones: ${l.contactInfo.phones.join(', ')}` : ''}
   ${Object.keys(l.contactInfo.socialLinks || {}).length ? `Social: ${Object.entries(l.contactInfo.socialLinks).filter(([_, v]) => v).map(([k, v]) => `${k}`).join(', ')}` : ''}
   Confidence: ${l.confidence}`).join('\n')}
`;
        }

        // Also get general search results with validation
        const searchResults = await searchWebValidated(searchQuery, 10, {
            validateUrls: true,
            extractContacts: true,
            filterInactive: true, // Only active websites
        });

        if (searchResults.length > 0) {
            webContext = `
WEB RESEARCH RESULTS (Verified Active Sources):
${searchResults.map((r, i) => `${i + 1}. ${r.title} - ${r.url} [${r.isActive ? 'Active ✓' : 'Unknown'}]
   ${r.snippet}${r.contacts?.emails?.length ? `\n   Contact: ${r.contacts.emails[0]}` : ''}`).join('\n')}
`;
        }

        // Get competitor insights (already uses validated search)
        const competitors = await researchCompetitors(profile.name, criteria.industry, criteria.location);
        if (competitors.length > 0) {
            competitorInsights = `
COMPETITOR LANDSCAPE (with contact info):
${competitors.map(c => `- ${c.name}: ${c.website}${c.isActive ? ' ✓' : ''}${c.contactInfo?.emails?.[0] ? ` - ${c.contactInfo.emails[0]}` : ''}`).join('\n')}
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

${verifiedLeads}
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

Generate ${count} leads as a JSON array. Each lead MUST include multiple contact methods:
[
  {
    "companyName": "Actual realistic company name",
    "industry": "Specific sub-industry",
    "location": "City, Country",
    "size": "Employee range",
    "contactEmail": "realistic-format@domain.com",
    "contactName": "Full Name, Title (e.g., Sarah Chen, VP of Marketing)",
    "website": "https://actual-working-domain.com (MUST be a real, active domain)",
    "linkedIn": "https://linkedin.com/company/actual-company-name (MUST be real LinkedIn URL)",
    "twitter": "https://twitter.com/companyhandle (optional)",
    "facebook": "https://facebook.com/companypage (optional)",
    "phone": "+1-XXX-XXX-XXXX (optional)",
    "summary": "2-3 sentences explaining WHY this is a good lead and the potential value of partnership",
    "outreachPotential": "High/Medium/Low with strategic reasoning"
  }
]

CRITICAL REQUIREMENTS:
1. ONLY use REAL, ACTIVE websites - NO fake domains like example.com, company.com, or generic names
2. Include REAL LinkedIn company page URLs when possible
3. If you're not sure a website exists, use the LinkedIn URL as primary contact
4. Make leads feel REAL - use realistic naming conventions, proper email formats, and specific reasons for outreach potential.`;

    const options: LLMOptions = {
        type: 'reasoning',
        systemPrompt: `You are a Senior B2B Lead Research Specialist with 10+ years of experience building high-quality sales pipelines for growth companies.

YOUR EXPERTISE:
• Market Intelligence - Identifying high-potential prospects using data-driven signals
• Ideal Customer Profiling - Defining and finding companies that match the ICP
• Decision-Maker Identification - Finding the right contacts with buying authority
• Qualification Frameworks - BANT (Budget, Authority, Need, Timeline), MEDDIC, SPIN

YOUR APPROACH:
• Quality over quantity - Every lead should be worth pursuing
• Strategic targeting - Focus on companies with clear buying signals
• Research depth - Understand why each lead is a good fit
• Personalization angles - Identify specific outreach hooks for each lead
• Realistic data - Generate leads that feel real and actionable

QUALIFICATION CRITERIA YOU APPLY:
• Does this company have the problem we solve?
• Do they have budget and authority to buy?
• Is there urgency or a triggering event?
• Can we identify the right decision-maker?
• Is there a logical partnership or collaboration angle?

Always return valid JSON arrays with realistic, actionable lead data.`,
        temperature: 0.85,
        maxTokens: 3000
    };

    const response = await callLLM(prompt, options);
    const parsed = parseJSONFromLLM<any[]>(response.text);

    if (!parsed || !Array.isArray(parsed)) {
        console.error('Failed to parse leads from LLM response');
        return [];
    }

    let leads: Lead[] = parsed.map((item, index) => ({
        id: `lead-${Date.now()}-${index}`,
        companyName: item.companyName || 'Unknown Company',
        industry: item.industry || criteria.industry,
        location: item.location || criteria.location,
        size: item.size || criteria.companySize,
        contactEmail: item.contactEmail,
        contactName: item.contactName,
        website: cleanUrl(item.website),
        linkedIn: cleanUrl(item.linkedIn),
        twitter: cleanUrl(item.twitter),
        facebook: cleanUrl(item.facebook),
        phone: item.phone,
        summary: item.summary || '',
        outreachPotential: item.outreachPotential?.split(' ')[0] || 'Medium',
        createdAt: new Date(),
        notes: '',
        isVerified: false // Will be updated after validation
    }));

    // Helper function to clean URLs
    function cleanUrl(url: string | undefined): string | undefined {
        if (!url) return undefined;
        // Remove description text like "(MUST be a real...)"
        const cleaned = url.split('(')[0].trim();
        if (cleaned.startsWith('http')) return cleaned;
        return undefined;
    }

    // Step 4: First, try to create leads directly from web research results
    // These are REAL companies from actual search results
    const webResearchLeads: Lead[] = [];

    if (isWebResearchConfigured() && outreachLeads.length > 0) {
        console.log('[Leads] Creating leads from verified web research results...');

        for (const outreach of outreachLeads) {
            webResearchLeads.push({
                id: `lead-${Date.now()}-web-${webResearchLeads.length}`,
                companyName: outreach.name,
                industry: criteria.industry,
                location: criteria.location,
                size: criteria.companySize,
                contactEmail: outreach.contactInfo.emails?.[0],
                contactName: undefined,
                website: outreach.website,
                linkedIn: outreach.contactInfo.socialLinks?.linkedin,
                twitter: outreach.contactInfo.socialLinks?.twitter,
                facebook: outreach.contactInfo.socialLinks?.facebook,
                phone: outreach.contactInfo.phones?.[0],
                summary: `Verified lead from web research. Contact confidence: ${outreach.confidence}.`,
                outreachPotential: outreach.confidence === 'high' ? 'High' : outreach.confidence === 'medium' ? 'Medium' : 'Low',
                createdAt: new Date(),
                notes: '✓ Real company from web search',
                isVerified: true,
                hasBackupContact: true,
            });
        }

        console.log(`[Leads] Created ${webResearchLeads.length} verified leads from web research`);
    }

    // If we have enough verified leads from web research, use those
    if (webResearchLeads.length >= count * 0.7) { // At least 70% from web research
        console.log('[Leads] Using primarily web research leads (verified real companies)');
        addGeneratedLeads(webResearchLeads);
        incrementGeneratedCount('leads', webResearchLeads.length);
        trackAction(`Generated ${webResearchLeads.length} verified web research leads for ${criteria.industry}`);
        return webResearchLeads.slice(0, count);
    }

    // Step 5: For AI-generated leads, be less strict - mark as unverified but still useful
    console.log('[Leads] Adding AI-suggested leads (marked as unverified suggestions)...');

    // Mark AI leads as suggestions/unverified
    leads = leads.map(lead => ({
        ...lead,
        notes: '💡 AI-suggested lead - verify before outreach',
        isVerified: false,
        hasBackupContact: false,
    }));

    // Combine: web research leads (verified) + AI leads (suggestions)
    const combinedLeads = [...webResearchLeads, ...leads].slice(0, count);

    // Only do light validation - check URL format, not actual connectivity
    const finalLeads = combinedLeads.map(lead => {
        const hasValidWebsite = lead.website && lead.website.startsWith('http');
        const hasValidLinkedIn = lead.linkedIn && lead.linkedIn.includes('linkedin.com');
        const hasEmail = !!lead.contactEmail;

        return {
            ...lead,
            hasBackupContact: hasValidWebsite || hasValidLinkedIn || hasEmail,
        };
    });

    // Track in memory to avoid future duplicates
    addGeneratedLeads(finalLeads);
    incrementGeneratedCount('leads', finalLeads.length);
    trackAction(`Generated ${finalLeads.length} leads (${webResearchLeads.length} verified, ${leads.length} AI-suggested) for ${criteria.industry}`);

    return finalLeads;
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
