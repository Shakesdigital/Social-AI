import { supabase, isSupabaseConfigured } from './supabase';
import { CompanyProfile } from '../types';

// Profile with user ID for database storage
export interface StoredProfile extends CompanyProfile {
    user_id: string;
    created_at?: string;
    updated_at?: string;
}

// Fetch a single profile from Supabase for the given user (for backward compatibility)
export const fetchProfile = async (userId: string): Promise<CompanyProfile | null> => {
    if (!isSupabaseConfigured()) {
        console.log('[ProfileService] Supabase not configured, skipping fetch');
        return null;
    }

    try {
        // Fetch the first/primary profile for the user
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
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
        const stableProfileId = data.profile_id || `profile_${userId.substring(0, 8)}`;

        console.log('[ProfileService] Profile fetched with ID:', stableProfileId);

        return {
            id: stableProfileId,
            name: data.name || '',
            industry: data.industry || '',
            description: data.description || '',
            targetAudience: data.target_audience || '',
            brandVoice: data.brand_voice || '',
            goals: data.goals || '',
            website: data.website || '',
            createdAt: data.created_at,
        };
    } catch (error) {
        console.error('[ProfileService] Error fetching profile:', error);
        return null;
    }
};

// Fetch ALL profiles for a user from Supabase
export const fetchAllProfiles = async (userId: string): Promise<CompanyProfile[]> => {
    if (!isSupabaseConfigured()) {
        console.log('[ProfileService] Supabase not configured, skipping fetch');
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[ProfileService] Error fetching all profiles:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.log('[ProfileService] No profiles found for user');
            return [];
        }

        console.log(`[ProfileService] Fetched ${data.length} profiles for user`);

        return data.map(row => ({
            id: row.profile_id || `profile_${userId.substring(0, 8)}`,
            name: row.name || '',
            industry: row.industry || '',
            description: row.description || '',
            targetAudience: row.target_audience || '',
            brandVoice: row.brand_voice || '',
            goals: row.goals || '',
            website: row.website || '',
            createdAt: row.created_at,
        }));
    } catch (error) {
        console.error('[ProfileService] Error fetching all profiles:', error);
        return [];
    }
};

// Save profile to Supabase (supports multiple profiles per user)
export const saveProfile = async (userId: string, profile: CompanyProfile): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.log('[ProfileService] Supabase not configured, skipping save');
        return false;
    }

    try {
        // Use composite key: user_id + profile_id
        // First check if this profile already exists
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .eq('profile_id', profile.id)
            .single();

        if (existingProfile) {
            // Update existing profile
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: profile.name,
                    industry: profile.industry,
                    description: profile.description,
                    target_audience: profile.targetAudience,
                    brand_voice: profile.brandVoice,
                    goals: profile.goals,
                    website: profile.website || '',
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('profile_id', profile.id);

            if (error) {
                console.error('[ProfileService] Error updating profile:', error);
                return false;
            }
            console.log('[ProfileService] Profile updated successfully:', profile.id);
        } else {
            // Insert new profile
            const { error } = await supabase
                .from('profiles')
                .insert({
                    user_id: userId,
                    profile_id: profile.id,
                    name: profile.name,
                    industry: profile.industry,
                    description: profile.description,
                    target_audience: profile.targetAudience,
                    brand_voice: profile.brandVoice,
                    goals: profile.goals,
                    website: profile.website || '',
                    created_at: profile.createdAt || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

            if (error) {
                console.error('[ProfileService] Error inserting profile:', error);
                return false;
            }
            console.log('[ProfileService] Profile inserted successfully:', profile.id);
        }

        return true;
    } catch (error) {
        console.error('[ProfileService] Error saving profile:', error);
        return false;
    }
};

// Save all profiles for a user to Supabase
export const saveAllProfiles = async (userId: string, profiles: CompanyProfile[]): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.log('[ProfileService] Supabase not configured, skipping save');
        return false;
    }

    try {
        // Save each profile
        const results = await Promise.all(
            profiles.map(profile => saveProfile(userId, profile))
        );

        const successCount = results.filter(r => r).length;
        console.log(`[ProfileService] Saved ${successCount}/${profiles.length} profiles`);

        return successCount === profiles.length;
    } catch (error) {
        console.error('[ProfileService] Error saving all profiles:', error);
        return false;
    }
};

// Delete a specific profile from Supabase
export const deleteProfile = async (userId: string, profileId?: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        return false;
    }

    try {
        let query = supabase.from('profiles').delete().eq('user_id', userId);

        if (profileId) {
            query = query.eq('profile_id', profileId);
        }

        const { error } = await query;

        if (error) {
            console.error('[ProfileService] Error deleting profile:', error);
            return false;
        }

        console.log('[ProfileService] Profile deleted successfully:', profileId || 'all');
        return true;
    } catch (error) {
        console.error('[ProfileService] Error deleting profile:', error);
        return false;
    }
};
