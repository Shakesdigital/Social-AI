/**
 * Netlify Serverless Function - SERP Proxy
 * 
 * This function proxies SERP requests to avoid CORS issues.
 * Accessible at: /.netlify/functions/serp
 * 
 * Features:
 * - Tries multiple search providers in order
 * - Includes public SearXNG instances (free, no API key needed)
 * - Handles CORS automatically
 * - Adds caching headers
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Configuration from environment variables
const NOVEXITY_URL = process.env.NOVEXITY_URL || '';
const SEARXNG_URL = process.env.SEARXNG_URL || '';
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

// Public SearXNG instances (free, no setup required)
const PUBLIC_SEARXNG_INSTANCES = [
    'https://search.bus-hit.me',
    'https://searx.be',
    'https://search.sapti.me',
    'https://searx.tiekoetter.com',
    'https://search.ononoki.org',
];

interface SerpResult {
    position: number;
    title: string;
    url: string;
    snippet: string;
    domain: string;
}

interface SerpResponse {
    query: string;
    organic: SerpResult[];
    relatedSearches: string[];
    provider: string;
    cached?: boolean;
}

// Simple in-memory cache (resets on cold start)
const cache = new Map<string, { data: SerpResponse; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
}

// Try Novexity (self-hosted)
async function tryNovexity(query: string, num: number): Promise<SerpResponse | null> {
    if (!NOVEXITY_URL) return null;

    try {
        const params = new URLSearchParams({ q: query, num: String(num), gl: 'us', hl: 'en' });
        const response = await fetch(`${NOVEXITY_URL}/search?${params}`, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) return null;

        const data = await response.json();
        return {
            query,
            organic: (data.organic_results || data.organic || []).map((item: any, i: number) => ({
                position: i + 1,
                title: item.title,
                url: item.link || item.url,
                snippet: item.snippet || item.description || '',
                domain: extractDomain(item.link || item.url),
            })),
            relatedSearches: data.related_searches?.map((s: any) => s.query || s) || [],
            provider: 'novexity',
        };
    } catch (error) {
        console.error('[SERP] Novexity failed:', error);
        return null;
    }
}

// Try SearXNG (self-hosted)
async function trySearxNG(query: string, num: number): Promise<SerpResponse | null> {
    if (!SEARXNG_URL) return null;

    try {
        const params = new URLSearchParams({ q: query, format: 'json', language: 'en' });
        const response = await fetch(`${SEARXNG_URL}/search?${params}`);

        if (!response.ok) return null;

        const data = await response.json();
        return {
            query,
            organic: (data.results || []).slice(0, num).map((item: any, i: number) => ({
                position: i + 1,
                title: item.title,
                url: item.url,
                snippet: item.content || '',
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

// Try Public SearXNG instances (free!)
async function tryPublicSearxNG(query: string, num: number): Promise<SerpResponse | null> {
    // Shuffle to distribute load
    const instances = [...PUBLIC_SEARXNG_INSTANCES].sort(() => Math.random() - 0.5);

    for (const instanceUrl of instances) {
        try {
            const params = new URLSearchParams({ q: query, format: 'json', language: 'en' });
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(`${instanceUrl}/search?${params}`, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const data = await response.json();
            if (!data.results || data.results.length === 0) continue;

            console.log(`[SERP] Success with public instance: ${instanceUrl}`);

            return {
                query,
                organic: (data.results || []).slice(0, num).map((item: any, i: number) => ({
                    position: i + 1,
                    title: item.title,
                    url: item.url,
                    snippet: item.content || '',
                    domain: extractDomain(item.url),
                })),
                relatedSearches: data.suggestions || [],
                provider: 'searxng-public',
            };
        } catch (error) {
            console.log(`[SERP] Public instance ${instanceUrl} failed, trying next...`);
            continue;
        }
    }

    return null;
}

// Try Serper.dev (paid fallback)
async function trySerper(query: string, num: number, type: string): Promise<SerpResponse | null> {
    if (!SERPER_API_KEY) return null;

    try {
        const endpoint = type === 'news'
            ? 'https://google.serper.dev/news'
            : 'https://google.serper.dev/search';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: query, num, gl: 'us', hl: 'en' }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        const results = data.news || data.organic || [];

        return {
            query,
            organic: results.map((item: any, i: number) => ({
                position: i + 1,
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                domain: extractDomain(item.link),
            })),
            relatedSearches: data.relatedSearches?.map((s: any) => s.query) || [],
            provider: 'serper',
        };
    } catch (error) {
        console.error('[SERP] Serper failed:', error);
        return null;
    }
}

// Generate mock results as last resort
function generateMockResults(query: string, num: number): SerpResponse {
    const keyword = query.split(' ')[0] || 'topic';
    return {
        query,
        organic: Array.from({ length: num }, (_, i) => ({
            position: i + 1,
            title: `${keyword} - Comprehensive Guide ${i + 1}`,
            url: `https://example.com/${keyword}-${i + 1}`,
            snippet: `Learn about ${query}. Expert insights and best practices.`,
            domain: 'example.com',
        })),
        relatedSearches: [`${keyword} tips`, `${keyword} guide`, `best ${keyword}`],
        provider: 'mock',
    };
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    // CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const query = params.q;
    const num = parseInt(params.num || '10');
    const type = params.type || 'web';

    if (!query) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Query parameter (q) is required' }),
        };
    }

    console.log('[SERP] Searching:', query);

    // Check cache
    const cacheKey = `${query}_${num}_${type}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
        console.log('[SERP] Cache hit');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ ...cached.data, cached: true }),
        };
    }

    // Try providers in order
    let result: SerpResponse | null = null;

    // 1. Novexity (self-hosted)
    result = await tryNovexity(query, num);
    if (result && result.organic.length > 0) {
        cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
        return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // 2. SearxNG (self-hosted)
    result = await trySearxNG(query, num);
    if (result && result.organic.length > 0) {
        cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
        return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // 3. Public SearXNG instances (FREE!)
    result = await tryPublicSearxNG(query, num);
    if (result && result.organic.length > 0) {
        cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
        return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // 4. Serper (paid)
    result = await trySerper(query, num, type);
    if (result && result.organic.length > 0) {
        cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
        return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // 5. Mock results (last resort)
    result = generateMockResults(query, num);
    return { statusCode: 200, headers, body: JSON.stringify(result) };
};

export { handler };
