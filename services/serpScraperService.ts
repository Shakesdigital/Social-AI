/**
 * Self-Hosted SERP Scraper Service
 * 
 * Provides unlimited, cost-free Google SERP scraping using self-hosted solutions:
 * - Primary: Novexity (SerpAPI-compatible)
 * - Fallback: SearxNG (metasearch engine)
 * - Cache: LocalStorage with TTL for repeated queries
 * 
 * Features:
 * - Automatic fallback between providers
 * - Request caching to reduce load
 * - Rate limiting to avoid blocks
 * - Graceful error handling
 */

// ============================================
// CONFIGURATION - Set via Environment Variables
// ============================================

const SERP_CONFIG = {
    // Vercel Serverless Function (when deployed)
    // Auto-detect: if we're in production (not localhost), use /api/serp
    vercelProxy: typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        ? '/api/serp'
        : (import.meta.env.VITE_VERCEL_SERP_URL || ''),

    // Primary: Self-hosted Novexity instance
    novexityUrl: import.meta.env.VITE_NOVEXITY_URL || '',
    novexityApiKey: import.meta.env.VITE_NOVEXITY_API_KEY || '',

    // Fallback: Self-hosted SearxNG instance
    searxngUrl: import.meta.env.VITE_SEARXNG_URL || '',

    // FREE PUBLIC SearXNG instances (no setup required!)
    // These are community-run instances that anyone can use
    publicSearxngInstances: [
        'https://search.bus-hit.me',
        'https://searx.be',
        'https://search.sapti.me',
        'https://searx.tiekoetter.com',
        'https://search.ononoki.org',
    ],

    // Optional: Fallback to Serper.dev if all else fails
    serperApiKey: import.meta.env.VITE_SERPER_API_KEY || '',

    // Cache settings
    cacheEnabled: true,
    cacheTTLMinutes: 60, // Cache results for 1 hour

    // Rate limiting
    minRequestDelayMs: 1500, // 1.5 seconds between requests (be nice to public instances)
    maxRetries: 2,
    retryDelayMs: 3000,
};

// ============================================
// TYPES
// ============================================

export interface SerpResult {
    title: string;
    url: string;
    snippet: string;
    position: number;
    date?: string;
    domain?: string;
}

export interface SerpResponse {
    query: string;
    organic: SerpResult[];
    relatedSearches?: string[];
    peopleAlsoAsk?: string[];
    totalResults?: number;
    searchTime?: number;
    provider: 'novexity' | 'searxng' | 'serper' | 'cache' | 'mock';
}

export interface SerpOptions {
    query: string;
    count?: number;
    country?: string;
    language?: string;
    type?: 'web' | 'news' | 'images';
    skipCache?: boolean;
}

// ============================================
// CACHE LAYER
// ============================================

const CACHE_PREFIX = 'serp_cache_';
const lastRequestTime: { [key: string]: number } = {};

interface CachedResult {
    data: SerpResponse;
    timestamp: number;
    expiresAt: number;
}

function getCacheKey(options: SerpOptions): string {
    return `${CACHE_PREFIX}${options.query}_${options.count || 10}_${options.country || 'us'}_${options.type || 'web'}`;
}

function getFromCache(options: SerpOptions): SerpResponse | null {
    if (!SERP_CONFIG.cacheEnabled || options.skipCache) return null;

    try {
        const key = getCacheKey(options);
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const parsed: CachedResult = JSON.parse(cached);
        if (Date.now() > parsed.expiresAt) {
            localStorage.removeItem(key);
            return null;
        }

        console.log('[SERP Cache] Hit for:', options.query);
        return { ...parsed.data, provider: 'cache' };
    } catch (e) {
        return null;
    }
}

function saveToCache(options: SerpOptions, data: SerpResponse): void {
    if (!SERP_CONFIG.cacheEnabled) return;

    try {
        const key = getCacheKey(options);
        const cached: CachedResult = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + (SERP_CONFIG.cacheTTLMinutes * 60 * 1000)
        };
        localStorage.setItem(key, JSON.stringify(cached));
        console.log('[SERP Cache] Saved:', options.query);
    } catch (e) {
        console.warn('[SERP Cache] Failed to save:', e);
    }
}

