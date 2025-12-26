/**
 * Context Memory Service
 * Provides persistent memory and business context for all marketing components
 * Prevents hallucination and repetition by tracking generated content
 */

import { CompanyProfile, Lead, BlogPost, EmailTemplate } from '../types';

// Memory storage keys
const MEMORY_KEYS = {
    PROFILE: 'socialai_profile',
    GENERATED_TOPICS: 'socialai_generated_topics',
    GENERATED_LEADS: 'socialai_generated_leads',
    GENERATED_EMAILS: 'socialai_generated_emails',
    GENERATED_BLOGS: 'socialai_generated_blogs',
    CONVERSATION_HISTORY: 'socialai_conversation_history',
    SESSION_CONTEXT: 'socialai_session_context'
};

// Types
export interface SessionContext {
    lastActivity: string;
    currentFocus: string;
    recentActions: string[];
    generatedCount: {
        leads: number;
        emails: number;
        blogs: number;
        posts: number;
    };
}

export interface ConversationMemory {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    topic?: string;
}

// --- Profile Context ---

export function getStoredProfile(): CompanyProfile | null {
    try {
        const stored = localStorage.getItem(MEMORY_KEYS.PROFILE);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

export function saveProfile(profile: CompanyProfile): void {
    localStorage.setItem(MEMORY_KEYS.PROFILE, JSON.stringify(profile));
}

/**
 * Generate a rich business context string for LLM prompts
 */
export function getBusinessContext(profile?: CompanyProfile | null): string {
    const p = profile || getStoredProfile();
    if (!p) return '';

    return `
═══════════════════════════════════════════════════════════
BUSINESS PROFILE (Use this context for ALL responses)
═══════════════════════════════════════════════════════════
• Company Name: ${p.name}
• Industry: ${p.industry}
• Description: ${p.description}
• Target Audience: ${p.targetAudience}
• Marketing Goals: ${p.goals}
• Brand Voice: ${p.brandVoice}

IMPORTANT: All content must align with this brand identity.
Do NOT make up information about the company.
Do NOT suggest strategies that contradict the stated goals.
═══════════════════════════════════════════════════════════
`.trim();
}

// --- Generated Content Memory ---

/**
 * Track generated topics to avoid repetition
 */
export function getGeneratedTopics(): string[] {
    try {
        const stored = localStorage.getItem(MEMORY_KEYS.GENERATED_TOPICS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function addGeneratedTopic(topic: string): void {
    const topics = getGeneratedTopics();
    // Keep last 50 topics
    const updated = [...topics, topic].slice(-50);
    localStorage.setItem(MEMORY_KEYS.GENERATED_TOPICS, JSON.stringify(updated));
}

export function getTopicsToAvoid(): string {
    const topics = getGeneratedTopics();
    if (topics.length === 0) return '';

    return `
PREVIOUSLY GENERATED TOPICS (Do NOT repeat these):
${topics.slice(-15).map((t, i) => `${i + 1}. ${t}`).join('\n')}

Generate FRESH, UNIQUE ideas that are different from the above.
`;
}

/**
 * Track generated leads
 */
export function getGeneratedLeads(): Partial<Lead>[] {
    try {
        const stored = localStorage.getItem(MEMORY_KEYS.GENERATED_LEADS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function addGeneratedLeads(leads: Partial<Lead>[]): void {
    const existing = getGeneratedLeads();
    // Keep last 100 leads
    const updated = [...existing, ...leads.map(l => ({
        companyName: l.companyName,
        industry: l.industry
    }))].slice(-100);
    localStorage.setItem(MEMORY_KEYS.GENERATED_LEADS, JSON.stringify(updated));
}

export function getLeadsToAvoid(): string {
    const leads = getGeneratedLeads();
    if (leads.length === 0) return '';

    const companies = leads.slice(-20).map(l => l.companyName).filter(Boolean);
    if (companies.length === 0) return '';

    return `
PREVIOUSLY GENERATED LEADS (Avoid duplicating these companies):
${companies.join(', ')}

Generate NEW companies that are not in this list.
`;
}

/**
 * Track generated emails
 */
export function getGeneratedEmailSubjects(): string[] {
    try {
        const stored = localStorage.getItem(MEMORY_KEYS.GENERATED_EMAILS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function addGeneratedEmailSubject(subject: string): void {
    const subjects = getGeneratedEmailSubjects();
    const updated = [...subjects, subject].slice(-30);
    localStorage.setItem(MEMORY_KEYS.GENERATED_EMAILS, JSON.stringify(updated));
}

export function getEmailSubjectsToAvoid(): string {
    const subjects = getGeneratedEmailSubjects();
    if (subjects.length === 0) return '';

    return `
PREVIOUSLY USED EMAIL SUBJECTS (Use different approaches):
${subjects.slice(-10).map((s, i) => `${i + 1}. "${s}"`).join('\n')}

Create FRESH subject lines with different angles/hooks.
`;
}

/**
 * Track generated blog titles
 */
export function getGeneratedBlogTitles(): string[] {
    try {
        const stored = localStorage.getItem(MEMORY_KEYS.GENERATED_BLOGS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function addGeneratedBlogTitle(title: string): void {
    const titles = getGeneratedBlogTitles();
    const updated = [...titles, title].slice(-30);
    localStorage.setItem(MEMORY_KEYS.GENERATED_BLOGS, JSON.stringify(updated));
}

export function getBlogTitlesToAvoid(): string {
    const titles = getGeneratedBlogTitles();
    if (titles.length === 0) return '';

    return `
PREVIOUSLY WRITTEN BLOG TOPICS (Cover new topics):
${titles.slice(-10).map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Suggest DIFFERENT topics and angles not already covered.
`;
}

// --- Conversation Memory ---

export function getConversationHistory(): ConversationMemory[] {
    try {
        const stored = localStorage.getItem(MEMORY_KEYS.CONVERSATION_HISTORY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function addToConversation(role: 'user' | 'assistant', content: string, topic?: string): void {
    const history = getConversationHistory();
    const updated = [...history, {
        role,
        content: content.slice(0, 500), // Limit stored length
        timestamp: new Date().toISOString(),
        topic
    }].slice(-20); // Keep last 20 messages
    localStorage.setItem(MEMORY_KEYS.CONVERSATION_HISTORY, JSON.stringify(updated));
}

export function getRecentConversationContext(): string {
    const history = getConversationHistory();
    if (history.length === 0) return '';

    const recent = history.slice(-6);
    return `
RECENT CONVERSATION CONTEXT:
${recent.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`).join('\n')}
`;
}

// --- Session Context ---

export function getSessionContext(): SessionContext {
    try {
        const stored = localStorage.getItem(MEMORY_KEYS.SESSION_CONTEXT);
        if (stored) {
            const ctx = JSON.parse(stored);
            // Reset if last activity was more than 24 hours ago
            const lastActivity = new Date(ctx.lastActivity);
            const now = new Date();
            if (now.getTime() - lastActivity.getTime() > 24 * 60 * 60 * 1000) {
                return createFreshSession();
            }
            return ctx;
        }
    } catch { }
    return createFreshSession();
}

function createFreshSession(): SessionContext {
    const session: SessionContext = {
        lastActivity: new Date().toISOString(),
        currentFocus: '',
        recentActions: [],
        generatedCount: { leads: 0, emails: 0, blogs: 0, posts: 0 }
    };
    localStorage.setItem(MEMORY_KEYS.SESSION_CONTEXT, JSON.stringify(session));
    return session;
}

export function updateSessionContext(updates: Partial<SessionContext>): void {
    const current = getSessionContext();
    const updated = {
        ...current,
        ...updates,
        lastActivity: new Date().toISOString()
    };
    localStorage.setItem(MEMORY_KEYS.SESSION_CONTEXT, JSON.stringify(updated));
}

export function trackAction(action: string): void {
    const ctx = getSessionContext();
    const actions = [...ctx.recentActions, action].slice(-10);
    updateSessionContext({ recentActions: actions });
}

export function incrementGeneratedCount(type: 'leads' | 'emails' | 'blogs' | 'posts', count: number = 1): void {
    const ctx = getSessionContext();
    updateSessionContext({
        generatedCount: {
            ...ctx.generatedCount,
            [type]: (ctx.generatedCount[type] || 0) + count
        }
    });
}

// --- Complete Context Builder ---

/**
 * Build complete context for LLM prompts including business profile and memory
 */
export function buildFullContext(profile?: CompanyProfile | null, options?: {
    includeTopicsToAvoid?: boolean;
    includeLeadsToAvoid?: boolean;
    includeEmailsToAvoid?: boolean;
    includeBlogsToAvoid?: boolean;
    includeConversation?: boolean;
}): string {
    const parts: string[] = [];

    // Business profile (always include)
    const businessContext = getBusinessContext(profile);
    if (businessContext) parts.push(businessContext);

    // Memory-based context
    if (options?.includeTopicsToAvoid) {
        const topics = getTopicsToAvoid();
        if (topics) parts.push(topics);
    }

    if (options?.includeLeadsToAvoid) {
        const leads = getLeadsToAvoid();
        if (leads) parts.push(leads);
    }

    if (options?.includeEmailsToAvoid) {
        const emails = getEmailSubjectsToAvoid();
        if (emails) parts.push(emails);
    }

    if (options?.includeBlogsToAvoid) {
        const blogs = getBlogTitlesToAvoid();
        if (blogs) parts.push(blogs);
    }

    if (options?.includeConversation) {
        const convo = getRecentConversationContext();
        if (convo) parts.push(convo);
    }

    return parts.join('\n\n');
}

// --- Clear Memory ---

export function clearAllMemory(): void {
    Object.values(MEMORY_KEYS).forEach(key => {
        if (key !== MEMORY_KEYS.PROFILE) { // Keep profile
            localStorage.removeItem(key);
        }
    });
}

export function clearContentMemory(): void {
    localStorage.removeItem(MEMORY_KEYS.GENERATED_TOPICS);
    localStorage.removeItem(MEMORY_KEYS.GENERATED_LEADS);
    localStorage.removeItem(MEMORY_KEYS.GENERATED_EMAILS);
    localStorage.removeItem(MEMORY_KEYS.GENERATED_BLOGS);
}
