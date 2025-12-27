import { CompanyProfile, ImageGenerationConfig, SocialPost, AutoPilotConfig } from "../types";
import { callLLM, parseJSONFromLLM } from "./freeLLMService";
import { searchWeb, getLatestNews, getTrendingTopics, getSocialMediaTrends, deepResearch, isWebResearchConfigured } from "./webResearchService";
import { getBusinessContext, getTopicsToAvoid, addGeneratedTopic, incrementGeneratedCount, trackAction, addToConversation, getRecentConversationContext } from "./contextMemoryService";

// Free Image Generation via Hugging Face
const HUGGINGFACE_IMAGE_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';

/**
 * Enhanced Market Research with Real-Time Web Data
 */
export const generateMarketResearch = async (profile: CompanyProfile) => {
  // Gather real-time intelligence
  let webResearchContext = '';
  let newsContext = '';
  let trendingContext = '';
  let sources: { uri: string; title: string }[] = [];

  if (isWebResearchConfigured()) {
    console.log('[Research] Gathering real-time market intelligence...');

    // Get latest industry news
    const news = await getLatestNews(profile.industry, 5);
    if (news.length > 0) {
      newsContext = `
## BREAKING: Latest Industry News (${new Date().toLocaleDateString()})
${news.map((n, i) => `${i + 1}. **${n.title}** - *${n.source}*
   ${n.summary}`).join('\n')}
`;
      sources.push(...news.map(n => ({ uri: n.url, title: n.title })));
    }

    // Search for competitor insights
    const competitorSearch = await searchWeb(`${profile.industry} top companies ${profile.targetAudience}`, 5);
    if (competitorSearch.length > 0) {
      webResearchContext = `
## Competitor Landscape (Live Data)
${competitorSearch.map(r => `- **${r.title}**
  ${r.snippet}`).join('\n')}
`;
      sources.push(...competitorSearch.map(r => ({ uri: r.url, title: r.title })));
    }

    // Get social media trends
    const socialTrends = await getSocialMediaTrends(profile.industry);
    if (socialTrends.hashtags.length > 0) {
      trendingContext = `
## Social Media Pulse
- **Trending Hashtags:** ${socialTrends.hashtags.slice(0, 8).join(', ')}
- **Content Ideas:** ${socialTrends.contentIdeas.slice(0, 3).join(' | ')}
`;
    }

    // Deep research if Tavily is available
    const deep = await deepResearch(`What are the latest trends and challenges in the ${profile.industry} industry for ${profile.targetAudience}?`);
    if (deep.answer) {
      webResearchContext += `

## AI-Synthesized Market Analysis
${deep.answer}
`;
      sources.push(...deep.sources.map(s => ({ uri: s.url, title: s.title })));
    }
  }

  // Get business context from memory
  const businessContext = getBusinessContext(profile);

  const prompt = `
You are a world-class market research analyst with access to real-time data. Create an EXCEPTIONAL, actionable market research report.

${businessContext}

THINK STRATEGICALLY:
1. What are the biggest opportunities in this space RIGHT NOW?
2. What threats should the company be aware of?
3. What's the competition doing that works (and what doesn't)?
4. What content is resonating with the target audience?
5. What are the untapped niches or angles?

${newsContext}
${webResearchContext}
${trendingContext}

Generate a comprehensive report in Markdown format with:

# Market Research Report: ${profile.name}
*Generated: ${new Date().toLocaleDateString()} | Industry: ${profile.industry}*

## Executive Summary
(2-3 paragraph overview of key findings)

## Industry Trends ${new Date().getFullYear()}
(5-7 major trends with explanations)

## Competitive Analysis
(Key players, their strategies, your differentiation opportunities)

## Audience Insights
(Pain points, desires, content preferences, platforms they use)

## Content Strategy Recommendations
(What to post, when, where, and why)

## Social Media Landscape
(Platform-specific insights and hashtag recommendations)

## Opportunities & Threats
(SWOT-style analysis focused on actionability)

## 30-Day Action Plan
(Specific, prioritized next steps)

Be specific, data-driven, and actionable. No fluff.
`;

  try {
    const response = await callLLM(prompt, {
      type: 'reasoning',
      systemPrompt: "You are an elite market research analyst who combines data analysis with creative strategic thinking. Your reports are known for being both comprehensive and actionable. You identify opportunities others miss.",
      maxTokens: 4000
    });

    // Track in memory
    trackAction(`Generated market research for ${profile.name}`);

    return { text: response.text, sources };
  } catch (error) {
    console.error("Market Research Error:", error);
    throw error;
  }
};

/**
 * Enhanced Marketing Strategy with Creative Thinking
 */
