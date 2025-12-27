/**
 * Simple SERP Scraper Server
 * 
 * A lightweight Express server that scrapes Google search results
 * Compatible with SerpAPI response format for easy integration
 * 
 * Features:
 * - Google SERP scraping with Puppeteer
 * - Response caching
 * - Rate limiting
 * - Multiple search engines fallback
 * - SerpAPI-compatible JSON output
 */

const express = require('express');
const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();
const PORT = process.env.PORT || 8000;

// Cache with 1-hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Rate limiting
const requestCounts = new Map();
const MAX_REQUESTS_PER_MINUTE = 10;

// Browser instance (reuse for performance)
let browser = null;

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });
    }
    return browser;
}

// Rate limit middleware
function rateLimit(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - 60000;

    const requests = requestCounts.get(ip) || [];
    const recentRequests = requests.filter(t => t > windowStart);

    if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);
    next();
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main search endpoint
app.get('/search', rateLimit, async (req, res) => {
    const { q: query, num = 10, gl = 'us', hl = 'en' } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter (q) is required' });
    }

    // Check cache
    const cacheKey = `${query}_${num}_${gl}_${hl}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log(`[Cache Hit] ${query}`);
        return res.json({ ...cached, cached: true });
    }

    console.log(`[Search] ${query}`);

    try {
        const results = await scrapeGoogle(query, parseInt(num), gl, hl);

        const response = {
            search_metadata: {
                status: 'Success',
                created_at: new Date().toISOString(),
                query: query,
                google_url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
            },
            search_parameters: {
                q: query,
                gl: gl,
                hl: hl,
                num: parseInt(num)
            },
            organic_results: results.organic,
            related_searches: results.related
        };

        // Cache the results
        cache.set(cacheKey, response);

        res.json(response);
    } catch (error) {
        console.error('[Search Error]', error.message);
        res.status(500).json({ error: 'Search failed', details: error.message });
    }
});

async function scrapeGoogle(query, num, gl, hl) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        // Set realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Set viewport
        await page.setViewport({ width: 1366, height: 768 });

        // Navigate to Google
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${num}&gl=${gl}&hl=${hl}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for results
        await page.waitForSelector('#search', { timeout: 10000 }).catch(() => { });

        // Get page content
        const content = await page.content();
        const $ = cheerio.load(content);

        const organic = [];
        const related = [];

        // Parse organic results
        $('div.g').each((i, el) => {
            if (i >= num) return;

            const $el = $(el);
            const titleEl = $el.find('h3').first();
            const linkEl = $el.find('a').first();
            const snippetEl = $el.find('div[data-sncf], div.VwiC3b, div[style*="-webkit-line-clamp"]').first();

            const title = titleEl.text().trim();
            const link = linkEl.attr('href');
            const snippet = snippetEl.text().trim();

            if (title && link && link.startsWith('http')) {
                organic.push({
                    position: organic.length + 1,
                    title,
                    link,
                    snippet,
                    displayed_link: new URL(link).hostname
                });
            }
        });

        // Parse related searches
        $('div.s75CSd, div.k8XOCe').each((i, el) => {
            const text = $(el).text().trim();
            if (text) related.push({ query: text });
        });

        await page.close();

        return { organic, related };
    } catch (error) {
        await page.close();
        throw error;
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    if (browser) await browser.close();
    process.exit(0);
});

// CORS headers for frontend access
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');
    next();
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SERP Scraper running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Search: http://localhost:${PORT}/search?q=your+query`);
});
