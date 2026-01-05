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
 * RESEARCH-FIRST: Gather knowledge before writing
 * FACT-CHECK: Verify content accuracy after drafting
 * Target: 1,200-2,000 words - comprehensive, accurate, and engaging
 * Voice: Professional blogger with 10+ years experience
 */
export async function generateBlogPost(
    topic: TrendingTopic,
    profile: CompanyProfile,
    wordCount: number = 1600
): Promise<BlogPost> {
    // Target range: 1200-2000 words (user preferred)
    const targetWordCount = Math.max(1200, Math.min(wordCount, 2000));

    console.log('[Blog] Starting PROFESSIONAL blog generation for:', topic.topic);
    console.log('[Blog] Target word count:', targetWordCount, '(range: 1200-2000)');

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: DEEP RESEARCH - Gather knowledge before writing
    // ═══════════════════════════════════════════════════════════

    console.log('[Blog] PHASE 1: Conducting research...');

    let researchContext = '';
    let researchSources: string[] = [];
    let hasResearch = false;

    if (isWebResearchConfigured()) {
        try {
            // Search 1: Topic-specific research
            console.log('[Blog] Research query 1: Topic facts...');
            const topicSearch = await searchWeb(`${topic.topic} facts guide ${new Date().getFullYear()}`, 5);

            // Search 2: Industry context
            console.log('[Blog] Research query 2: Industry context...');
            const industrySearch = await searchWeb(`${profile.industry} ${topic.relatedKeywords[0]} best practices`, 3);

            // Search 3: Expert insights (if topic is specific enough)
            console.log('[Blog] Research query 3: Expert insights...');
            const expertSearch = await searchWeb(`${topic.relatedKeywords.slice(0, 2).join(' ')} expert tips`, 3);

            // Compile research - only if we got actual results
            const allResults = [...topicSearch, ...industrySearch, ...expertSearch];
            const validResults = allResults.filter(r => r?.snippet && r.snippet.length > 30);

            if (validResults.length >= 3) {
                hasResearch = true;
                researchSources = validResults.slice(0, 8).map(r => r.title);

                researchContext = `
═══════════════════════════════════════════════════════════
📚 RESEARCH FINDINGS (Use this knowledge in your writing)
═══════════════════════════════════════════════════════════

The following information was gathered from credible sources. Use these facts and insights to write an informed, accurate article:

${validResults.slice(0, 8).map((r, i) => `
SOURCE ${i + 1}: ${r.title}
Key Information: ${r.snippet}
`).join('')}

INSTRUCTIONS:
• Incorporate relevant facts from this research naturally
• When citing, use phrases like "According to industry sources..." or "Research indicates..."
• Cross-reference claims—don't include conflicting information
• If research conflicts with your knowledge, prioritize accuracy

═══════════════════════════════════════════════════════════
`;
                console.log(`[Blog] Research successful: ${validResults.length} sources compiled`);
            } else {
                console.log('[Blog] Research returned insufficient results');
            }
        } catch (e) {
            console.log('[Blog] Research phase encountered an error:', e);
        }
    }

    // If no research available, provide guidance for LLM to use training knowledge
    if (!hasResearch) {
        console.log('[Blog] Using LLM training knowledge (no web research available)');
        researchContext = `
═══════════════════════════════════════════════════════════
📚 RESEARCH GUIDANCE (Web research unavailable)
═══════════════════════════════════════════════════════════

Live research is not available. Use your training knowledge to write this article, but:

• Only state facts you're confident are accurate
• Use hedging language for uncertain claims: "typically", "often", "many experts suggest"
• Focus on evergreen information that doesn't require real-time data
• If writing about a specific location (e.g., Uganda), only mention places you're certain exist there
• Avoid specific statistics unless you're confident they're accurate—use general statements instead

REMEMBER: It's better to be generally accurate than specifically wrong.

═══════════════════════════════════════════════════════════
`;
    }

    console.log('[Blog] PHASE 2: Writing with research context...');

    // Get business context
    const businessContext = getBusinessContext(profile);
    const currentYear = new Date().getFullYear();

    // PROFESSIONAL BLOGGER VOICE - 10+ years experience, storytelling, engagement, accuracy
    const prompt = `Write a COMPREHENSIVE blog post like an experienced professional blogger with 10+ years of experience would write it.

TOPIC: "${topic.topic}"
BUSINESS: ${profile.name} (${profile.industry})
AUDIENCE: ${profile.targetAudience}
KEYWORDS: ${topic.relatedKeywords.join(', ')}

${researchContext}

═══════════════════════════════════════════════════════════
⚠️ CRITICAL: FACT-CHECK EVERYTHING YOU WRITE ⚠️
═══════════════════════════════════════════════════════════

BEFORE WRITING ANYTHING, VERIFY:
• Geographic facts: Make sure places are in the correct country/region
• Statistics: Only use numbers you're confident are accurate
• Names: Verify proper names of places, parks, landmarks
• Claims: Don't state something as fact if you're uncertain

SPECIFIC RULES:
• If writing about a SPECIFIC COUNTRY (e.g., Uganda), only mention places ACTUALLY IN that country
  - Uganda has: Bwindi, Queen Elizabeth NP, Murchison Falls, Rwenzori Mountains, Lake Victoria
  - Uganda does NOT have: Serengeti (Tanzania), Masai Mara (Kenya), Kruger (South Africa)
• If unsure about a fact, use hedging language: "approximately", "around", "reports suggest"
• Don't invent statistics—use general statements if you don't have exact numbers
• Double-check any specific claims before including them

YOUR CREDIBILITY DEPENDS ON ACCURACY. Wrong facts = lost trust.

═══════════════════════════════════════════════════════════
WORD COUNT: ${targetWordCount} WORDS (RANGE: 1,200-2,000 MANDATORY)
═══════════════════════════════════════════════════════════

Structure breakdown for ${targetWordCount} words:
• Introduction with hook: 150-200 words
• 5-7 meaty sections: 200-300 words each
• Key Takeaways: 100 words
• Conclusion: 150 words

═══════════════════════════════════════════════════════════
STORYTELLING & ENGAGEMENT
═══════════════════════════════════════════════════════════

Tell a STORY, don't just list facts. Include:
• An engaging hook that draws readers in immediately
• Personal anecdotes or observations where appropriate
• Vivid descriptions that paint a picture
• Rhetorical questions that make readers think
• Metaphors and analogies to explain complex concepts
• Emotional connection—make readers feel something

═══════════════════════════════════════════════════════════
TOPIC FOCUS: Stay 100% on topic
═══════════════════════════════════════════════════════════

Every paragraph must directly address "${topic.topic}"
Don't wander. Readers came for this specific topic.

═══════════════════════════════════════════════════════════
STRUCTURE (${targetWordCount}+ words):
═══════════════════════════════════════════════════════════

# [Power-word title that promises value about ${topic.topic}]

[Introduction - 150-200 words]
• Open with a HOOK: a surprising fact, a relatable story, or a provocative question
• Paint a picture—make the reader feel something immediately
• Preview what they'll learn (without spoiling everything)
• End intro with a compelling reason to keep reading

## [Section 1: The Foundation - Understanding ${topic.topic.split(':')[0]}]
[250-300 words. Story-driven explanation of the core concept.]
• Use an analogy or metaphor to make it click
• Include a brief story or example
• Verified facts woven naturally into narrative

## [Section 2: Why This Matters Now More Than Ever]
[250-300 words. Create urgency and relevance.]
• Current trends and developments (research-backed)
• Why readers should care TODAY
• What's at stake if they ignore this

## [Section 3: The Step-by-Step Process]
[250-300 words. Actionable how-to guidance.]
• Numbered steps or clear progression
• Specific, not vague advice
• Include a mini case study or example

## [Section 4: Common Pitfalls and How to Avoid Them]
[250-300 words. Share hard-earned wisdom.]
• "In my experience, people often..." 
• Real mistakes with real consequences
• Prevention strategies

## [Section 5: Advanced Strategies (What Experts Know)]
[250-300 words. Elevate the content.]
• Insights that separate beginners from pros
• Nuanced understanding of the topic
• Future-looking perspective

## [Section 6: Real-World Examples] (if space allows)
[200-250 words. Concrete proof and inspiration.]
• Specific examples (verified facts only)
• Results or outcomes when possible

## Key Takeaways
Use bullet points or numbered list:
- [5-7 actionable insights distilled from the article]
- [Each should be standalone valuable]
- [All claims must be factually accurate]

[Conclusion - 150 words]
• Don't summarize—inspire action
• Circle back to the opening hook
• End with a memorable thought or call to action
• Leave readers thinking

═══════════════════════════════════════════════════════════
WRITE LIKE A PROFESSIONAL BLOGGER (NOT AI):
═══════════════════════════════════════════════════════════

You've been writing about ${profile.industry} for 10+ years. You have a voice. Use it.

NATURAL WRITING PATTERNS:
• Use contractions: "don't" not "do not", "you'll" not "you will"
• Start sentences with "And" or "But" when it feels right
• Vary your rhythm: Short sentence. Then a longer one.
• Use dashes—like this—for emphasis
• Ask questions to engage: "So what does this mean for you?"

AUTHENTIC PROFESSIONAL VOICE:
• Share observations from experience: "What I've noticed is..."
• Have opinions: "Here's what many people get wrong..."
• Be direct: "Let me be clear about this..."
• Use conversational bridges: "Here's the thing..."

═══════════════════════════════════════════════════════════
BANNED AI PHRASES:
═══════════════════════════════════════════════════════════

❌ "In today's fast-paced world" / "In today's digital age"
❌ "Let's dive in" / "Let's dive deep" / "Let's explore"
❌ "In conclusion" / "To summarize" / "As we've discussed"
❌ "Game-changer" / "Leverage" / "Navigate" / "Landscape"
❌ "Delve into" / "Embark on a journey" / "Unlock the potential"

═══════════════════════════════════════════════════════════
CONTENT REQUIREMENTS:
═══════════════════════════════════════════════════════════

• 2-3 statistics (only if accurate—otherwise use general statements)
• 1-2 real examples (verify they're factually correct)
• Actionable advice (specific, not vague)
• Professional perspective on the topic

═══════════════════════════════════════════════════════════

Write the complete blog post now (1,300-1,400 words, focused on "${topic.topic}"):`;

    console.log('[Blog] Calling LLM with Sara Chen voice...');

    const response = await callLLM(prompt, {
        type: 'reasoning',
        systemPrompt: `You are Sarah Chen, an ELITE professional blogger with 10+ years of experience writing about ${profile.industry}. Your articles have been read by millions. You've built a reputation for content that's ACCURATE, deeply engaging, and unmistakably human.

YOUR TRACK RECORD:
• 10+ years writing professionally about ${profile.industry}
• Published in major publications
• Known for storytelling that makes complex topics accessible
• Zero tolerance for factual errors—your reputation depends on accuracy

YOUR PERSONALITY:
• You're the friend who happens to be an expert—approachable but brilliant
• You write like you talk: naturally, with contractions and conversational rhythm  
• You're genuinely passionate about ${profile.industry}
• You have opinions backed by experience and aren't afraid to share them
• Your humor is subtle and earned—never forced or cringy
• You paint vivid pictures with your words

${hasResearch ? '📚 RESEARCH PROVIDED: You have research findings above. Weave these facts into your storytelling naturally. Say things like "Recent data suggests...", "According to industry research...", "What the numbers tell us..."' : '📚 NO LIVE RESEARCH: Use your training knowledge carefully. Say things like "In my experience...", "What I\\'ve seen over the years...", "Time and again, I\\'ve noticed..."'}

⚠️ FACT - CHECKING IS NON - NEGOTIABLE ⚠️

You've built your reputation on accuracy. Before writing ANY fact:
• Geographic locations must be in the correct country(Serengeti = Tanzania, NOT Uganda)
• Don't invent statistics—use hedging: "approximately", "around", "experts suggest"
• If unsure, be general rather than specifically wrong
• Your credibility depends on this

YOUR WRITING VOICE(THE SARAH CHEN STYLE):
• Use contractions naturally: "don't" not "do not", "you'll" not "you will"
• Start sentences with "And" or "But" when it feels right
• Vary sentence length: Short punchy ones.Then longer ones that develop the idea fully and give the reader space to breathe.
• Use dashes—like this—for emphasis and mid - thought elaboration
• Ask rhetorical questions to engage: "So what does this mean for you?"
• Include conversational phrases: "Here's the thing...", "What most people miss is...", "Let me be direct..."
• Use analogies and metaphors to make concepts click
• Create vivid scenes when appropriate—help readers see, feel, experience

YOUR SIGNATURE PHRASES(use naturally, not forced):
    "Here's what I've learned after years of doing this..."
    "Most people make the same mistake here—and it's completely understandable..."
    "What fascinates me about this is..."
    "Let me break this down for you..."
    "The key insight here is..."
    "I've seen this pattern dozens of times..."
    "If there's one thing I want you to take away..."

STORYTELLING TECHNIQUES:
• Open sections with hooks or mini - stories
• Use specific examples and case studies
• Create "aha moments" for readers
• Build anticipation before revealing key insights
• Paint pictures—don't just list facts
• Make abstract concepts concrete through analogies

    STRUCTURE:
• Every article delivers exactly what the title promises—no bait and switch
• You write tight paragraphs(2 - 4 sentences max)
• You use specific examples, not vague generalities
• You include subheadings, bullet points, and lists for readability
• You end with something memorable—NOT a boring "in conclusion" summary

CRITICAL RULES:
    1. ${ hasResearch ? 'USE the research provided—weave it into your storytelling naturally' : 'Be cautious with specific claims—hedge when uncertain, be general rather than wrong' }
    2. FACT - CHECK everything(especially geography and statistics)
    3. Hit ${ targetWordCount } words(range: 1, 200 - 2,000) - count carefully
    4. Stay 100 % focused on: "${topic.topic}"
    5. Sound unmistakably human—like Sarah Chen wrote this, not AI
    6. Tell a STORY, don't just list information
    7. Use vivid language, analogies, and rhetorical elements

    Output in Markdown format.Start with # for the title.`,
        temperature: hasResearch ? 0.85 : 0.78,  // Higher with research for creativity, still creative without
        maxTokens: 12000  // Increased for longer posts
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