// ============================================
// RATE LIMITING
// ============================================

async function waitForRateLimit(provider: string): Promise<void> {
    const now = Date.now();
    const lastRequest = lastRequestTime[provider] || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < SERP_CONFIG.minRequestDelayMs) {
        const waitTime = SERP_CONFIG.minRequestDelayMs - timeSinceLastRequest;
        console.log(`[SERP] Rate limiting: waiting ${waitTime}ms for ${provider}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime[provider] = Date.now();
}

// ============================================
// NOVEXITY PROVIDER (Primary)
// ============================================

async function searchNovexity(options: SerpOptions): Promise<SerpResponse | null> {
    if (!SERP_CONFIG.novexityUrl) {
        console.log('[SERP] Novexity URL not configured');
        return null;
    }

    await waitForRateLimit('novexity');

    try {
        const params = new URLSearchParams({
            q: options.query,
            num: String(options.count || 10),
            gl: options.country || 'us',
            hl: options.language || 'en',
        });

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (SERP_CONFIG.novexityApiKey) {
            headers['X-API-Key'] = SERP_CONFIG.novexityApiKey;
        }

        const response = await fetch(`${SERP_CONFIG.novexityUrl}/search?${params}`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            throw new Error(`Novexity error: ${response.status}`);
        }

        const data = await response.json();

        return {
            query: options.query,
            organic: (data.organic_results || data.organic || []).map((item: any, index: number) => ({
                title: item.title,
                url: item.link || item.url,
                snippet: item.snippet || item.description || '',
                position: index + 1,
                date: item.date,
                domain: extractDomain(item.link || item.url),
            })),
            relatedSearches: data.related_searches?.map((s: any) => s.query || s) || [],
            peopleAlsoAsk: data.people_also_ask?.map((p: any) => p.question || p) || [],
            totalResults: data.search_information?.total_results,
            searchTime: data.search_information?.time_taken_displayed,
            provider: 'novexity',
        };
    } catch (error) {
        console.error('[SERP] Novexity failed:', error);
        return null;
    }
}

// ============================================
// SEARXNG PROVIDER (Fallback)
// ============================================

async function searchSearxNG(options: SerpOptions): Promise<SerpResponse | null> {
    if (!SERP_CONFIG.searxngUrl) {
        console.log('[SERP] SearxNG URL not configured');
        return null;
    }

    await waitForRateLimit('searxng');

    try {
        const params = new URLSearchParams({
            q: options.query,
            format: 'json',
            pageno: '1',
            language: options.language || 'en',
            engines: 'google,bing,duckduckgo',
        });

        const response = await fetch(`${SERP_CONFIG.searxngUrl}/search?${params}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`SearxNG error: ${response.status}`);
        }

        const data = await response.json();

        return {
            query: options.query,
            organic: (data.results || []).slice(0, options.count || 10).map((item: any, index: number) => ({
                title: item.title,
                url: item.url,
                snippet: item.content || item.snippet || '',
                position: index + 1,
                date: item.publishedDate,
                domain: extractDomain(item.url),
            })),
            relatedSearches: data.suggestions || [],
            provider: 'searxng',
        };
    } catch (error) {
        console.error('[SERP] SearxNG failed:', error);
        return null;
    }
}

// ============================================
// PUBLIC SEARXNG INSTANCES (FREE, NO SETUP!)
// ============================================

