/**
 * State Persistence Service
 * Saves and loads component states to localStorage so users can switch between
 * components without losing their work.
 */

const STORAGE_KEYS = {
    CALENDAR: 'socialai_calendar_state',
    LEADS: 'socialai_leads_state',
    EMAIL: 'socialai_email_state',
    BLOG: 'socialai_blog_state',
    RESEARCH: 'socialai_research_state',
    STRATEGY: 'socialai_strategy_state',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// Helper to safely serialize dates and other special types
function serialize(data: any): string {
    return JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
        }
        return value;
    });
}

// Helper to deserialize dates and other special types
function deserialize<T>(json: string): T | null {
    try {
        return JSON.parse(json, (key, value) => {
            if (value && typeof value === 'object' && value.__type === 'Date') {
                return new Date(value.value);
            }
            return value;
        });
    } catch (e) {
        console.warn('[StateService] Failed to parse stored state:', e);
        return null;
    }
}

// Save state to localStorage
export function saveState<T>(key: StorageKey, state: T): void {
    try {
        const serialized = serialize(state);
        localStorage.setItem(key, serialized);
        console.log(`[StateService] Saved ${key}`);
    } catch (e) {
        console.warn('[StateService] Failed to save state:', e);
    }
}

// Load state from localStorage
export function loadState<T>(key: StorageKey): T | null {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        const parsed = deserialize<T>(stored);
        console.log(`[StateService] Loaded ${key}`);
        return parsed;
    } catch (e) {
        console.warn('[StateService] Failed to load state:', e);
        return null;
    }
}

// Clear state for a specific component
export function clearState(key: StorageKey): void {
    localStorage.removeItem(key);
    console.log(`[StateService] Cleared ${key}`);
}

// Clear all saved states
export function clearAllStates(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('[StateService] Cleared all states');
}

// ============================================
// COMPONENT-SPECIFIC STATE INTERFACES
// ============================================

export interface CalendarState {
    posts: any[];
    topics: string[];
    pendingPosts: any[];
    autoPilotConfig: any;
    connectedAccounts: any[];
}

export interface LeadsState {
    leads: any[];
    selectedLeads: string[];
    criteria: any;
}

export interface EmailState {
    campaigns: any[];
    selectedCampaign: any | null;
    draftEmail: any | null;
}

export interface BlogState {
    topics: any[];
    posts: any[];
    selectedPost: any | null;
    nicheInput: string;
}

export interface ResearchState {
    report: any | null;
}

export interface StrategyState {
    strategy: any | null;
}

// ============================================
// CONVENIENCE FUNCTIONS FOR EACH COMPONENT
// ============================================

// Calendar
export const saveCalendarState = (state: CalendarState) => saveState(STORAGE_KEYS.CALENDAR, state);
export const loadCalendarState = (): CalendarState | null => loadState<CalendarState>(STORAGE_KEYS.CALENDAR);
export const clearCalendarState = () => clearState(STORAGE_KEYS.CALENDAR);

// Leads
export const saveLeadsState = (state: LeadsState) => saveState(STORAGE_KEYS.LEADS, state);
export const loadLeadsState = (): LeadsState | null => loadState<LeadsState>(STORAGE_KEYS.LEADS);
export const clearLeadsState = () => clearState(STORAGE_KEYS.LEADS);

// Email
export const saveEmailState = (state: EmailState) => saveState(STORAGE_KEYS.EMAIL, state);
export const loadEmailState = (): EmailState | null => loadState<EmailState>(STORAGE_KEYS.EMAIL);
export const clearEmailState = () => clearState(STORAGE_KEYS.EMAIL);

// Blog
export const saveBlogState = (state: BlogState) => saveState(STORAGE_KEYS.BLOG, state);
export const loadBlogState = (): BlogState | null => loadState<BlogState>(STORAGE_KEYS.BLOG);
export const clearBlogState = () => clearState(STORAGE_KEYS.BLOG);

// Research
export const saveResearchState = (state: ResearchState) => saveState(STORAGE_KEYS.RESEARCH, state);
export const loadResearchState = (): ResearchState | null => loadState<ResearchState>(STORAGE_KEYS.RESEARCH);
export const clearResearchState = () => clearState(STORAGE_KEYS.RESEARCH);

// Strategy
export const saveStrategyState = (state: StrategyState) => saveState(STORAGE_KEYS.STRATEGY, state);
export const loadStrategyState = (): StrategyState | null => loadState<StrategyState>(STORAGE_KEYS.STRATEGY);
export const clearStrategyState = () => clearState(STORAGE_KEYS.STRATEGY);
