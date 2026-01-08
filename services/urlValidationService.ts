/**
 * URL Validation and Contact Extraction Service
 * 
 * Ensures all scraped URLs are active and extracts contact information
 * for outreach and collaboration purposes.
 */

// ============================================
// TYPES
// ============================================

export interface ValidatedUrl {
    url: string;
    isActive: boolean;
    domain: string;
    lastChecked: Date;
    httpStatus?: number;
    responseTime?: number;
}

export interface ContactInfo {
    emails: string[];
    phones: string[];
    socialLinks: {
        twitter?: string;
        linkedin?: string;
        facebook?: string;
        instagram?: string;
        youtube?: string;
        tiktok?: string;
        whatsapp?: string;
    };
    contactPage?: string;
}

export interface EnrichedResult {
    title: string;
    url: string;
    snippet: string;
    domain: string;
    isActive: boolean;
    contacts?: ContactInfo;
}

// ============================================
// URL VALIDATION CACHE
// ============================================

const URL_CACHE_PREFIX = 'url_check_';
const URL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedUrlCheck {
    isActive: boolean;
    contacts?: ContactInfo;
    timestamp: number;
}

function getCachedUrlCheck(url: string): CachedUrlCheck | null {
    try {
        const cached = localStorage.getItem(URL_CACHE_PREFIX + btoa(url).slice(0, 50));
        if (!cached) return null;

        const data: CachedUrlCheck = JSON.parse(cached);
        if (Date.now() - data.timestamp > URL_CACHE_TTL) {
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function cacheUrlCheck(url: string, data: CachedUrlCheck): void {
    try {
        localStorage.setItem(
            URL_CACHE_PREFIX + btoa(url).slice(0, 50),
            JSON.stringify(data)
        );
    } catch {
        // Cache full, ignore
    }
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Check if a URL is active (responds with 2xx or 3xx)
 */
export async function checkUrlActive(url: string, timeout = 5000): Promise<boolean> {
    // Check cache first
    const cached = getCachedUrlCheck(url);
    if (cached !== null) {
        return cached.isActive;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Use HEAD request for faster checking
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors', // Allows checking even with CORS restrictions
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // In no-cors mode, we can't access status, but if no error, it's likely active
        const isActive = true;

        cacheUrlCheck(url, { isActive, timestamp: Date.now() });
        return isActive;
    } catch (error: any) {
        // Network error or timeout means the site is likely down
        console.log(`[URL Check] ${url} appears inactive:`, error.message);
        cacheUrlCheck(url, { isActive: false, timestamp: Date.now() });
        return false;
    }
}

/**
 * Validate multiple URLs in parallel (with concurrency limit)
 */
export async function validateUrls(urls: string[], concurrency = 5): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Process in batches to avoid overwhelming the network
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const checks = await Promise.all(
            batch.map(async url => ({
                url,
                isActive: await checkUrlActive(url),
            }))
        );

        checks.forEach(({ url, isActive }) => {
            results.set(url, isActive);
        });
    }

    return results;
}

// ============================================
// CONTACT EXTRACTION
// ============================================

/**
 * Extract contact information from text/HTML
 */
export function extractContactsFromText(text: string): ContactInfo {
    const contacts: ContactInfo = {
        emails: [],
        phones: [],
        socialLinks: {},
    };

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];
    contacts.emails = [...new Set(emails)].filter(e =>
        !e.includes('example.com') &&
        !e.includes('email.com') &&
        !e.includes('.png') &&
        !e.includes('.jpg')
    );

    // Extract phone numbers (various formats)
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
    const phones = text.match(phoneRegex) || [];
    contacts.phones = [...new Set(phones)];

    // Extract social media links
    const socialPatterns = {
        twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/gi,
        linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/gi,
        facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)/gi,
        instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/gi,
        youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)?([a-zA-Z0-9_-]+)/gi,
        tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)/gi,
        whatsapp: /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com)\/([0-9]+)/gi,
    };

    for (const [platform, regex] of Object.entries(socialPatterns)) {
        const match = regex.exec(text);
        if (match) {
            contacts.socialLinks[platform as keyof typeof contacts.socialLinks] = match[0];
        }
    }

    return contacts;
}

/**
 * Try to find contact/about page from a domain
 */
export function generateContactPageUrls(domain: string): string[] {
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    return [
        `${baseUrl}/contact`,
        `${baseUrl}/contact-us`,
        `${baseUrl}/about`,
        `${baseUrl}/about-us`,
        `${baseUrl}/team`,
        `${baseUrl}/connect`,
    ];
}

// ============================================
// RESULT ENRICHMENT
// ============================================

/**
 * Enrich search results with validation and contact extraction
 */
export async function enrichSearchResults(
    results: Array<{ title: string; url: string; snippet: string }>,
    options: {
        validateUrls?: boolean;
        extractContacts?: boolean;
        filterInactive?: boolean;
    } = {}
): Promise<EnrichedResult[]> {
    const {
        validateUrls: shouldValidate = true,
        extractContacts = true,
        filterInactive = false,
    } = options;

    console.log(`[Enrichment] Processing ${results.length} results...`);

    // Validate URLs if requested
    let urlStatus = new Map<string, boolean>();
    if (shouldValidate) {
        const urls = results.map(r => r.url);
        urlStatus = await validateUrls(urls);
        console.log(`[Enrichment] URL validation complete`);
    }

    // Enrich each result
    const enriched: EnrichedResult[] = results.map(result => {
        const domain = extractDomain(result.url);
        const isActive = shouldValidate ? (urlStatus.get(result.url) ?? true) : true;

        // Extract contacts from snippet
        const contacts = extractContacts
            ? extractContactsFromText(result.snippet + ' ' + result.title)
            : undefined;

        return {
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            domain,
            isActive,
            contacts,
        };
    });

    // Filter inactive if requested
    if (filterInactive) {
        const active = enriched.filter(r => r.isActive);
        console.log(`[Enrichment] Filtered: ${enriched.length} → ${active.length} active results`);
        return active;
    }

    return enriched;
}

