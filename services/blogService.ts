import { CompanyProfile, BlogPost, TrendingTopic } from '../types';
import { callLLM, parseJSONFromLLM, LLMOptions } from './freeLLMService';
import { searchWeb, searchWebValidated, getLatestNews, getTrendingTopics, getSocialMediaTrends, isWebResearchConfigured } from './webResearchService';
import { getBusinessContext, getBlogTitlesToAvoid, addGeneratedBlogTitle, addGeneratedTopic, getTopicsToAvoid, incrementGeneratedCount, trackAction } from './contextMemoryService';

/**
 * Research trending topics with real-time web data
 */
export async function researchTrendingTopics(
    niche: string,
    profile: CompanyProfile,
    count: number = 5
): Promise<TrendingTopic[]> {
    // Step 1: Gather real-time trending data
    let webTrends = '';
    let newsContext = '';
    let socialTrends = '';

    if (isWebResearchConfigured()) {
        console.log('[Blog] Researching real-time trends...');

        // Get latest news in the niche
        const news = await getLatestNews(`${niche} ${profile.industry}`, 5);
        if (news.length > 0) {
            newsContext = `
BREAKING NEWS & RECENT DEVELOPMENTS:
${news.map((n, i) => `${i + 1}. "${n.title}" - ${n.source} (${n.publishedAt})
   ${n.summary}`).join('\n')}
`;
        }

        // Search for trending content with validation
        const searchResults = await searchWebValidated(`${niche} trending topics blog ideas ${new Date().getFullYear()}`, 8, {
            validateUrls: true,
            extractContacts: true,
        });
        if (searchResults.length > 0) {
            webTrends = `
CURRENTLY TRENDING CONTENT (Verified Active Sources):
${searchResults.map((r, i) => `${i + 1}. ${r.title} [${r.domain || 'Source'}]
   ${r.snippet}${r.contacts?.emails?.length ? `\n   Contact: ${r.contacts.emails[0]}` : ''}`).join('\n')}
`;
        }

        // Get social media trends
        const social = await getSocialMediaTrends(niche);
        if (social.hashtags.length > 0) {
            socialTrends = `
SOCIAL MEDIA PULSE:
• Trending Hashtags: ${social.hashtags.slice(0, 5).join(', ')}
• Popular Content Ideas: ${social.contentIdeas.join('; ')}
`;
        }
    }

    // Step 2: Get memory context to avoid duplicates
    const businessContext = getBusinessContext(profile);
    const topicsToAvoid = getTopicsToAvoid();
    const blogsToAvoid = getBlogTitlesToAvoid();

    // Step 3: Generate topics with creative AI thinking
    const prompt = `
You are an elite content strategist and trend analyst. Your mission is to identify ${count} HIGH-IMPACT blog topics that will drive traffic, engagement, and establish thought leadership.

${businessContext}

THINK LIKE A VIRAL CONTENT CREATOR:
1. What topics are EXPLODING right now that haven't been overdone?
2. What contrarian or unique angles could we take?
3. What questions are people desperately searching for answers to?
4. What emerging trends will be important in 6 months?

NICHE FOCUS: ${niche}

${newsContext}
${webTrends}
${socialTrends}
${topicsToAvoid}
${blogsToAvoid}

CONTENT STRATEGY FRAMEWORK:
Consider these proven blog post formats:
• "The Complete Guide to..." (comprehensive pillar content)
• "X vs Y: Which is Better in ${new Date().getFullYear()}?" (comparison)
• "How We Achieved [Result] in [Timeframe]" (case study)
• "The Future of [Industry]: Predictions for [Year]" (thought leadership)
• "[Number] Mistakes to Avoid When [Activity]" (problem-solving)
• "Why [Common Belief] is Wrong" (contrarian)

Generate ${count} topics with maximum viral and SEO potential. Return JSON:
[
  {
    "topic": "Compelling, click-worthy blog title",
    "category": "How-To / Industry Trends / Case Study / Opinion / Guide",
    "trendScore": 75-100 (based on timeliness and search interest),
    "relatedKeywords": ["primary keyword", "secondary keyword", "long-tail phrase"],
    "source": "Inspired by: specific trend/news/gap you identified",
    "contentAngle": "Brief description of the unique angle that will make this stand out"
  }
]`;

    const response = await callLLM(prompt, {
        type: 'reasoning',
        systemPrompt: `You are a content marketing genius who understands virality, SEO, and audience psychology. You create content strategies that drive real business results. Think creatively and identify opportunities others miss. IMPORTANT: Always respond with valid JSON array format.`,
        temperature: 0.9,
        maxTokens: 2500
    });

    console.log('[Blog] Raw LLM response:', response.text.substring(0, 500) + '...');

    const parsed = parseJSONFromLLM<any[]>(response.text);

    if (!parsed) {
        console.error('[Blog] Failed to parse JSON from response');
        // Try to extract topics from text as fallback
        const fallbackTopics = extractTopicsFromText(response.text, count);
        if (fallbackTopics.length > 0) {
            console.log('[Blog] Using fallback text extraction:', fallbackTopics.length, 'topics');
            return fallbackTopics.map((topic, index) => ({
                id: `topic-${Date.now()}-${index}`,
                topic,
                category: 'General',
                trendScore: 75,
                relatedKeywords: [niche],
                source: 'AI Research',
                researchedAt: new Date()
            }));
        }
        return [];
    }

    if (!Array.isArray(parsed)) {
        console.error('[Blog] Parsed result is not an array:', typeof parsed);
        return [];
    }

    const topics = parsed.map((item, index) => ({
        id: `topic-${Date.now()}-${index}`,
        topic: item.topic || 'Untitled Topic',
        category: item.category || 'General',
        trendScore: Math.min(100, Math.max(50, item.trendScore || 70)),
        relatedKeywords: item.relatedKeywords || [],
        source: item.source || item.contentAngle || 'AI Research',
        researchedAt: new Date()
    }));

    // Track in memory to avoid duplicates
    topics.forEach(t => addGeneratedTopic(t.topic));
    trackAction(`Researched ${topics.length} blog topics for ${niche}`);

    console.log('[Blog] Successfully parsed', topics.length, 'topics');
    return topics;
}