export const generateMarketingStrategy = async (profile: CompanyProfile, researchSummary: string) => {
  // Get business context from memory
  const businessContext = getBusinessContext(profile);

  // Get trending content ideas for inspiration
  let trendingInspo = '';
  if (isWebResearchConfigured()) {
    const trends = await getSocialMediaTrends(profile.industry);
    trendingInspo = `
CURRENT SOCIAL TRENDS:
• Hot Hashtags: ${trends.hashtags.slice(0, 5).join(', ')}
• Best Posting Times: ${trends.bestTimes.join(', ')}
`;
  }

  const prompt = `
You are a visionary marketing strategist who creates campaigns that go viral and strategies that transform businesses. Think BIG.

${businessContext}

MARKET RESEARCH INSIGHTS:
${researchSummary.slice(0, 3000)}

${trendingInspo}

Create a BREAKTHROUGH marketing strategy that includes:

# 🚀 Marketing Strategy: ${profile.name}

## Brand Positioning Statement
(One powerful sentence that defines your unique position)

## The Big Idea
(A creative concept that ties everything together)

## Content Pillars (3-5)
For each pillar:
- Theme name
- Why it matters to the audience
- Example content ideas (5-10 specific posts)
- Hashtag strategy

## Platform-Specific Strategies

### Instagram
- Content mix (Reels vs Stories vs Posts %)
- Aesthetic guidelines
- Engagement tactics
- Growth hacks

### LinkedIn
- Thought leadership angles
- Post formats that work
- Engagement strategy
- B2B specific tactics

### Twitter/X
- Voice and tone
- Tweet templates
- Thread ideas
- Community engagement

## Weekly Content Calendar Template
(Day-by-day breakdown with content types)

## KPIs & Success Metrics
(Specific, measurable goals with timeframes)

## Quick Wins (First 7 Days)
(Immediately actionable items)

## Long-Term Vision (6-12 Months)
(Where this strategy leads)

Be creative, specific, and inspiring. This should be a strategy someone would pay $10,000 for.
`;

  try {
    const response = await callLLM(prompt, {
      type: 'reasoning',
      systemPrompt: "You are a marketing genius who combines creativity with data-driven strategy. You think like Gary Vee, write like Seth Godin, and execute like a Silicon Valley growth hacker. Your strategies are both visionary and practical.",
      maxTokens: 4000
    });

    // Track in memory
    trackAction(`Generated marketing strategy for ${profile.name}`);

    return response.text;
  } catch (error) {
    console.error("Strategy Generation Error:", error);
    throw error;
  }
};

/**
 * Content Topic Generation with Trend Integration and Memory
 */
export const generateContentTopics = async (profile: CompanyProfile, count: number = 5) => {
  // Get business context and topics to avoid
  const businessContext = getBusinessContext(profile);
  const topicsToAvoid = getTopicsToAvoid();

  // Get real trending topics
  let trendContext = '';
  if (isWebResearchConfigured()) {
    const news = await getLatestNews(profile.industry, 3);
    const trends = await getSocialMediaTrends(profile.industry);

    if (news.length > 0 || trends.hashtags.length > 0) {
      trendContext = `
TRENDING NOW:
• News: ${news.map(n => n.title).join('; ')}
• Hashtags: ${trends.hashtags.slice(0, 5).join(', ')}
`;
    }
  }

  const prompt = `
Generate ${count} VIRAL-WORTHY social media post ideas.

${businessContext}

${trendContext}

${topicsToAvoid}

Create posts that:
1. Stop the scroll
2. Generate engagement (comments, shares)
3. Build brand authority
4. Are timely and relevant

Mix of formats:
- Educational (teach something valuable)
- Entertaining (make them smile/laugh)
- Inspiring (motivate action)
- Behind-the-scenes (build connection)
- User engagement (questions, polls)

Return ONLY a JSON array of strings, each being a specific, compelling post idea.
Example: ["5 signs your marketing strategy needs a refresh (save this!) 🔄", "POV: When your competitor launches the campaign you were planning 😅"]
`;

  try {
    const response = await callLLM(prompt, {
      type: 'fast',
      systemPrompt: "You are a social media content creator who understands virality. You create content that people can't help but engage with. Think hook-first. Generate FRESH ideas that haven't been done before.",
      temperature: 0.9
    });

    const parsed = parseJSONFromLLM<any>(response.text);
    if (!parsed) return [];

    let topics: string[] = [];
    if (Array.isArray(parsed)) topics = parsed;
    else if (parsed.topics && Array.isArray(parsed.topics)) topics = parsed.topics;
    else if (parsed.ideas && Array.isArray(parsed.ideas)) topics = parsed.ideas;

    // Track in memory to avoid duplicates
    topics.forEach(t => addGeneratedTopic(t));
    incrementGeneratedCount('posts', topics.length);
    trackAction(`Generated ${topics.length} social media post ideas`);

    return topics;
  } catch (error) {
    console.error("Topic Generation Error:", error);
    return [];
  }
};

