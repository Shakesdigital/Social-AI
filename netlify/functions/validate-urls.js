/**
 * Netlify Function: URL Validation
 * 
 * This function properly validates URLs by:
 * 1. Following redirects
 * 2. Checking final URL for parking domains
 * 3. Checking response body for parking page indicators
 * 4. Returning accurate validation status
 */

const PARKED_DOMAIN_PATTERNS = [
    // Domain registrars/parking services
    'godaddy.com',
    'sedoparking.com',
    'sedo.com',
    'hugedomains.com',
    'afternic.com',
    'dan.com',
    'uniregistry.com',
    'namecheap.com/domains',
    'bodis.com',
    'above.com',
    'parkingcrew.net',
    'domainmarket.com',
    'parkeddomain',
    'domain-parking',
    // Expired/for sale indicators
    'domainforsale',
    'thisdomain',
    'domainpending',
    'parked-content',
    'web.archive.org', // Not a business site
];

const PARKED_BODY_INDICATORS = [
    'domain is for sale',
    'buy this domain',
    'domain may be for sale',
    'domain has expired',
    'parked free',
    'parked domain',
    'this domain is parked',
    'domain parking',
    'make an offer',
    'inquire about this domain',
    'domain broker',
    'this webpage is parked',
    'godaddy',
    'sedoparking',
    'hugedomains',
    'domainmarket',
    'this domain name has expired',
    'renew this domain',
];

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const { urls } = JSON.parse(event.body);

        if (!urls || !Array.isArray(urls)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'urls array is required' }),
            };
        }

        // Validate each URL
        const results = await Promise.all(
            urls.map(async (url) => {
                try {
                    const result = await validateUrl(url);
                    return { url, ...result };
                } catch (error) {
                    return {
                        url,
                        isActive: false,
                        reason: 'validation_error',
                        error: error.message,
                    };
                }
            })
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ results }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

async function validateUrl(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });

        clearTimeout(timeout);

        // Check if redirected to a parking domain
        const finalUrl = response.url.toLowerCase();
        for (const pattern of PARKED_DOMAIN_PATTERNS) {
            if (finalUrl.includes(pattern)) {
                return {
                    isActive: false,
                    reason: 'parked_domain',
                    detail: `Redirected to parking/sale page: ${pattern}`,
                    finalUrl: response.url,
                };
            }
        }

        // Check HTTP status
        if (response.status >= 400) {
            return {
                isActive: false,
                reason: 'http_error',
                detail: `HTTP ${response.status}`,
                status: response.status,
            };
        }

        // Check response body for parking indicators (only for HTML responses)
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            const body = await response.text();
            const bodyLower = body.toLowerCase();

            for (const indicator of PARKED_BODY_INDICATORS) {
                if (bodyLower.includes(indicator)) {
                    return {
                        isActive: false,
                        reason: 'parked_content',
                        detail: `Page contains parking indicator: "${indicator}"`,
                    };
                }
            }

            // Check for very short pages (often parking pages)
            if (body.length < 500 && !bodyLower.includes('redirect')) {
                // Could be a stub page, but let's be lenient
            }
        }

        // URL is active!
        return {
            isActive: true,
            status: response.status,
            finalUrl: response.url,
        };

    } catch (error) {
        clearTimeout(timeout);

        if (error.name === 'AbortError') {
            return {
                isActive: false,
                reason: 'timeout',
                detail: 'Request timed out after 10 seconds',
            };
        }

        // DNS errors, connection refused, etc.
        return {
            isActive: false,
            reason: 'network_error',
            detail: error.message,
        };
    }
}
