
export interface CompanyProfile {
  id: string; // Unique identifier for each profile
  name: string;
  industry: string;
  description: string;
  targetAudience: string;
  brandVoice: string;
  goals: string;
  createdAt?: string; // ISO date string
  // Website & Social Media
  website?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    pinterest?: string;
    threads?: string;
  };
}

// Multi-profile storage structure
export interface ProfilesStore {
  profiles: CompanyProfile[];
  activeProfileId: string | null;
}

export interface ResearchReport {
  rawContent: string;
  sources: { uri: string; title: string }[];
  lastUpdated: string;
}

export interface MarketingStrategy {
  rawContent: string;
  lastUpdated: string;
}

export interface SocialPost {
  id: string;
  date: Date;
  platform: 'Instagram' | 'LinkedIn' | 'Twitter' | 'Facebook';
  topic: string;
  caption: string;
  imagePrompt?: string;
  imageUrl?: string;
  status: 'Draft' | 'PendingApproval' | 'Scheduled' | 'Published';
}

// ============================================
// LEAD GENERATION TYPES
// ============================================

export interface Lead {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  size: string;
  contactEmail?: string;
  contactName?: string;
  website?: string;
  linkedIn?: string;
  summary: string;
  outreachPotential: 'High' | 'Medium' | 'Low';
  createdAt: Date;
  notes?: string;
  isVerified?: boolean; // Whether website URL has been validated as active
}

export interface LeadSearchCriteria {
  industry: string;
  location: string;
  companySize: string;
  keywords: string[];
}

// ============================================
// EMAIL MARKETING TYPES
// ============================================

export interface EmailCampaign {
  id: string;
  name: string;
  status: 'Draft' | 'Scheduled' | 'Active' | 'Completed' | 'Paused';
  leadIds: string[];
  emails: EmailTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  subject: string;
  body: string;
  variant: 'A' | 'B';
  scheduledDate?: Date;
  delayDays?: number; // For drip sequences
  sent: boolean;
  openCount?: number;
  clickCount?: number;
}

// ============================================
// BLOG CONTENT TYPES
// ============================================

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  seoKeywords: string[];
  seoScore?: number;
  trendingTopic: string;
  status: 'Draft' | 'Scheduled' | 'Published';
  scheduledDate?: Date;
  publishedDate?: Date;
  wordpressPostId?: string;
  wordCount: number;
}

export interface TrendingTopic {
  id: string;
  topic: string;
  category: string;
  trendScore: number;
  relatedKeywords: string[];
  source: string;
  researchedAt: Date;
}

// ============================================
// APP NAVIGATION
// ============================================

export enum AppView {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  RESEARCH = 'RESEARCH',
  STRATEGY = 'STRATEGY',
  CALENDAR = 'CALENDAR',
  LEADS = 'LEADS',
  EMAIL = 'EMAIL',
  BLOG = 'BLOG',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS',
}

export interface ImageGenerationConfig {
  size: '1K' | '2K' | '4K';
  aspectRatio: '1:1' | '16:9' | '9:16';
}

export interface LiveSessionState {
  isActive: boolean;
  isMuted: boolean;
  volume: number;
}

export interface AutoPilotConfig {
  enabled: boolean;
  cadence: 'Daily' | 'Weekly' | 'Monthly';
  postingFrequency: {
    Instagram: number;
    LinkedIn: number;
    Twitter: number;
    Facebook: number;
    TikTok: number;
    YouTube: number;
    Pinterest: number;
    Threads: number;
    [key: string]: number; // Allow dynamic platform access
  };
  autoApprove: boolean;
  // Scheduled generation settings
  isScheduled?: boolean;
  nextGenerationTime?: string; // ISO date string for persistence
  intervalHours?: number; // Hours between auto-generations
}

// ============================================
// LLM PROVIDER TYPES
// ============================================

export type LLMProvider = 'groq' | 'openrouter' | 'huggingface' | 'openai';

export interface LLMQuotaStatus {
  provider: LLMProvider;
  used: number;
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  tokensUsed?: number;
}

// ============================================
// SOCIAL MEDIA CONNECTION TYPES
// ============================================

export type SocialPlatform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest' | 'threads';

export interface SocialConnection {
  platform: SocialPlatform;
  isConnected: boolean;
  profileUrl?: string;
  profileName?: string;
  accessToken?: string; // Stored securely
  refreshToken?: string;
  tokenExpiry?: Date;
  lastSync?: Date;
  followerCount?: number;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  website?: {
    visitors: number;
    pageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
    topPages: { page: string; views: number }[];
  };
  social?: {
    platform: SocialPlatform;
    followers: number;
    followersGrowth: number;
    impressions: number;
    engagement: number;
    engagementRate: number;
    posts: number;
    topPosts: { id: string; engagement: number }[];
  }[];
  leads?: {
    generated: number;
    converted: number;
    conversionRate: number;
  };
}

// ============================================
// SCHEDULED POST TYPES
// ============================================

export interface ScheduledPost extends SocialPost {
  scheduledTime: Date;
  platforms: SocialPlatform[];
  autoPublish: boolean;
  publishedAt?: Date;
  publishError?: string;
  retryCount?: number;
}