/**
 * Post Caption Generation with Platform Optimization and Memory
 */
export const generatePostCaption = async (profile: CompanyProfile, topic: string, platform: string) => {
  // Get business context from memory
  const businessContext = getBusinessContext(profile);

  const platformGuidelines: Record<string, string> = {
    Instagram: "Use emojis strategically, include 5-10 relevant hashtags at the end, write in a visual/aesthetic tone, max 2200 chars but hook in first line",
    LinkedIn: "Professional but personable, use line breaks for readability, storytelling format, no hashtags in the middle of text, call-to-action at end",
    Twitter: "Punchy and concise (under 280 chars), controversial or thought-provoking angles work well, 1-2 hashtags max",
    Facebook: "Conversational, encourage discussion, questions work well, can be longer form, minimal hashtags"
  };

  const prompt = `
Write a scroll-stopping ${platform} caption for this topic: "${topic}"

${businessContext}

PLATFORM RULES: ${platformGuidelines[platform] || platformGuidelines.Instagram}

CAPTION FORMULA:
1. HOOK: First line must stop the scroll
2. VALUE: Deliver on the hook's promise
3. CTA: Tell them what to do (like, comment, share, save)

Write only the caption, ready to copy-paste. No explanations.
`;

  try {
    const response = await callLLM(prompt, {
      type: 'reasoning',
      systemPrompt: `You are an expert ${platform} content creator. Your captions consistently get high engagement because you understand the platform's algorithm and audience psychology. Always stay true to the brand voice and speak directly to the target audience.`,
      temperature: 0.85
    });

    // Track the caption generation
    trackAction(`Generated ${platform} caption for: ${topic.slice(0, 50)}`);

    return response.text;
  } catch (error) {
    console.error("Caption Error:", error);
    return "Error generating caption.";
  }
};

/**
 * Image Generation via HuggingFace
 */
export const generatePostImage = async (prompt: string, config: ImageGenerationConfig) => {
  if (!HUGGINGFACE_API_KEY) {
    console.warn("Hugging Face API key missing for image generation.");
    return `https://via.placeholder.com/1024/6366f1/ffffff?text=${encodeURIComponent(prompt.slice(0, 30))}...`;
  }

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${HUGGINGFACE_IMAGE_MODEL}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) throw new Error("Image generation failed");

    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Image Gen Error:", error);
    return `https://via.placeholder.com/1024/f43f5e/ffffff?text=Image+Generation+Error`;
  }
};

/**
 * Chat Assistant with Context Awareness and Memory
 */
export const sendChatMessage = async (history: { role: string, parts: { text: string }[] }[], message: string, profile?: CompanyProfile) => {
  // Get business context if available
  const businessContext = profile ? getBusinessContext(profile) : getBusinessContext();

  // Get recent conversation from memory for continuity
  const memoryContext = getRecentConversationContext();

  // Build current conversation
  const currentConvo = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.parts[0]?.text}`).join('\n');

  const combinedPrompt = `
${businessContext}

${memoryContext}

${currentConvo}
User: ${message}

Respond helpfully based on the business context and conversation history. Be specific and actionable.`;

  try {
    const response = await callLLM(combinedPrompt, {
      type: 'fast',
      systemPrompt: `You are SocialAI Assistant, a brilliant marketing consultant who gives practical, creative advice.

KEY RULES:
- Always refer to the business profile when giving advice
- Remember the conversation context and avoid repeating yourself
- Be specific to their industry and target audience
- Give actionable recommendations, not generic advice
- If you don't know something specific about their business, ask

You're like having a CMO on speed dial. Be helpful, specific, and actionable.`
    });

    // Store in memory for future context
    addToConversation('user', message);
    addToConversation('assistant', response.text);

    return response.text;
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

/**
 * Auto-Pilot Batch Generation with Trend Integration and Memory
 */