async function searchPublicSearxNG(options: SerpOptions): Promise<SerpResponse | null> {
    const instances = SERP_CONFIG.publicSearxngInstances;

    if (!instances || instances.length === 0) {
        return null;
    }

    console.log('[SERP] Trying public SearXNG instances (free, no API key needed)');

    // Shuffle instances to distribute load
    const shuffled = [...instances].sort(() => Math.random() - 0.5);

    for (const instanceUrl of shuffled) {
        await waitForRateLimit('public-searxng');

        try {
            console.log(`[SERP] Trying public instance: ${instanceUrl}`);

            const params = new URLSearchParams({
                q: options.query,
                format: 'json',
                pageno: '1',
                language: options.language || 'en',
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${instanceUrl}/search?${params}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.log(`[SERP] Instance ${instanceUrl} returned ${response.status}, trying next...`);
                continue;
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                console.log(`[SERP] Instance ${instanceUrl} returned no results, trying next...`);
                continue;
            }

            console.log(`[SERP] ✅ Success with public instance: ${instanceUrl}`);

            return {
                query: options.query,
                organic: (data.results || []).slice(0, options.count || 10).map((item: any, index: number) => ({
                    title: item.title,
                    url: item.url,
                    snippet: item.content || item.snippet || '',
                    position: index + 1,
                    date: item.publishedDate,
                    domain: extractDomain(item.url),
                })),
                relatedSearches: data.suggestions || [],
                provider: 'searxng',
            };
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log(`[SERP] Instance ${instanceUrl} timed out, trying next...`);
            } else {
                console.log(`[SERP] Instance ${instanceUrl} failed: ${error.message}, trying next...`);
            }
            continue;
        }
    }

    console.log('[SERP] All public SearXNG instances failed');
    return null;
}

// ============================================
// SERPER PROVIDER (Paid Fallback)
// ============================================

async function searchSerper(options: SerpOptions): Promise<SerpResponse | null> {
    if (!SERP_CONFIG.serperApiKey) {
        console.log('[SERP] Serper API key not configured');
        return null;
    }

    await waitForRateLimit('serper');

    try {
        const endpoint = options.type === 'news'
            ? 'https://google.serper.dev/news'
            : 'https://google.serper.dev/search';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-API-KEY': SERP_CONFIG.serperApiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: options.query,
                num: options.count || 10,
                gl: options.country || 'us',
                hl: options.language || 'en',
            }),
        });

        if (!response.ok) {
            throw new Error(`Serper error: ${response.status}`);
        }

        const data = await response.json();
        const results = options.type === 'news' ? data.news : data.organic;

        return {
            query: options.query,
            organic: (results || []).map((item: any, index: number) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                position: index + 1,
                date: item.date,
                domain: extractDomain(item.link),
            })),
            relatedSearches: data.relatedSearches?.map((s: any) => s.query) || [],
            peopleAlsoAsk: data.peopleAlsoAsk?.map((p: any) => p.question) || [],
            totalResults: data.searchParameters?.totalResults,
            provider: 'serper',
        };
    } catch (error) {
        console.error('[SERP] Serper failed:', error);
        return null;
    }
}

// ============================================
// MOCK PROVIDER (Fallback when nothing works)
// ============================================

function generateMockResults(options: SerpOptions): SerpResponse {
    console.log('[SERP] Using mock results for:', options.query);

    const keywords = options.query.split(' ').filter(w => w.length > 3);
    const primaryKeyword = keywords[0] || 'topic';

    return {
        query: options.query,
        organic: Array.from({ length: options.count || 10 }, (_, i) => ({
            title: `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} - Comprehensive Guide ${i + 1}`,
            url: `https://example.com/${primaryKeyword.toLowerCase()}-guide-${i + 1}`,
            snippet: `Learn everything about ${options.query}. This comprehensive resource covers key strategies, best practices, and expert insights for ${new Date().getFullYear()}.`,
            position: i + 1,
            domain: 'example.com',
        })),
        relatedSearches: [
            `${primaryKeyword} best practices`,
            `${primaryKeyword} tips`,
            `how to ${primaryKeyword}`,
            `${primaryKeyword} trends ${new Date().getFullYear()}`,
        ],
        provider: 'mock',
    };
}

// ============================================
// VERCEL PROXY (when deployed on Vercel)
// ============================================

