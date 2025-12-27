/**
 * Vercel Serverless Function - SERP Proxy
 * 
 * This function proxies SERP requests to your self-hosted scraper.
 * Deploy your frontend to Vercel, and this function handles the SERP calls.
 * 
 * Benefits:
 * - Hides your SERP server URL from clients
 * - Handles CORS automatically
 * - Adds edge caching
 * - Adds authentication layer
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configuration from environment variables
const NOVEXITY_URL = process.env.NOVEXITY_URL || '';
const SEARXNG_URL = process.env.SEARXNG_URL || '';
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const API_SECRET = process.env.SERP_PROXY_SECRET || ''; // Optional auth

// In-memory cache (resets on cold start, but helps within instance lifetime)
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Optional: Verify API secret
    if (API_SECRET && req.headers['x-api-key'] !== API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { q: query, num = '10', gl = 'us', hl = 'en', type = 'web' } = req.query;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter (q) is required' });
    }

    // Check cache
    const cacheKey = `${query}_${num}_${gl}_${type}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
        console.log('[SERP Proxy] Cache hit:', query);
        return res.status(200).json({ ...cached.data, cached: true });
    }

    console.log('[SERP Proxy] Searching:', query);

    // Try providers in order
    let result = null;

    // 1. Try Novexity (self-hosted)
    if (NOVEXITY_URL) {
        try {
            const params = new URLSearchParams({
                q: query,
                num: String(num),
                gl: String(gl),
                hl: String(hl),
            });

            const response = await fetch(`${NOVEXITY_URL}/search?${params}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                result = formatSerpResponse(data, query, 'novexity');
            }
        } catch (error) {
            console.error('[SERP Proxy] Novexity failed:', error);
        }
    }

    // 2. Try SearxNG (self-hosted)
    if (!result && SEARXNG_URL) {
        try {
            const params = new URLSearchParams({
                q: query,
                format: 'json',
                language: String(hl),
            });

            const response = await fetch(`${SEARXNG_URL}/search?${params}`);

            if (response.ok) {
                const data = await response.json();
                result = formatSearxNGResponse(data, query);
            }
        } catch (error) {
            console.error('[SERP Proxy] SearxNG failed:', error);
        }
    }

    // 3. Try Serper.dev (paid fallback)
    if (!result && SERPER_API_KEY) {
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
                body: JSON.stringify({
                    q: query,
                    num: parseInt(String(num)),
                    gl: String(gl),
                    hl: String(hl),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                result = formatSerperResponse(data, query);
            }
        } catch (error) {
            console.error('[SERP Proxy] Serper failed:', error);
        }
    }

    // 4. Return mock if all failed
    if (!result) {
        result = generateMockResponse(query, parseInt(String(num)));
    }

    // Save to cache
    cache.set(cacheKey, {
        data: result,
        expiry: Date.now() + CACHE_TTL,
    });

    return res.status(200).json(result);
}

// Format helpers
function formatSerpResponse(data: any, query: string, provider: string) {
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
        provider,
    };
}

function formatSearxNGResponse(data: any, query: string) {
    return {
        query,
        organic: (data.results || []).map((item: any, i: number) => ({
            position: i + 1,
            title: item.title,
            url: item.url,
            snippet: item.content || '',
            domain: extractDomain(item.url),
        })),
        relatedSearches: data.suggestions || [],
        provider: 'searxng',
    };
}

function formatSerperResponse(data: any, query: string) {
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
}

function generateMockResponse(query: string, count: number) {
    const keyword = query.split(' ')[0] || 'topic';
    return {
        query,
        organic: Array.from({ length: count }, (_, i) => ({
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

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
}
