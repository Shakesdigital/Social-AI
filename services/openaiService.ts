import OpenAI from "openai";
import { CompanyProfile, ImageGenerationConfig, SocialPost, AutoPilotConfig } from "../types";

// --- Configuration ---
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "your-api-key-here";

// Models
const MODEL_RESEARCH = 'gpt-4o'; // Best for research and analysis
const MODEL_STRATEGY = 'gpt-4o'; // Best for strategic thinking
const MODEL_TOPICS = 'gpt-4o-mini'; // Fast and efficient
const MODEL_CHAT = 'gpt-4o';
const MODEL_IMAGE = 'dall-e-3'; // Image generation

// Initialize OpenAI Client
const getAiClient = () => new OpenAI({ 
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should go through a backend
});

// --- API Functions ---

/**
 * 1. Automated Market Research
 * Uses GPT-4o for comprehensive research
 */
export const generateMarketResearch = async (profile: CompanyProfile) => {
  const ai = getAiClient();
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
    const response = await ai.chat.completions.create({
      model: MODEL_RESEARCH,
      messages: [
        {
          role: "system",
          content: "You are an expert market research analyst specializing in social media marketing and industry trends."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content || "No research generated.";
    
    // Note: OpenAI doesn't provide web grounding sources like Gemini
    // In production, you'd integrate with a search API separately
    const sources: any[] = [];

    return { text, sources };
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
  const ai = getAiClient();
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
    const response = await ai.chat.completions.create({
      model: MODEL_STRATEGY,
      messages: [
        {
          role: "system",
          content: "You are a strategic social media marketing consultant with deep expertise in creating comprehensive marketing plans. Think deeply about the brand positioning and provide innovative yet practical strategies."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
    });

    return response.choices[0]?.message?.content || "No strategy generated.";
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
  const ai = getAiClient();
  const prompt = `
    Generate ${count} specific, engaging social media post ideas for ${profile.name} (${profile.industry}).
    Focus on: ${profile.goals}.
    Audience: ${profile.targetAudience}.

    Return ONLY a JSON array of strings, where each string is a topic summary.
    Example: ["Behind the scenes of our new product", "Customer testimonial video", "Industry tip #1"]
  `;

  try {
    const response = await ai.chat.completions.create({
      model: MODEL_TOPICS,
      messages: [
        {
          role: "system",
          content: "You are a creative social media content strategist. Generate engaging, specific post ideas that resonate with the target audience."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return [];
    
    // Parse the JSON response
    const parsed = JSON.parse(text);
    // Handle different possible JSON structures
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.topics && Array.isArray(parsed.topics)) {
      return parsed.topics;
    } else if (parsed.ideas && Array.isArray(parsed.ideas)) {
      return parsed.ideas;
    }
    
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
  const ai = getAiClient();
  const prompt = `
    Write a social media caption for ${platform}.
    Topic: ${topic}
    Company: ${profile.name}
    Voice: ${profile.brandVoice}

    Include relevant emojis and 3-5 hashtags appropriate for ${platform}.
    Return just the caption text, ready to post.
  `;

  try {
    const response = await ai.chat.completions.create({
      model: MODEL_STRATEGY,
      messages: [
        {
          role: "system",
          content: `You are an expert social media copywriter specializing in ${platform}. Write engaging, platform-optimized captions that drive engagement.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
    });

    return response.choices[0]?.message?.content || "";
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
  const ai = getAiClient();

  // Map size to DALL-E 3 format
  let size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024";
  
  if (config.aspectRatio === "16:9") {
    size = "1792x1024";
  } else if (config.aspectRatio === "9:16") {
    size = "1024x1792";
  }

  try {
    const response = await ai.images.generate({
      model: MODEL_IMAGE,
      prompt: prompt,
      n: 1,
      size: size,
      quality: "standard",
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    // Convert URL to base64 for consistent handling
    const imageResponse = await fetch(imageUrl);
    const blob = await imageResponse.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

/**
 * 6. Chat Assistant
 */
export const sendChatMessage = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
  const ai = getAiClient();
  
  // Convert Gemini format to OpenAI format
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are SocialAI Assistant, a helpful and knowledgeable social media marketing consultant. Provide practical advice, creative ideas, and strategic insights for social media marketing."
    }
  ];
  
  // Add history
  history.forEach(msg => {
    const role = msg.role === 'model' ? 'assistant' : 'user';
    const content = msg.parts[0]?.text || '';
    messages.push({
      role: role as 'user' | 'assistant',
      content: content
    });
  });
  
  // Add current message
  messages.push({
    role: "user",
    content: message
  });
  
  try {
    const response = await ai.chat.completions.create({
      model: MODEL_CHAT,
      messages: messages,
      temperature: 0.8,
    });
    
    return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

/**
 * 7. Auto-Pilot Batch Generation
 */
export const generateBatchContent = async (profile: CompanyProfile, config: AutoPilotConfig) => {
  const ai = getAiClient();
  const platforms = Object.entries(config.postingFrequency)
    .filter(([_, count]) => count > 0)
    .map(([platform, count]) => ({ platform, count }));

  if (platforms.length === 0) return [];

  // 1. Generate a Plan (Topics & Schedule distribution)
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
    const planResponse = await ai.chat.completions.create({
      model: MODEL_STRATEGY,
      messages: [
        {
          role: "system",
          content: "You are an expert social media content planner. Create comprehensive, engaging content calendars with platform-optimized posts."
        },
        {
          role: "user",
          content: planPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const text = planResponse.choices[0]?.message?.content;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    const planData = parsed.posts || parsed.content || [];
    
    // Convert to SocialPost objects
    const posts: SocialPost[] = [];
    const today = new Date();
    
    // Helper to distribute dates roughly evenly
    const daysInPeriod = config.cadence === 'Weekly' ? 7 : 30;
    
    // Sort logic can be complex, here we simple stagger them
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