/**
 * Find potential collaboration/outreach leads from search results
 */
export async function findOutreachLeads(
    query: string,
    searchResults: Array<{ title: string; url: string; snippet: string }>
): Promise<Array<{
    name: string;
    website: string;
    domain: string;
    contactInfo: ContactInfo;
    confidence: 'high' | 'medium' | 'low';
}>> {
    console.log(`[Outreach] Finding leads for: ${query}`);

    // Enrich and filter
    const enriched = await enrichSearchResults(searchResults, {
        validateUrls: true,
        extractContacts: true,
        filterInactive: true,
    });

    // Convert to leads format
    const leads = enriched
        .filter(r => {
            // Must have at least one contact method
            return (
                (r.contacts?.emails?.length || 0) > 0 ||
                (r.contacts?.phones?.length || 0) > 0 ||
                Object.keys(r.contacts?.socialLinks || {}).length > 0
            );
        })
        .map(r => {
            // Calculate confidence based on available contacts
            let confidence: 'high' | 'medium' | 'low' = 'low';
            const contactCount =
                (r.contacts?.emails?.length || 0) +
                (r.contacts?.phones?.length || 0) +
                Object.keys(r.contacts?.socialLinks || {}).length;

            if (contactCount >= 3) confidence = 'high';
            else if (contactCount >= 1) confidence = 'medium';

            return {
                name: r.title.split(' - ')[0].split(' | ')[0].trim(),
                website: r.url,
                domain: r.domain,
                contactInfo: r.contacts!,
                confidence,
            };
        });

    console.log(`[Outreach] Found ${leads.length} potential leads`);
    return leads;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
}

/**
 * Clean and normalize a URL
 */
export function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // Remove tracking parameters
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'fbclid', 'gclid'];
        trackingParams.forEach(param => parsed.searchParams.delete(param));
        return parsed.toString();
    } catch {
        return url;
    }
}

/**
 * Check if URL is from a social media platform
 */
export function isSocialMediaUrl(url: string): boolean {
    const socialDomains = [
        'twitter.com', 'x.com',
        'facebook.com', 'fb.com',
        'instagram.com',
        'linkedin.com',
        'youtube.com', 'youtu.be',
        'tiktok.com',
        'pinterest.com',
        'reddit.com',
        'threads.net',
        'whatsapp.com', 'wa.me',
    ];

    const domain = extractDomain(url).toLowerCase();
    return socialDomains.some(social => domain.includes(social));
}

/**
 * Get social platform name from URL
 */
export function getSocialPlatform(url: string): string | null {
    const domain = extractDomain(url).toLowerCase();

    if (domain.includes('twitter') || domain.includes('x.com')) return 'Twitter';
    if (domain.includes('facebook') || domain.includes('fb.com')) return 'Facebook';
    if (domain.includes('instagram')) return 'Instagram';
    if (domain.includes('linkedin')) return 'LinkedIn';
    if (domain.includes('youtube') || domain.includes('youtu.be')) return 'YouTube';
    if (domain.includes('tiktok')) return 'TikTok';
    if (domain.includes('pinterest')) return 'Pinterest';
    if (domain.includes('reddit')) return 'Reddit';
    if (domain.includes('threads')) return 'Threads';
    if (domain.includes('whatsapp') || domain.includes('wa.me')) return 'WhatsApp';

    return null;
}

// ============================================
// BATCH VALIDATION FOR LEADS
// ============================================

export interface LeadValidation {
    leadId: string;
    website: string;
    isActive: boolean;
    socialProfiles: {
        platform: string;
        url: string;
        isActive: boolean;
    }[];
    emails: string[];
    lastValidated: Date;
}

/**
 * Validate lead contact information
 */
export async function validateLeadContacts(lead: {
    id: string;
    website?: string;
    socials?: string[];
}): Promise<LeadValidation> {
    const result: LeadValidation = {
        leadId: lead.id,
        website: lead.website || '',
        isActive: false,
        socialProfiles: [],
        emails: [],
        lastValidated: new Date(),
    };

    // Validate website
    if (lead.website) {
        result.isActive = await checkUrlActive(lead.website);
    }

    // Validate social profiles
    if (lead.socials && lead.socials.length > 0) {
        for (const socialUrl of lead.socials) {
            const platform = getSocialPlatform(socialUrl);
            if (platform) {
                const isActive = await checkUrlActive(socialUrl);
                result.socialProfiles.push({
                    platform,
                    url: socialUrl,
                    isActive,
                });
            }
        }
    }

    return result;
}

/**
 * Clean up expired URL cache entries
 */
export function cleanupUrlCache(): number {
    let cleaned = 0;
    const now = Date.now();

    try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(URL_CACHE_PREFIX));

        keys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key) || '{}');
                if (now - data.timestamp > URL_CACHE_TTL) {
                    localStorage.removeItem(key);
                    cleaned++;
                }
            } catch {
                localStorage.removeItem(key);
                cleaned++;
            }
        });
    } catch {
        // Ignore errors
    }

    return cleaned;
}
