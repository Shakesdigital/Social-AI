import { CompanyProfile, ImageGenerationConfig, SocialPost, AutoPilotConfig } from "../types";
import { callLLM, parseJSONFromLLM } from "./freeLLMService";

// Free Image Generation via Hugging Face (Alternative to DALL-E)
const HUGGINGFACE_IMAGE_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';

// --- API Functions ---

/**
 * 1. Automated Market Research
 * Uses GPT-4o for comprehensive research
 */
export const generateMarketResearch = async (profile: CompanyProfile) => {
  const prompt = `
    Conduct a comprehensive market research report for a company named "${profile.name}" in the "${profile.industry}" industry.
    Description: ${profile.description}
    Target Audience: ${profile.targetAudience}

    Research the following:
    1. Current industry trends in 2024/2025.
    2. Competitor analysis (general).
    3. Popular content formats and hashtags.
    4. Audience sentiment and pain points.

    Provide the output in Markdown format with detailed insights and actionable recommendations.
  `;

  try {
    const response = await callLLM(prompt, {
      type: 'reasoning',
      systemPrompt: "You are an expert market research analyst specializing in social media marketing and industry trends."
    });

    return { text: response.text, sources: [] };
  } catch (error) {
    console.error("Market Research Error:", error);
    throw error;
  }
};

/**
 * 2. Intelligent Marketing Plan
 * Uses GPT-4o for deep strategic thinking
 */
export const generateMarketingStrategy = async (profile: CompanyProfile, researchSummary: string) => {
  const prompt = `
    Based on the following company profile and market research, create a detailed social media marketing strategy.

    Company Profile:
    ${JSON.stringify(profile, null, 2)}

    Market Research Summary:
    ${researchSummary.slice(0, 4000)}... (truncated for context)

    The strategy should include:
    1. Core Content Pillars.
    2. Key Messaging.
    3. Platform-specific strategies (Instagram, LinkedIn, Twitter, etc.).
    4. A weekly posting cadence.
    5. Measurable KPIs.

    Be strategic, insightful, and practical. Provide actionable recommendations.
  `;

  try {
    const response = await callLLM(prompt, {
      type: 'reasoning',
      systemPrompt: "You are a strategic social media marketing consultant with deep expertise in creating comprehensive marketing plans. Think deeply about the brand positioning and provide innovative yet practical strategies."
    });

    return response.text;
  } catch (error) {
    console.error("Strategy Generation Error:", error);
    throw error;
  }
};

/**
 * 3. Content Topic Generation
 * Uses GPT-4o-mini for Speed
 */
export const generateContentTopics = async (profile: CompanyProfile, count: number = 5) => {
  const prompt = `
    Generate ${count} specific, engaging social media post ideas for ${profile.name} (${profile.industry}).
    Focus on: ${profile.goals}.
    Audience: ${profile.targetAudience}.

    Return ONLY a JSON array of strings, where each string is a topic summary.
    Example: ["Behind the scenes of our new product", "Customer testimonial video", "Industry tip #1"]
  `;

  try {
    const response = await callLLM(prompt, {
      type: 'fast',
      systemPrompt: "You are a creative social media content strategist. Generate engaging, specific post ideas that resonate with the target audience. Return ONLY valid JSON."
    });

    const parsed = parseJSONFromLLM<any>(response.text);
    if (!parsed) return [];

    if (Array.isArray(parsed)) return parsed;
    if (parsed.topics && Array.isArray(parsed.topics)) return parsed.topics;
    if (parsed.ideas && Array.isArray(parsed.ideas)) return parsed.ideas;

    return [];
  } catch (error) {
    console.error("Topic Generation Error:", error);
    return [];
  }
};

/**
 * 4. Post Caption Generation
 * Uses GPT-4o for creativity
 */
export const generatePostCaption = async (profile: CompanyProfile, topic: string, platform: string) => {
  const prompt = `
    Write a social media caption for ${platform}.
    Topic: ${topic}
    Company: ${profile.name}
    Voice: ${profile.brandVoice}

    Include relevant emojis and 3-5 hashtags appropriate for ${platform}.
    Return just the caption text, ready to post.
  `;

  try {
    const response = await callLLM(prompt, {
      type: 'reasoning',
      systemPrompt: `You are an expert social media copywriter specializing in ${platform}. Write engaging, platform-optimized captions that drive engagement.`
    });

    return response.text;
  } catch (error) {
    console.error("Caption Error:", error);
    return "Error generating caption.";
  }
};

/**
 * 5. Image Generation
 * Uses DALL-E 3
 */
export const generatePostImage = async (prompt: string, config: ImageGenerationConfig) => {
  if (!HUGGINGFACE_API_KEY) {
    console.warn("Hugging Face API key missing for image generation. Please add VITE_HUGGINGFACE_API_KEY.");
    // Return a nice placeholder gradient based on prompt
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
 * 6. Chat Assistant
 */
export const sendChatMessage = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  const combinedPrompt = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.parts[0]?.text}`).join('\n') + `\nUser: ${message}`;

  try {
    const response = await callLLM(combinedPrompt, {
      type: 'fast',
      systemPrompt: "You are SocialAI Assistant, a helpful and knowledgeable social media marketing consultant. Provide practical advice, creative ideas, and strategic insights for social media marketing."
    });

    return response.text;
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

/**
 * 7. Auto-Pilot Batch Generation
 */
export const generateBatchContent = async (profile: CompanyProfile, config: AutoPilotConfig) => {
  const platforms = Object.entries(config.postingFrequency)
    .filter(([_, count]) => count > 0)
    .map(([platform, count]) => ({ platform, count }));

  if (platforms.length === 0) return [];

  const totalPosts = platforms.reduce((acc, curr) => acc + curr.count, 0);

  const planPrompt = `
    Create a content plan for ${profile.name} (${profile.industry}).
    Cadence: ${config.cadence}
    Total Posts Needed: ${totalPosts}
    Distribution per platform: ${JSON.stringify(platforms)}
    Goals: ${profile.goals}
    Target Audience: ${profile.targetAudience}
    Brand Voice: ${profile.brandVoice}
    
    For each post, provide:
    1. Platform
    2. Topic (specific idea)
    3. Suggested Caption (optimized for platform, engaging, with emojis/hashtags)
    4. Image Prompt (detailed visual description for AI generation)
    
    Return a JSON object with a "posts" array containing objects with keys: "platform", "topic", "caption", "imagePrompt".
  `;

  try {
    const response = await callLLM(planPrompt, {
      type: 'reasoning',
      systemPrompt: "You are an expert social media content planner. Create comprehensive, engaging content calendars with platform-optimized posts. Return ONLY valid JSON."
    });

    const parsed = parseJSONFromLLM<any>(response.text);
    if (!parsed) return [];

    const planData = parsed.posts || parsed.content || [];

    const posts: SocialPost[] = [];
    const today = new Date();
    const daysInPeriod = config.cadence === 'Weekly' ? 7 : 30;

    planData.forEach((item: any, index: number) => {
      const dayOffset = (index % daysInPeriod) + 1;
      const postDate = new Date(today);
      postDate.setDate(today.getDate() + dayOffset);

      posts.push({
        id: Date.now() + index + Math.random().toString(),
        date: postDate,
        platform: item.platform as any,
        topic: item.topic,
        caption: item.caption,
        imagePrompt: item.imagePrompt,
        status: 'PendingApproval'
      });
    });

    return posts;
  } catch (error) {
    console.error("Batch Gen Error:", error);
    throw error;
  }
};