// Fallback: Extract topics from unstructured text
function extractTopicsFromText(text: string, count: number): string[] {
    const topics: string[] = [];

    // Try to find numbered list items
    const numberedMatches = text.match(/\d+[\.\)]\s*["']?([^"'\n]+)["']?/g);
    if (numberedMatches) {
        for (const match of numberedMatches.slice(0, count)) {
            const topic = match.replace(/^\d+[\.\)]\s*["']?/, '').replace(/["']?\s*$/, '').trim();
            if (topic.length > 10 && topic.length < 200) {
                topics.push(topic);
            }
        }
    }

    // Try to find quoted strings
    if (topics.length === 0) {
        const quotedMatches = text.match(/"([^"]{20,150})"/g);
        if (quotedMatches) {
            for (const match of quotedMatches.slice(0, count)) {
                topics.push(match.replace(/"/g, '').trim());
            }
        }
    }

    return topics;
}

/**
 * Generate a comprehensive, SEO-optimized blog post
 */
export async function generateBlogPost(
    topic: TrendingTopic,
    profile: CompanyProfile,
    wordCount: number = 1200
): Promise<BlogPost> {
    // Get supporting research
    let researchContext = '';
    if (isWebResearchConfigured()) {
        const searchResults = await searchWeb(`${topic.topic} ${topic.relatedKeywords.join(' ')}`, 5);
        if (searchResults.length > 0) {
            researchContext = `
SUPPORTING RESEARCH & SOURCES TO REFERENCE:
${searchResults.map((r, i) => `${i + 1}. ${r.title} (${r.url})
   Key insight: ${r.snippet}`).join('\n')}
`;
        }
    }

    // Get business context
    const businessContext = getBusinessContext(profile);

    const prompt = `
You are a world-class content writer who creates blog posts that RANK and CONVERT. Write a comprehensive, engaging blog post that readers will love and Google will reward.

${businessContext}

CONTENT BRIEF:
━━━━━━━━━━━━━━━━━━━━━━━
Topic: ${topic.topic}
Category: ${topic.category}
Primary Keywords: ${topic.relatedKeywords.join(', ')}
Target Word Count: ${wordCount} words

${researchContext}

WRITING REQUIREMENTS:

1. HEADLINE: Create an irresistible, SEO-optimized title that:
   - Includes primary keyword naturally
   - Creates curiosity or promises value
   - Is under 60 characters if possible

2. META DESCRIPTION: Write a compelling excerpt (under 160 chars) that:
   - Summarizes the value proposition
   - Includes a call-to-action
   - Entices clicks from search results

3. STRUCTURE: Use proper hierarchy:
   - Start with a hook that grabs attention
   - Use ## for main sections (H2)
   - Use ### for subsections (H3)
   - Include bullet points and numbered lists
   - Add blockquotes for emphasis

4. CONTENT QUALITY:
   - Open with a compelling hook (story, statistic, or question)
   - Provide actionable, specific advice
   - Include data, examples, or case studies
   - Address common objections or questions
   - End with a strong call-to-action

5. SEO OPTIMIZATION:
   - Naturally include keywords (2-3% density)
   - Use keyword variations throughout
   - Include internal linking opportunities (mark as [INTERNAL LINK])
   - Suggest one external authoritative source

Return JSON:
{
  "title": "SEO-optimized, compelling headline",
  "excerpt": "Meta description under 160 characters with CTA",
  "content": "Full Markdown blog post with ## and ### headings",
  "seoKeywords": ["optimized", "keyword", "list"],
  "seoScore": 85,
  "readingTime": "X min read",
  "suggestedImages": ["description of hero image", "description of supporting image"]
}`;

    console.log('[Blog] Calling LLM for blog post generation...');
    const response = await callLLM(prompt, {
        type: 'reasoning',
        systemPrompt: `You are an expert content writer who combines SEO mastery with engaging storytelling. Your posts rank on page 1 and keep readers engaged. Write content that's both search-engine friendly and genuinely valuable to human readers. IMPORTANT: Always generate COMPLETE, FULL blog posts - never cut content short. The user expects a comprehensive article.`,
        temperature: 0.75,
        maxTokens: 8000  // Increased for full blog generation
    });

    console.log('[Blog] LLM response received, length:', response.text?.length || 0);

    const parsed = parseJSONFromLLM<{
        title: string;
        excerpt: string;
        content: string;
        seoKeywords: string[];
        seoScore: number;
        readingTime?: string;
        suggestedImages?: string[];
    }>(response.text);

    // If JSON parsing failed, try to extract content from raw text
    let content = parsed?.content || '';
    let blogTitle = parsed?.title || topic.topic;

    if (!content || content.length < 200) {
        console.log('[Blog] JSON parsing incomplete, extracting from raw text...');
        // Try to extract content between markdown headers
        const rawText = response.text;

        // Look for "content" field in raw response
        const contentMatch = rawText.match(/"content"\s*:\s*"([\s\S]+?)"\s*[,}]/);
        if (contentMatch && contentMatch[1]?.length > 200) {
            content = contentMatch[1]
                .split('\\n').join('\n')
                .split('\\"').join('"')
                .split('\\\\').join('\\');
        }

        // If still no content, use the raw response but clean it up
        if (!content || content.length < 200) {
            // Remove JSON wrapper if present - use simpler string operations
            const startIdx = rawText.indexOf('"content"');
            const endIdx = rawText.lastIndexOf('"excerpt"');

            if (startIdx > -1 && endIdx > startIdx) {
                content = rawText.substring(startIdx + 12, endIdx)
                    .replace(/^["'\s]+/, '')
                    .replace(/["'\s,]+$/, '')
                    .split('\\n').join('\n')
                    .split('\\"').join('"')
                    .trim();
            }

            // If it still looks like JSON, try a different approach - just use all the text
            if (content.startsWith('{') || content.length < 200) {
                // Extract anything that looks like blog content (paragraphs)
                const paragraphs = rawText.match(/[A-Z][^.!?]*[.!?]/g);
                if (paragraphs && paragraphs.length > 5) {
                    content = paragraphs.join('\n\n');
                }
            }
        }

        // Try to extract title if not found
        if (!parsed?.title) {
            const titleMatch = rawText.match(/"title"\s*:\s*"([^"]+)"/);
            if (titleMatch) {
                blogTitle = titleMatch[1];
            }
        }
    }

    // Final validation
    if (!content || content === 'Failed to generate content.' || content.length < 100) {
        console.error('[Blog] Failed to generate adequate content');
        content = `# ${topic.topic}\n\nWe encountered an issue generating this blog post. Please try again.\n\n*Topic: ${topic.topic}*\n*Keywords: ${topic.relatedKeywords.join(', ')}*`;
    }

    // Track in memory
    addGeneratedBlogTitle(blogTitle);
    incrementGeneratedCount('blogs', 1);
    trackAction(`Generated blog post: ${blogTitle}`);

    const actualWordCount = content.split(/\s+/).length;
    console.log('[Blog] Final blog stats - Title:', blogTitle, 'Words:', actualWordCount);

    return {
        id: `post-${Date.now()}`,
        title: blogTitle,
        content,
        excerpt: parsed?.excerpt,
        seoKeywords: parsed?.seoKeywords || topic.relatedKeywords,
        seoScore: parsed?.seoScore || 70,
        trendingTopic: topic.topic,
        status: 'Draft',
        wordCount: actualWordCount
    };
}

/**
 * Analyze and suggest SEO improvements with real data
 */
export async function analyzeSEO(content: string, keywords: string[]): Promise<{
    score: number;
    suggestions: string[];
    competitorGaps: string[];
}> {
    // Research what competitors are ranking for
    let competitorContext = '';
    if (isWebResearchConfigured() && keywords.length > 0) {
        const searchResults = await searchWeb(keywords.join(' '), 5);
        competitorContext = `
TOP-RANKING CONTENT FOR THESE KEYWORDS:
${searchResults.map(r => `- ${r.title}`).join('\n')}
`;
    }

    const prompt = `
Perform an expert SEO audit on this blog post:

CONTENT (first 2000 characters):
${content.slice(0, 2000)}...

TARGET KEYWORDS: ${keywords.join(', ')}

${competitorContext}

Analyze and provide:
1. Overall SEO score (0-100) based on:
   - Keyword optimization
   - Content structure
   - Readability
   - Meta elements

2. Specific improvement suggestions

3. Content gaps compared to top-ranking competitors

Return JSON:
{
  "score": 75,
  "suggestions": ["Specific improvement 1", "Specific improvement 2"],
  "competitorGaps": ["Topic they cover that you don't", "Missing angle"]
}`;

    const response = await callLLM(prompt, { type: 'fast', temperature: 0.5 });
    const parsed = parseJSONFromLLM<{ score: number; suggestions: string[]; competitorGaps: string[] }>(response.text);

    return {
        score: parsed?.score || 70,
        suggestions: parsed?.suggestions || [],
        competitorGaps: parsed?.competitorGaps || []
    };
}

/**
 * Generate content ideas based on competitor analysis
 */
export async function generateContentGaps(
    profile: CompanyProfile,
    existingTopics: string[]
): Promise<string[]> {
    const searchResults = await searchWeb(`${profile.industry} top blog posts ${new Date().getFullYear()}`, 10);

    const prompt = `
Identify content gaps and opportunities:

COMPANY: ${profile.name} (${profile.industry})
TARGET AUDIENCE: ${profile.targetAudience}

EXISTING CONTENT:
${existingTopics.map(t => `- ${t}`).join('\n') || 'No existing content yet'}

TOP-PERFORMING COMPETITOR CONTENT:
${searchResults.map(r => `- ${r.title}`).join('\n')}

Suggest 5 unique content ideas that:
1. Fill gaps in the existing content
2. Offer unique angles not covered by competitors
3. Target high-value keywords
4. Would resonate with the target audience

Return JSON array of content idea strings.`;

    const response = await callLLM(prompt, { type: 'reasoning', temperature: 0.8 });
    const parsed = parseJSONFromLLM<string[]>(response.text);

    return parsed || [];
}

// WordPress publish placeholder
export async function publishToWordPress(
    post: BlogPost
): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    const WORDPRESS_URL = import.meta.env.VITE_WORDPRESS_URL;
    const WORDPRESS_USER = import.meta.env.VITE_WORDPRESS_USER;
    const WORDPRESS_APP_PASSWORD = import.meta.env.VITE_WORDPRESS_APP_PASSWORD;

    if (!WORDPRESS_URL || !WORDPRESS_USER || !WORDPRESS_APP_PASSWORD) {
        console.log('[WordPress] Not configured - simulating publish');
        console.log('[WordPress] Title:', post.title);
        console.log('[WordPress] Word Count:', post.wordCount);

        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            success: true,
            postUrl: `https://example.com/blog/${post.id}`
        };
    }

    // TODO: Implement actual WordPress REST API call
    return { success: true };
}

// Format post for content calendar
export function formatPostForCalendar(post: BlogPost): {
    id: string;
    title: string;
    type: 'blog';
    scheduledDate?: Date;
    status: string;
} {
    return {
        id: post.id,
        title: post.title,
        type: 'blog',
        scheduledDate: post.scheduledDate,
        status: post.status
    };
}
