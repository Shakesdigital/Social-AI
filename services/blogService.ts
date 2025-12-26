import { CompanyProfile, BlogPost, TrendingTopic } from '../types';
import { callLLM, parseJSONFromLLM, LLMOptions } from './freeLLMService';

// Research trending topics in a niche
export async function researchTrendingTopics(
    niche: string,
    profile: CompanyProfile,
    count: number = 5
): Promise<TrendingTopic[]> {
    const prompt = `
You are a content marketing specialist. Research and generate ${count} trending blog topics for:

COMPANY: ${profile.name}
NICHE: ${niche}
INDUSTRY: ${profile.industry}
TARGET AUDIENCE: ${profile.targetAudience}

Generate topics that are:
1. Currently trending or evergreen with high search interest
2. Relevant to the target audience
3. Aligned with the company's expertise
4. SEO-friendly with good keyword potential

Return JSON array:
[
  {
    "topic": "Full blog title idea",
    "category": "Category (e.g., How-To, Industry Trends, Case Study)",
    "trendScore": 85,
    "relatedKeywords": ["keyword1", "keyword2", "keyword3"],
    "source": "Social media trends / Industry news / Search trends"
  }
]`;

    const response = await callLLM(prompt, {
        type: 'reasoning',
        systemPrompt: 'You are a content marketing and SEO specialist.',
        temperature: 0.8
    });

    const parsed = parseJSONFromLLM<any[]>(response.text);

    if (!parsed || !Array.isArray(parsed)) {
        return [];
    }

    return parsed.map((item, index) => ({
        id: `topic-${Date.now()}-${index}`,
        topic: item.topic || 'Untitled Topic',
        category: item.category || 'General',
        trendScore: item.trendScore || 70,
        relatedKeywords: item.relatedKeywords || [],
        source: item.source || 'AI Research',
        researchedAt: new Date()
    }));
}

// Generate a full blog post
export async function generateBlogPost(
    topic: TrendingTopic,
    profile: CompanyProfile,
    wordCount: number = 1200
): Promise<BlogPost> {
    const prompt = `
Write a comprehensive, SEO-optimized blog post:

TOPIC: ${topic.topic}
CATEGORY: ${topic.category}
TARGET KEYWORDS: ${topic.relatedKeywords.join(', ')}

COMPANY CONTEXT:
- Name: ${profile.name}
- Industry: ${profile.industry}
- Brand Voice: ${profile.brandVoice}
- Target Audience: ${profile.targetAudience}

REQUIREMENTS:
1. Write approximately ${wordCount} words
2. Include an attention-grabbing headline
3. Create a compelling meta description (under 160 chars)
4. Use H2 and H3 subheadings for structure
5. Naturally incorporate target keywords
6. Include actionable takeaways
7. End with a strong call-to-action
8. Match the brand voice

Return JSON:
{
  "title": "SEO-optimized blog title",
  "excerpt": "Meta description under 160 characters",
  "content": "Full blog post in Markdown format with ## and ### headings",
  "seoKeywords": ["optimized", "keyword", "list"],
  "seoScore": 85
}`;

    const response = await callLLM(prompt, {
        type: 'reasoning',
        systemPrompt: 'You are an expert content writer and SEO specialist. Write engaging, well-researched blog posts.',
        temperature: 0.7,
        maxTokens: 3000
    });

    const parsed = parseJSONFromLLM<{
        title: string;
        excerpt: string;
        content: string;
        seoKeywords: string[];
        seoScore: number;
    }>(response.text);

    const content = parsed?.content || 'Failed to generate content.';

    return {
        id: `post-${Date.now()}`,
        title: parsed?.title || topic.topic,
        content,
        excerpt: parsed?.excerpt,
        seoKeywords: parsed?.seoKeywords || topic.relatedKeywords,
        seoScore: parsed?.seoScore || 70,
        trendingTopic: topic.topic,
        status: 'Draft',
        wordCount: content.split(/\s+/).length
    };
}

// Analyze and suggest SEO improvements
export async function analyzeSEO(content: string, keywords: string[]): Promise<{
    score: number;
    suggestions: string[];
}> {
    const prompt = `
Analyze this blog post for SEO:

CONTENT:
${content.slice(0, 2000)}...

TARGET KEYWORDS: ${keywords.join(', ')}

Provide:
1. SEO score (0-100)
2. List of specific improvement suggestions

Return JSON:
{
  "score": 75,
  "suggestions": ["Add more internal links", "Improve meta description", ...]
}`;

    const response = await callLLM(prompt, { type: 'fast', temperature: 0.5 });
    const parsed = parseJSONFromLLM<{ score: number; suggestions: string[] }>(response.text);

    return {
        score: parsed?.score || 70,
        suggestions: parsed?.suggestions || []
    };
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
    // const response = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/posts`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${btoa(`${WORDPRESS_USER}:${WORDPRESS_APP_PASSWORD}`)}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     title: post.title,
    //     content: post.content,
    //     status: 'draft'
    //   })
    // });

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
