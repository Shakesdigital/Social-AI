import { supabase, isSupabaseConfigured } from './supabase';

// Type for data sync
export type DataType = 'calendar' | 'leads' | 'email' | 'blog' | 'research' | 'strategy';

// Save user data to Supabase
export const saveUserData = async (userId: string, dataType: DataType, data: any): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.log('[DataService] Supabase not configured, skipping save');
        return false;
    }

    try {
        const { error } = await supabase
            .from('user_data')
            .upsert({
                user_id: userId,
                data_type: dataType,
                data: data,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,data_type',
            });

        if (error) {
            console.error(`[DataService] Error saving ${dataType}:`, error);
            return false;
        }

        console.log(`[DataService] ${dataType} saved successfully`);
        return true;
    } catch (error) {
        console.error(`[DataService] Error saving ${dataType}:`, error);
        return false;
    }
};

// Fetch user data from Supabase
export const fetchUserData = async (userId: string, dataType: DataType): Promise<any | null> => {
    if (!isSupabaseConfigured()) {
        console.log('[DataService] Supabase not configured, skipping fetch');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('user_id', userId)
            .eq('data_type', dataType)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No row found
                console.log(`[DataService] No ${dataType} data found for user`);
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

// Fetch all user data from Supabase at once
export const fetchAllUserData = async (userId: string): Promise<Record<DataType, any>> => {
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
            .eq('user_id', userId);

        if (error) {
            console.error('[DataService] Error fetching all user data:', error);
            return result as Record<DataType, any>;
        }

        if (data) {
            for (const row of data) {
                if (row.data_type in result) {
                    result[row.data_type] = row.data;
                }
            }
        }

        console.log('[DataService] Fetched all user data:', Object.keys(result).filter(k => result[k] !== null));
        return result as Record<DataType, any>;
    } catch (error) {
        console.error('[DataService] Error fetching all user data:', error);
        return result as Record<DataType, any>;
    }
};

// Save all user data to Supabase at once
export const saveAllUserData = async (userId: string, allData: Record<DataType, any>): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.log('[DataService] Supabase not configured, skipping save');
        return false;
    }

    try {
        const rows = Object.entries(allData)
            .filter(([_, data]) => data !== null)
            .map(([dataType, data]) => ({
                user_id: userId,
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
                onConflict: 'user_id,data_type',
            });

        if (error) {
            console.error('[DataService] Error saving all user data:', error);
            return false;
        }

        console.log('[DataService] All user data saved successfully');
        return true;
    } catch (error) {
        console.error('[DataService] Error saving all user data:', error);
        return false;
    }
};
