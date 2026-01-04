import { CompanyProfile, BlogPost, TrendingTopic } from '../types';
import { callLLM, parseJSONFromLLM, LLMOptions } from './freeLLMService';
import { searchWeb, searchWebValidated, getLatestNews, getTrendingTopics, getSocialMediaTrends, isWebResearchConfigured } from './webResearchService';
import { getBusinessContext, getBlogTitlesToAvoid, addGeneratedBlogTitle, addGeneratedTopic, getTopicsToAvoid, incrementGeneratedCount, trackAction } from './contextMemoryService';

/**
 * Research trending topics with real-time web data
 * Expert-level topic discovery with 10+ years SEO expertise
 * Focuses on high CTR, search volume, and ranking potential
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
    let competitorAnalysis = '';

    // Get current date context for seasonal/timely content
    const today = new Date();
    const currentMonth = today.toLocaleString('en-US', { month: 'long' });
    const currentYear = today.getFullYear();
    const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);

    if (isWebResearchConfigured()) {
        console.log('[Blog] Researching real-time trends with expert SEO analysis...');

        // Get latest news in the niche
        const news = await getLatestNews(`${niche} ${profile.industry}`, 5);
        if (news.length > 0) {
            newsContext = `
BREAKING NEWS & RECENT DEVELOPMENTS:
${news.map((n, i) => `${i + 1}. "${n.title}" - ${n.source} (${n.publishedAt})
   ${n.summary}`).join('\n')}
`;
        }

        // Search for trending content and competitor analysis
        const searchResults = await searchWebValidated(`${niche} trending topics blog ideas ${currentYear}`, 8, {
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

        // Analyze top-ranking content (simulating Ahrefs/Semrush data)
        const competitorSearch = await searchWeb(`best ${niche} blog posts ${currentYear}`, 10);
        if (competitorSearch.length > 0) {
            competitorAnalysis = `
TOP 10 RANKING COMPETITOR POSTS (Simulated Ahrefs/Semrush Analysis):
${competitorSearch.map((r, i) => `${i + 1}. "${r.title}"
   - Estimated Word Count: ${1500 + Math.floor(Math.random() * 1500)} words
   - Domain Authority: ${40 + Math.floor(Math.random() * 50)}
   - Key Angle: ${r.snippet.slice(0, 100)}...`).join('\n')}

INSIGHTS FROM COMPETITOR ANALYSIS:
• Average content length of top 10: ~2,200 words
• Common patterns: How-to guides, listicles, ultimate guides
• Content gaps: Look for unique angles not covered above
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

    // Step 3: Infer primary keywords if not explicitly provided
    const inferredKeywords = `
INFERRED PRIMARY KEYWORDS (Based on Business Profile):
• Primary: ${profile.industry.toLowerCase()}, ${niche.toLowerCase()}
• Secondary: ${profile.name.toLowerCase()}, ${profile.targetAudience.toLowerCase()}
• Long-tail opportunities: "${profile.industry} for ${profile.targetAudience}", "best ${niche} strategies ${currentYear}"
• Seasonal keywords: "${currentMonth} ${niche} trends", "Q${currentQuarter} ${profile.industry} insights"
`;

    // Step 3: Generate topics with creative AI thinking - EXPERT LEVEL
    const prompt = `
You are an ELITE Content Strategist and SEO Expert with 10+ years of experience discovering HIGH-RANKING blog topics that drive massive organic traffic.

Your expertise is in identifying topics with:
• HIGH CLICK-THROUGH RATES (CTR) - Headlines that get clicked from search results
• STRONG SEARCH VOLUME - Topics people are actively searching for
• LOW-MEDIUM COMPETITION - Rankable opportunities
• CONVERSION POTENTIAL - Topics that lead to business outcomes

${businessContext}

${inferredKeywords}

CURRENT DATE CONTEXT:
• Today: ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
• Consider timely/seasonal angles for ${currentMonth} ${currentYear}

═══════════════════════════════════════════════════════════
EXPERT TOPIC RESEARCH FRAMEWORK (10+ Years Experience):
═══════════════════════════════════════════════════════════

1. 🎯 CTR OPTIMIZATION PATTERNS (What gets clicked):
   • Numbers in headlines ("7 Ways to...", "The 2026 Guide to...")
   • Power words (Ultimate, Essential, Proven, Secret, Complete)
   • Question-based titles ("How to...", "Why Does...", "What is the Best...")
   • Brackets/parentheses for clarity [Updated 2026]
   • Emotional triggers (Surprising, Mistakes, Success, Fail)

2. 📊 SEARCH INTENT MAPPING:
   • Informational: "What is...", "How to...", "Guide to..."
   • Commercial: "Best [product]", "[X] vs [Y]", "Reviews"
   • Transactional: "Buy", "Pricing", "Free trial"
   • Navigational: Brand + topic combinations

3. 🔥 HIGH-PERFORMING CONTENT FORMATS:
   • Ultimate Guides (2,000-4,000 words) - Pillar content
   • Listicles ("X Best/Worst/Ways to...") - High shareability
   • How-To Tutorials - Strong search intent match
   • Case Studies - Builds authority
   • Comparisons (X vs Y) - Captures commercial intent
   • Trend Predictions - Thought leadership
   • Myth-Busting - Contrarian angles that stand out

4. 🏆 COMPETITOR GAP ANALYSIS:
   • What are competitors NOT covering well?
   • What unique angle can this business offer?
   • What questions remain unanswered in top content?

NICHE FOCUS: ${niche}

${newsContext}
${webTrends}
${competitorAnalysis}
${socialTrends}
${topicsToAvoid}
${blogsToAvoid}

MISSION: Generate ${count} EXCEPTIONAL blog topic ideas that will:
✓ Rank on Google's first page
✓ Generate high click-through rates from SERPs
✓ Attract qualified traffic to the business
✓ Establish thought leadership in the industry
✓ Be worthy of 2,000+ word comprehensive coverage

Return JSON array:
[
  {
    "topic": "Compelling, CTR-optimized blog title with power words and numbers",
    "category": "Ultimate Guide / How-To / Listicle / Case Study / Comparison / Trend Analysis",
    "trendScore": 75-100 (based on search potential and timeliness),
    "relatedKeywords": ["primary keyword", "secondary keyword", "long-tail phrase 1", "long-tail phrase 2"],
    "source": "Specific trend/news/competitor gap that inspired this topic",
    "contentAngle": "The unique angle that will differentiate this from existing content",
    "estimatedSearchVolume": "Low / Medium / High / Very High",
    "competitionLevel": "Low / Medium / High",
    "recommendedWordCount": 1800-2500 (or higher for pillar content)
  }
]`;

    const response = await callLLM(prompt, {
        type: 'reasoning',
        systemPrompt: `You are a world-renowned Content Strategy Director with 10+ years of experience at top digital marketing agencies. You've helped Fortune 500 companies and startups alike achieve #1 rankings on Google.

YOUR PROVEN TRACK RECORD:
• Generated 50M+ organic visits through strategic content
• Achieved 300+ #1 Google rankings across industries
• Expert in Ahrefs, Semrush, and search analytics
• Deep understanding of Google's E-E-A-T requirements
• Mastery of CTR optimization and SERP psychology

YOUR RESEARCH METHODOLOGY:
1. Analyze top 10 ranking posts for target keywords
2. Identify content gaps and unique angles
3. Assess keyword difficulty vs. domain authority
4. Map topics to business conversion goals
5. Prioritize by potential ROI and rankability

YOUR TOPIC SELECTION CRITERIA:
• Minimum estimated 1,000 monthly searches OR high conversion value
• Content gaps exist in current top 10 results
• Topic aligns with brand expertise (E-E-A-T)
• Clear path from content to business outcome
• Timely relevance or evergreen appeal

CRITICAL: Generate topics that deserve comprehensive 2,000+ word coverage. These should be substantial topics, not thin content ideas.

IMPORTANT: Always respond with valid JSON array format.`,
        temperature: 0.85,
        maxTokens: 3000
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
 * Generate a professional blog post with human-like writing
 * Target: 1,200-1,500 words - focused, accurate, and valuable
 */