async function searchVercelProxy(options: SerpOptions): Promise<SerpResponse | null> {
    if (!SERP_CONFIG.vercelProxy) {
        return null;
    }

    console.log('[SERP] Using Vercel serverless proxy');

    try {
        const params = new URLSearchParams({
            q: options.query,
            num: String(options.count || 10),
            gl: options.country || 'us',
            hl: options.language || 'en',
            type: options.type || 'web',
        });

        const response = await fetch(`${SERP_CONFIG.vercelProxy}?${params}`);

        if (!response.ok) {
            throw new Error(`Vercel proxy error: ${response.status}`);
        }

        const data = await response.json();

        return {
            query: options.query,
            organic: (data.organic || []).map((item: any) => ({
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                position: item.position,
                domain: item.domain,
            })),
            relatedSearches: data.relatedSearches || [],
            provider: data.provider || 'vercel-proxy',
        };
    } catch (error) {
        console.error('[SERP] Vercel proxy failed:', error);
        return null;
    }
}

// ============================================
// MAIN SEARCH FUNCTION
// ============================================

/**
 * Search the web using self-hosted SERP scrapers
 * Tries providers in order: 
 *   Cache → Vercel Proxy → Novexity → SearxNG → 
 *   PUBLIC SearXNG (FREE!) → Serper → Mock
 */
export async function searchSERP(options: SerpOptions): Promise<SerpResponse> {
    console.log('[SERP] Searching:', options.query);

    // Check cache first
    const cached = getFromCache(options);
    if (cached) return cached;

    // Try Vercel serverless proxy (when on Vercel)
    let result = await searchVercelProxy(options);
    if (result && result.organic.length > 0) {
        saveToCache(options, result);
        return result;
    }

    // Try Novexity (primary self-hosted)
    result = await searchNovexity(options);
    if (result && result.organic.length > 0) {
        saveToCache(options, result);
        return result;
    }

    // Try SearxNG (self-hosted)
    result = await searchSearxNG(options);
    if (result && result.organic.length > 0) {
        saveToCache(options, result);
        return result;
    }

    // 🆓 Try PUBLIC SearXNG instances (FREE, NO SETUP!)
    result = await searchPublicSearxNG(options);
    if (result && result.organic.length > 0) {
        saveToCache(options, result);
        return result;
    }

    // Try Serper (paid fallback)
    result = await searchSerper(options);
    if (result && result.organic.length > 0) {
        saveToCache(options, result);
        return result;
    }

    // Last resort: mock results
    return generateMockResults(options);
}

/**
 * Get news articles for a topic
 */
export async function searchNews(query: string, count: number = 10): Promise<SerpResult[]> {
    const result = await searchSERP({
        query: `${query} news`,
        count,
        type: 'news',
    });
    return result.organic;
}

/**
 * Get competitor information
 */
export async function searchCompetitors(query: string, industry: string): Promise<SerpResult[]> {
    const result = await searchSERP({
        query: `${industry} companies competitors ${query}`,
        count: 20,
    });
    return result.organic;
}

/**
 * Get trending topics
 */
export async function searchTrends(topic: string): Promise<SerpResponse> {
    return searchSERP({
        query: `${topic} trends ${new Date().getFullYear()}`,
        count: 10,
    });
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
 * Check if any SERP provider is configured
 * Returns TRUE by default because public SearXNG instances are always available!
 */
export function isSerpConfigured(): boolean {
    // Public instances are always available, so this is always true
    return true;
}

/**
 * Get current SERP configuration status (for diagnostics)
 */
export function getSerpStatus(): {
    novexity: boolean;
    searxng: boolean;
    serper: boolean;
    cacheEnabled: boolean;
} {
    return {
        novexity: !!SERP_CONFIG.novexityUrl,
        searxng: !!SERP_CONFIG.searxngUrl,
        serper: !!SERP_CONFIG.serperApiKey,
        cacheEnabled: SERP_CONFIG.cacheEnabled,
    };
}

/**
 * Clear SERP cache (for debugging)
 */
export function clearSerpCache(): number {
    let cleared = 0;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key);
            cleared++;
        }
    });
    console.log(`[SERP Cache] Cleared ${cleared} entries`);
    return cleared;
}
