
export interface CompanyProfile {
  name: string;
  industry: string;
  description: string;
  targetAudience: string;
  brandVoice: string;
  goals: string;
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

export enum AppView {
  LANDING = 'LANDING',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  RESEARCH = 'RESEARCH',
  STRATEGY = 'STRATEGY',
  CALENDAR = 'CALENDAR',
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
  cadence: 'Weekly' | 'Monthly';
  postingFrequency: {
    Instagram: number;
    LinkedIn: number;
    Twitter: number;
    Facebook: number;
  };
  autoApprove: boolean;
}