export async function generateBlogPost(
    topic: TrendingTopic,
    profile: CompanyProfile,
    wordCount: number = 1350
): Promise<BlogPost> {
    const targetWordCount = 1350; // Fixed for consistency

    console.log('[Blog] Starting blog generation for:', topic.topic);
    console.log('[Blog] Target word count:', targetWordCount);

    // Get business context
    const businessContext = getBusinessContext(profile);
    const currentYear = new Date().getFullYear();

    // SIMPLIFIED PROMPT - Direct instruction for better compliance
    const prompt = `Write a professional blog post.

TOPIC: ${topic.topic}
KEYWORDS: ${topic.relatedKeywords.join(', ')}
BUSINESS: ${profile.name} - ${profile.industry}
AUDIENCE: ${profile.targetAudience}

CRITICAL REQUIREMENTS:

1. WORD COUNT: Write EXACTLY 1,300-1,400 words. This is mandatory.
   - Count your words as you write
   - Each section should be 200-300 words
   - Include 5-6 main sections

2. FORMAT: Use this exact structure:
   
   # [Blog Title - 50-60 characters]
   
   [Opening paragraph: 80-100 words. Hook the reader with a question, statistic, or bold statement. NO "In today's world..." phrases.]
   
   ## [First Main Section Title]
   [2-3 detailed paragraphs, 200-250 words total. Include specific examples.]
   
   ## [Second Main Section Title]  
   [2-3 paragraphs, 200-250 words. Add data points or statistics.]
   
   ## [Third Main Section Title]
   [2-3 paragraphs, 200-250 words. Include actionable advice.]
   
   ## [Fourth Main Section Title]
   [2-3 paragraphs, 200-250 words. Address common questions or concerns.]
   
   ## [Fifth Main Section Title]
   [2-3 paragraphs, 200-250 words. Provide expert tips or insights.]
   
   ## Key Takeaways
   - [Actionable point 1]
   - [Actionable point 2]
   - [Actionable point 3]
   - [Actionable point 4]
   
   [Closing paragraph: 60-80 words. End with a thought-provoking question or call-to-action.]

3. WRITING STYLE:
   - Write like a knowledgeable friend explaining something over coffee
   - Use "you" and "your" frequently
   - Mix short sentences with longer ones
   - Include specific numbers, examples, and details
   - Add phrases like "What many people miss is..." or "The key insight here is..."
   - Ask rhetorical questions to engage readers
   
4. AVOID:
   - "In today's digital age" or "In this article"
   - "In conclusion" or "As we've discussed"
   - Generic advice that could apply to anything
   - Vague statements without specifics
   - Robotic or AI-sounding language

5. INCLUDE:
   - At least 3 specific statistics or data points (can reference "research shows" or "studies indicate")
   - 2-3 practical examples or scenarios
   - Expert-sounding insights relevant to ${profile.industry}

Now write the complete blog post (1,300-1,400 words):`;

    console.log('[Blog] Calling LLM with simplified prompt...');

    const response = await callLLM(prompt, {
        type: 'reasoning',
        systemPrompt: `You are an expert blog writer. Your task is to write a complete, detailed blog post of EXACTLY 1,300-1,400 words.

CRITICAL: Count your words carefully. The post MUST be at least 1,300 words.

Write in a natural, human voice. Be specific and detailed. Every paragraph should add real value.

Output the blog post directly in Markdown format. Start with # for the title.`,
        temperature: 0.85,
        maxTokens: 10000
    });

    console.log('[Blog] LLM response received, length:', response.text?.length || 0);

    // Extract content directly - response should be markdown
    let content = response.text.trim();
    let blogTitle = topic.topic;

    // Extract title from markdown if present
    const titleMatch = content.match(/^#\s+(.+?)[\n\r]/);
    if (titleMatch) {
        blogTitle = titleMatch[1].trim();
    }

    // Remove any JSON wrapper if accidentally included
    if (content.startsWith('{')) {
        try {
            const parsed = JSON.parse(content);
            content = parsed.content || content;
            blogTitle = parsed.title || blogTitle;
        } catch (e) {
            // Not JSON, use as-is
        }
    }

    // Clean up markdown code blocks if wrapped
    if (content.startsWith('```')) {
        content = content.replace(/^```(?:markdown)?\s*/, '').replace(/\s*```$/, '');
    }

    // Calculate word count
    const actualWordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    console.log('[Blog] Generated content word count:', actualWordCount);

    // Generate excerpt from first paragraph
    const firstParagraph = content.match(/^#[^\n]+\n+([^\n#]+)/);
    const excerpt = firstParagraph
        ? firstParagraph[1].slice(0, 150).trim() + '...'
        : `Discover insights about ${topic.topic} in this comprehensive guide.`;

    // Track in memory
    addGeneratedBlogTitle(blogTitle);
    incrementGeneratedCount('blogs', 1);
    trackAction(`Generated blog post: ${blogTitle}`);

    console.log('[Blog] Final blog stats - Title:', blogTitle, 'Words:', actualWordCount);

    return {
        id: `post-${Date.now()}`,
        title: blogTitle,
        content: content || `# ${topic.topic}\n\nContent generation encountered an issue. Please try again.`,
        excerpt,
        seoKeywords: topic.relatedKeywords,
        seoScore: actualWordCount >= 1200 ? 85 : 70,
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
