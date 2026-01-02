import { supabase, isSupabaseConfigured } from './supabase';

// Type for data sync
export type DataType = 'calendar' | 'leads' | 'email' | 'blog' | 'research' | 'strategy';

// Save user data to Supabase (per profile)
export const saveUserData = async (userId: string, profileId: string, dataType: DataType, data: any): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.log('[DataService] Supabase not configured, skipping save');
        return false;
    }

    try {
        const { error } = await supabase
            .from('user_data')
            .upsert({
                user_id: userId,
                profile_id: profileId,
                data_type: dataType,
                data: data,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,profile_id,data_type',
            });

        if (error) {
            console.error(`[DataService] Error saving ${dataType} for profile ${profileId}:`, error);
            return false;
        }

        console.log(`[DataService] ${dataType} saved successfully for profile ${profileId}`);
        return true;
    } catch (error) {
        console.error(`[DataService] Error saving ${dataType}:`, error);
        return false;
    }
};

// Fetch user data from Supabase for a specific profile
export const fetchUserData = async (userId: string, profileId: string, dataType: DataType): Promise<any | null> => {
    if (!isSupabaseConfigured()) {
        console.log('[DataService] Supabase not configured, skipping fetch');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('user_id', userId)
            .eq('profile_id', profileId)
            .eq('data_type', dataType)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No row found
                console.log(`[DataService] No ${dataType} data found for profile ${profileId}`);
                return null;
            }
            console.error(`[DataService] Error fetching ${dataType}:`, error);
            return null;
        }

        return data?.data || null;
    } catch (error) {
        console.error(`[DataService] Error fetching ${dataType}:`, error);
        return null;
    }
};

// Fetch all user data from Supabase for a specific profile
export const fetchAllProfileData = async (userId: string, profileId: string): Promise<Record<DataType, any>> => {
    const result: Record<string, any> = {
        calendar: null,
        leads: null,
        email: null,
        blog: null,
        research: null,
        strategy: null,
    };

    if (!isSupabaseConfigured()) {
        console.log('[DataService] Supabase not configured, skipping fetch');
        return result as Record<DataType, any>;
    }

    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('data_type, data')
            .eq('user_id', userId)
            .eq('profile_id', profileId);

        if (error) {
            console.error('[DataService] Error fetching profile data:', error);
            return result as Record<DataType, any>;
        }

        if (data) {
            for (const row of data) {
                if (row.data_type in result) {
                    result[row.data_type] = row.data;
                }
            }
        }

        console.log(`[DataService] Fetched data for profile ${profileId}:`, Object.keys(result).filter(k => result[k] !== null));
        return result as Record<DataType, any>;
    } catch (error) {
        console.error('[DataService] Error fetching profile data:', error);
        return result as Record<DataType, any>;
    }
};

// Save all data for a profile to Supabase at once
export const saveAllProfileData = async (userId: string, profileId: string, allData: Record<DataType, any>): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.log('[DataService] Supabase not configured, skipping save');
        return false;
    }

    try {
        const rows = Object.entries(allData)
            .filter(([_, data]) => data !== null)
            .map(([dataType, data]) => ({
                user_id: userId,
                profile_id: profileId,
                data_type: dataType,
                data: data,
                updated_at: new Date().toISOString(),
            }));

        if (rows.length === 0) {
            console.log('[DataService] No data to save');
            return true;
        }

        const { error } = await supabase
            .from('user_data')
            .upsert(rows, {
                onConflict: 'user_id,profile_id,data_type',
            });

        if (error) {
            console.error('[DataService] Error saving profile data:', error);
            return false;
        }

        console.log(`[DataService] All data saved for profile ${profileId}`);
        return true;
    } catch (error) {
        console.error('[DataService] Error saving profile data:', error);
        return false;
    }
};

// Legacy function for backward compatibility - fetches data for all profiles
export const fetchAllUserData = async (userId: string): Promise<Record<DataType, any>> => {
    // This now just returns empty - use fetchAllProfileData instead
    console.log('[DataService] fetchAllUserData is deprecated - use fetchAllProfileData with profileId');
    return {
        calendar: null,
        leads: null,
        email: null,
        blog: null,
        research: null,
        strategy: null,
    };
};
