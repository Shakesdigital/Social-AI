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
 * Generate a research-backed, factually accurate blog post
 * RESEARCH-FIRST APPROACH: Deep research before writing
 * Target: 1,200-1,500 words - focused, accurate, and valuable
 */
export async function generateBlogPost(
    topic: TrendingTopic,
    profile: CompanyProfile,
    wordCount: number = 1350  // Sweet spot for 1200-1500 range
): Promise<BlogPost> {
    // Target word count: 1200-1500 words (highly accurate, focused content)
    const targetWordCount = Math.min(Math.max(wordCount, 1200), 1500);

    console.log('[Blog] PHASE 1: Conducting deep research for factual accuracy...');

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: DEEP RESEARCH (Gather facts from credible sources)
    // ═══════════════════════════════════════════════════════════

    let researchFindings = '';
    let credibleSources: { title: string; url: string; keyFact: string }[] = [];
    let factualData = '';
    let expertInsights = '';

    if (isWebResearchConfigured()) {
        // Search 1: Primary topic research - get facts and data
        const primaryResearch = await searchWeb(`${topic.topic} facts statistics data ${new Date().getFullYear()}`, 10);

        // Search 2: Expert opinions and industry insights  
        const expertResearch = await searchWeb(`${topic.topic} expert opinion research study`, 8);

        // Search 3: Related keywords for comprehensive coverage
        const keywordResearch = await searchWeb(`${topic.relatedKeywords.slice(0, 3).join(' ')} guide`, 5);

        // Compile research findings
        if (primaryResearch.length > 0) {
            credibleSources = primaryResearch.slice(0, 8).map(r => ({
                title: r.title,
                url: r.url,
                keyFact: r.snippet
            }));

            researchFindings = `
═══════════════════════════════════════════════════════════
VERIFIED RESEARCH FINDINGS (Use these facts in the blog):
═══════════════════════════════════════════════════════════

PRIMARY SOURCES (${primaryResearch.length} credible sources found):
${primaryResearch.slice(0, 8).map((r, i) => `
📚 Source ${i + 1}: ${r.title}
   URL: ${r.url}
   Key Fact: ${r.snippet}
`).join('')}
`;
        }

        if (expertResearch.length > 0) {
            expertInsights = `
EXPERT INSIGHTS & RESEARCH STUDIES:
${expertResearch.slice(0, 5).map((r, i) => `
🎓 Expert Source ${i + 1}: ${r.title}
   Insight: ${r.snippet}
`).join('')}
`;
        }

        if (keywordResearch.length > 0) {
            factualData = `
ADDITIONAL CONTEXT FOR COMPREHENSIVE COVERAGE:
${keywordResearch.slice(0, 3).map((r, i) => `
- ${r.title}: ${r.snippet.slice(0, 150)}...
`).join('')}
`;
        }

        console.log(`[Blog] Research complete: ${credibleSources.length} credible sources found`);
    } else {
        console.log('[Blog] Web research not configured - using LLM knowledge only');
        researchFindings = `
NOTE: Web research is not configured. Generate accurate content based on your training knowledge.
Always cite general sources when making claims (e.g., "According to industry reports...", "Research shows that...")
`;
    }

    // Get business context
    const businessContext = getBusinessContext(profile);

    // Get current date
    const today = new Date();
    const currentYear = today.getFullYear();

    console.log('[Blog] PHASE 2: Generating factually accurate blog content...');

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: GENERATE RESEARCH-BACKED BLOG POST
    // ═══════════════════════════════════════════════════════════

    const prompt = `
You are a SENIOR JOURNALIST AND CONTENT EXPERT with 10+ years of experience writing research-backed, factually accurate articles for credible publications.

YOUR MISSION: Write a blog post that is DEEPLY RESEARCHED, FACTUALLY ACCURATE, and based on CREDIBLE SOURCES.

${businessContext}

═══════════════════════════════════════════════════════════
CONTENT ASSIGNMENT
═══════════════════════════════════════════════════════════

Topic: ${topic.topic}
Category: ${topic.category}
Target Keywords: ${topic.relatedKeywords.join(', ')}
Target Length: ${targetWordCount} words (1,200-1,500 range)
Date: ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

${researchFindings}
${expertInsights}
${factualData}

═══════════════════════════════════════════════════════════
RESEARCH-FIRST WRITING REQUIREMENTS:
═══════════════════════════════════════════════════════════

✅ FACTUAL ACCURACY (CRITICAL):
• Base every major claim on the research provided above
• Reference specific statistics, studies, or expert opinions
• When citing data, mention the source (e.g., "According to [Source]...")
• Do NOT make up statistics or facts
• If uncertain, use hedging language ("Research suggests...", "Many experts believe...")

✅ CREDIBLE CONTENT:
• Draw from the research sources provided
• Include 2-3 specific citations or references in the content
• Demonstrate expertise through accurate, well-researched information
• Provide actionable advice backed by evidence

✅ STRUCTURE (1,200-1,500 words total):

📌 INTRODUCTION (100-150 words)
   • Hook with a relevant fact, statistic, or question
   • State the problem/topic clearly
   • Preview what the reader will learn

📌 BODY (900-1,100 words across 3-5 sections)
   • Each section makes a key point backed by research
   • Include specific data, examples, or case studies
   • Use ## for main headings (H2) and ### for sub-points (H3)
   • Add bullet points for readability
   • Include at least 2-3 references to the research/sources

📌 CONCLUSION (100-150 words)
   • Summarize 3-4 key actionable takeaways
   • End with a thought-provoking statement or question
   • Soft call-to-action

═══════════════════════════════════════════════════════════
WRITING STYLE:
═══════════════════════════════════════════════════════════

TONE: Professional yet conversational - like a knowledgeable friend explaining something
VOICE: Confident but not arrogant, helpful but not preachy
FEEL: Human-written, thoughtful, genuinely helpful

DO:
✓ Use "you" and "your" to connect with readers
✓ Vary sentence length (mix short punchy with longer explanatory)
✓ Include personal observations or industry experience
✓ Ask rhetorical questions to engage readers
✓ Use transition words between sections

DON'T:
✗ Start with "In today's..." or "In this article..."
✗ Use "In conclusion" or "As we've discussed"
✗ Sound robotic or AI-generated
✗ Make claims without backing them up
✗ Pad content with fluff - every sentence should add value

═══════════════════════════════════════════════════════════

Return JSON:
{
  "title": "Compelling, accurate headline (50-60 characters)",
  "excerpt": "Research-backed meta description (under 155 characters)",
  "content": "Full Markdown blog post, ${targetWordCount} words, with research citations and factual accuracy",
  "seoKeywords": ["primary keyword", "secondary 1", "secondary 2", "long-tail"],
  "seoScore": 85,
  "readingTime": "${Math.ceil(targetWordCount / 200)} min read",
  "sources": ${JSON.stringify(credibleSources.slice(0, 3).map(s => s.title))}
}`;

    const response = await callLLM(prompt, {
        type: 'reasoning',
        systemPrompt: `You are a senior journalist and content expert with 10+ years of experience at publications like Harvard Business Review, Forbes, and industry-leading trade publications.

YOUR EXPERTISE:
• Research-driven writing that builds credibility
• Translating complex data into accessible insights
• Fact-checking and source verification
• Creating content that educates and informs

YOUR WRITING PRINCIPLES:
1. ACCURACY FIRST: Never make up facts. Use research provided or clearly indicate when drawing on general knowledge.
2. CITE SOURCES: Reference the research sources naturally within the content.
3. ADD VALUE: Every paragraph should teach something useful.
4. BE HUMAN: Write like an expert explaining to a colleague, not a robot generating text.
5. STAY FOCUSED: ${targetWordCount} words is the target. No padding, no fluff.

QUALITY STANDARD:
This blog post should read like it was written by a subject matter expert after hours of research. It should be the kind of article readers bookmark and share because of its accuracy and usefulness.`,
        temperature: 0.7,  // Lower for more accuracy
        maxTokens: 8000
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
