import { supabase, isSupabaseConfigured } from './supabase';
import { CompanyProfile } from '../types';

// Profile with user ID for database storage
export interface StoredProfile extends CompanyProfile {
    user_id: string;
    created_at?: string;
    updated_at?: string;
}

// Fetch profile from Supabase for the given user
export const fetchProfile = async (userId: string): Promise<CompanyProfile | null> => {
    if (!isSupabaseConfigured()) {
        console.log('[ProfileService] Supabase not configured, skipping fetch');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No row found - user has no profile yet
                console.log('[ProfileService] No profile found for user');
                return null;
            }
            console.error('[ProfileService] Error fetching profile:', error);
            return null;
        }

        // Convert database row to CompanyProfile
        // IMPORTANT: Include the profile_id so we can use it for data fetching
        return {
            id: data.profile_id || `profile_${Date.now()}`, // Use stored profile_id or generate one
            name: data.name || '',
            industry: data.industry || '',
            description: data.description || '',
            targetAudience: data.target_audience || '',
            brandVoice: data.brand_voice || '',
            goals: data.goals || '',
            createdAt: data.created_at,
        };
    } catch (error) {
        console.error('[ProfileService] Error fetching profile:', error);
        return null;
    }
};

// Save profile to Supabase
export const saveProfile = async (userId: string, profile: CompanyProfile): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.log('[ProfileService] Supabase not configured, skipping save');
        return false;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                user_id: userId,
                profile_id: profile.id, // IMPORTANT: Save the profile ID for cross-device sync
                name: profile.name,
                industry: profile.industry,
                description: profile.description,
                target_audience: profile.targetAudience,
                brand_voice: profile.brandVoice,
                goals: profile.goals,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (error) {
            console.error('[ProfileService] Error saving profile:', error);
            return false;
        }

        console.log('[ProfileService] Profile saved successfully with ID:', profile.id);
        return true;
    } catch (error) {
        console.error('[ProfileService] Error saving profile:', error);
        return false;
    }
};

// Delete profile from Supabase
export const deleteProfile = async (userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        return false;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('[ProfileService] Error deleting profile:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[ProfileService] Error deleting profile:', error);
        return false;
    }
};