export const generateBatchContent = async (profile: CompanyProfile, config: AutoPilotConfig) => {
  const platforms = Object.entries(config.postingFrequency)
    .filter(([_, count]) => count > 0)
    .map(([platform, count]) => ({ platform, count }));

  if (platforms.length === 0) return [];

  const totalPosts = platforms.reduce((acc, curr) => acc + curr.count, 0);

  // Get business context and topics to avoid
  const businessContext = getBusinessContext(profile);
  const topicsToAvoid = getTopicsToAvoid();

  // Get real-time trends for content inspiration
  let trendContext = '';
  if (isWebResearchConfigured()) {
    const news = await getLatestNews(profile.industry, 3);
    const trends = await getSocialMediaTrends(profile.industry);

    trendContext = `
TRENDING CONTENT TO LEVERAGE:
• Latest News: ${news.map(n => n.title).slice(0, 3).join('; ')}
• Hot Hashtags: ${trends.hashtags.slice(0, 8).join(', ')}
• Content Ideas: ${trends.contentIdeas.join('; ')}
`;
  }

  const planPrompt = `
CRITICAL: You MUST respond with ONLY a valid JSON object. No text before or after the JSON. No markdown, no explanations.

Create a viral content calendar.

${businessContext}

REQUIREMENTS:
• Cadence: ${config.cadence}
• Total Posts: ${totalPosts}
• Platform Distribution: ${JSON.stringify(platforms)}

${trendContext}

${topicsToAvoid}

For each post, provide:
1. Platform (optimized for that platform's algorithm)
2. Topic (specific, compelling idea - FRESH, not repeated)
3. Caption (ready to post, with hashtags/emojis as appropriate)
4. Image Prompt (detailed description for AI image generation)
5. Best Time (suggested posting time)

CONTENT MIX GUIDELINES:
• 40% Educational/Value
• 30% Engaging/Interactive
• 20% Behind-the-scenes/Personal
• 10% Promotional

IMPORTANT: Respond with ONLY this exact JSON structure, nothing else:
{"posts": [{"platform": "Instagram", "topic": "Your topic here", "caption": "Full caption with hashtags", "imagePrompt": "Detailed image description", "bestTime": "9:00 AM"}]}
`;

  try {
    const response = await callLLM(planPrompt, {
      type: 'reasoning',
      systemPrompt: "You are a JSON-only content calendar generator. You MUST respond with ONLY valid JSON. No explanations, no markdown, no text outside the JSON object. Generate fresh, engaging content for each platform.",
      maxTokens: 3000
    });

    const parsed = parseJSONFromLLM<any>(response.text);
    if (!parsed) return [];

    const planData = parsed.posts || parsed.content || [];

    const posts: SocialPost[] = [];
    const today = new Date();

    // Calculate days in period based on cadence
    const daysInPeriod = config.cadence === 'Daily' ? 1 : config.cadence === 'Weekly' ? 7 : 30;

    // Group posts by platform to distribute them evenly
    const platformPosts: { [key: string]: any[] } = {};
    planData.forEach((item: any) => {
      const platform = item.platform;
      if (!platformPosts[platform]) platformPosts[platform] = [];
      platformPosts[platform].push(item);
    });

    // Schedule posts with proper date distribution
    let globalIndex = 0;
    Object.entries(platformPosts).forEach(([platform, items]) => {
      const postsCount = items.length;
      const interval = postsCount > 1 ? daysInPeriod / postsCount : 1;

      items.forEach((item: any, index: number) => {
        // Calculate posting date
        const dayOffset = config.cadence === 'Daily'
          ? Math.floor(index / 3) // Max 3 posts per day for daily
          : Math.floor(index * interval);

        const postDate = new Date(today);
        postDate.setDate(today.getDate() + dayOffset + 1); // Start from tomorrow

        // Parse suggested time or use default optimal times
        let postTime = item.bestTime || '10:00 AM';
        const timeMatch = postTime.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]) || 0;
          const isPM = timeMatch[3]?.toUpperCase() === 'PM';
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
          postDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default times based on platform
          const defaultTimes: { [key: string]: number } = {
            'Instagram': 11, 'Facebook': 13, 'LinkedIn': 9,
            'Twitter': 12, 'TikTok': 19, 'YouTube': 14,
            'Pinterest': 20, 'Threads': 10
          };
          postDate.setHours(defaultTimes[platform] || 10, 0, 0, 0);
        }

        posts.push({
          id: Date.now() + globalIndex + Math.random().toString(),
          date: postDate,
          platform: item.platform as any,
          topic: item.topic,
          caption: item.caption,
          imagePrompt: item.imagePrompt,
          status: 'PendingApproval'
        });

        // Track each topic in memory
        addGeneratedTopic(item.topic);
        globalIndex++;
      });
    });

    // Sort posts by date
    posts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Track the batch generation
    incrementGeneratedCount('posts', posts.length);
    trackAction(`Generated content calendar with ${posts.length} posts`);

    return posts;
  } catch (error) {
    console.error("Batch Gen Error:", error);
    throw error;
  }
};
