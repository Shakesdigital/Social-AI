import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
import { CompanyProfile, ImageGenerationConfig, SocialPost, AutoPilotConfig } from "../types";

// --- Configuration ---
// Models
const MODEL_RESEARCH = 'gemini-2.5-flash';
const MODEL_STRATEGY = 'gemini-3-pro-preview';
const MODEL_TOPICS = 'gemini-2.5-flash-lite-latest'; // "Fast AI responses"
const MODEL_IMAGE = 'gemini-3-pro-image-preview'; // Supports 1K, 2K, 4K
const MODEL_CHAT = 'gemini-3-pro-preview';

// --- API Key Helper ---
export const getApiKey = () => {
    let key = '';

    // 1. Try process.env (Node/Webpack/Sandbox)
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
        key = process.env.API_KEY;
    }
    
    // 2. Try import.meta.env (Vite/Netlify)
    // @ts-ignore
    if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        if (import.meta.env.VITE_API_KEY) key = import.meta.env.VITE_API_KEY;
        // @ts-ignore
        else if (import.meta.env.GOOGLE_API_KEY) key = import.meta.env.GOOGLE_API_KEY;
        // @ts-ignore
        else if (import.meta.env.REACT_APP_API_KEY) key = import.meta.env.REACT_APP_API_KEY;
    }

    if (key) {
        // Safe logging for debug (only show first 4 chars)
        console.log(`[GeminiService] API Key found: ${key.substring(0, 4)}...`);
        return key.trim();
    } else {
        console.error("[GeminiService] API Key NOT found. Checked process.env.API_KEY, VITE_API_KEY, REACT_APP_API_KEY.");
        return '';
    }
};

// Initialize Client
const getAiClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn("Gemini API Key is missing. Features will not work.");
        // Return a dummy client to prevent immediate crash, calls will fail gracefully
        return new GoogleGenAI({ apiKey: 'MISSING_KEY' });
    }
    return new GoogleGenAI({ apiKey });
};

// --- API Functions ---

/**
 * 1. Automated Market Research
 * Uses Gemini 2.5 Flash + Google Search Grounding
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

    Provide the output in Markdown format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_RESEARCH,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No research generated.";
    // Extract grounding chunks for sources
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web) || [];

    return { text, sources };
  } catch (error: any) {
    console.error("Market Research Error:", error);
    throw new Error(error.message || "Failed to generate market research");
  }
};

/**
 * 2. Intelligent Marketing Plan
 * Uses Gemini 3.0 Pro + Thinking Mode
 */
export const generateMarketingStrategy = async (profile: CompanyProfile, researchSummary: string) => {
  const ai = getAiClient();
  const prompt = `
    Based on the following company profile and market research, create a detailed social media marketing strategy.

    Company Profile:
    ${JSON.stringify(profile)}

    Market Research Summary:
    ${researchSummary.slice(0, 2000)}... (truncated for context)

    The strategy should include:
    1. Core Content Pillars.
    2. Key Messaging.
    3. Platform-specific strategies (Instagram, LinkedIn, Twitter, etc.).
    4. A weekly posting cadence.
    5. Measurable KPIs.

    Be strategic, insightful, and practical.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_STRATEGY,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking for deep reasoning
      },
    });

    return response.text || "No strategy generated.";
  } catch (error: any) {
    console.error("Strategy Generation Error:", error);
    throw new Error(error.message || "Failed to generate strategy");
  }
};

/**
 * 3. Content Topic Generation
 * Uses Gemini 2.5 Flash Lite for Speed
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
    const response = await ai.models.generateContent({
      model: MODEL_TOPICS,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Topic Generation Error:", error);
    return ["Error generating topics. Please try again."];
  }
};

/**
 * 4. Post Caption Generation
 * Uses Gemini 3.0 Pro for creativity
 */
export const generatePostCaption = async (profile: CompanyProfile, topic: string, platform: string) => {
  const ai = getAiClient();
  const prompt = `
    Write a social media caption for ${platform}.
    Topic: ${topic}
    Company: ${profile.name}
    Voice: ${profile.brandVoice}

    Include relevant emojis and 3-5 hashtags.
    Return just the caption text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_STRATEGY, // Using Pro for better writing
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Caption Error:", error);
    return "Error generating caption.";
  }
};

/**
 * 5. Image Generation
 * Uses Gemini 3 Pro Image Preview
 */
export const generatePostImage = async (prompt: string, config: ImageGenerationConfig) => {
  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          imageSize: config.size,
          aspectRatio: config.aspectRatio,
        },
      },
    });

    // Parse response for image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
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
    const chat = ai.chats.create({
        model: MODEL_CHAT,
        history: history,
    });
    
    const result = await chat.sendMessage({ message });
    return result.text;
}

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
    
    Return a JSON array of objects with keys: "platform", "topic", "caption", "imagePrompt".
  `;

  try {
    const planResponse = await ai.models.generateContent({
      model: MODEL_STRATEGY, // Use Pro for intelligent planning
      contents: planPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    platform: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    caption: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                }
            }
        }
      }
    });

    const planData = JSON.parse(planResponse.text || "[]");
    
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