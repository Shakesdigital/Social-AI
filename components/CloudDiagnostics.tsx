import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { fetchAllProfiles } from '../services/profileService';
import { useAuth } from '../contexts/AuthContext';

interface DiagnosticResult {
    step: string;
    status: 'pending' | 'success' | 'error' | 'warning';
    message: string;
    details?: any;
}

const CloudDiagnostics: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [results, setResults] = useState<DiagnosticResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const addResult = (result: DiagnosticResult) => {
        setResults(prev => [...prev, result]);
    };

    const runDiagnostics = async () => {
        setResults([]);
        setIsRunning(true);

        // Step 1: Check Supabase Configuration
        addResult({
            step: '1. Supabase Configuration',
            status: 'pending',
            message: 'Checking environment variables...'
        });

        await new Promise(r => setTimeout(r, 500));

        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            setResults(prev => prev.map((r, i) => i === 0 ? {
                ...r,
                status: 'error',
                message: 'Supabase environment variables are NOT set!',
                details: {
                    VITE_SUPABASE_URL: supabaseUrl ? 'Set ✓' : 'MISSING ❌',
                    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Set ✓' : 'MISSING ❌'
                }
            } : r));
        } else {
            setResults(prev => prev.map((r, i) => i === 0 ? {
                ...r,
                status: 'success',
                message: 'Environment variables are configured',
                details: {
                    url: supabaseUrl.substring(0, 40) + '...',
                    keyLength: supabaseKey.length
                }
            } : r));
        }

        // Step 2: Check Supabase Connection
        addResult({
            step: '2. Supabase Connection',
            status: 'pending',
            message: 'Testing connection to Supabase...'
        });

        await new Promise(r => setTimeout(r, 500));

        try {
            const { data, error } = await supabase.from('profiles').select('count').limit(1);
            if (error) {
                setResults(prev => prev.map((r, i) => i === 1 ? {
                    ...r,
                    status: 'error',
                    message: 'Failed to connect to profiles table',
                    details: { error: error.message, code: error.code }
                } : r));
            } else {
                setResults(prev => prev.map((r, i) => i === 1 ? {
                    ...r,
                    status: 'success',
                    message: 'Successfully connected to Supabase'
                } : r));
            }
        } catch (e: any) {
            setResults(prev => prev.map((r, i) => i === 1 ? {
                ...r,
                status: 'error',
                message: 'Connection error',
                details: { error: e.message }
            } : r));
        }

        // Step 3: Check Authentication
        addResult({
            step: '3. User Authentication',
            status: 'pending',
            message: 'Checking authentication status...'
        });

        await new Promise(r => setTimeout(r, 500));

        if (!isAuthenticated || !user) {
            setResults(prev => prev.map((r, i) => i === 2 ? {
                ...r,
                status: 'warning',
                message: 'User is not authenticated - cloud sync requires login',
                details: { isAuthenticated, userId: user?.id || 'none' }
            } : r));
        } else {
            setResults(prev => prev.map((r, i) => i === 2 ? {
                ...r,
                status: 'success',
                message: 'User is authenticated',
                details: { userId: user.id.substring(0, 8) + '...', email: user.email }
            } : r));
        }

        // Step 4: Check Profiles in Cloud
        if (user) {
            addResult({
                step: '4. Cloud Profiles',
                status: 'pending',
                message: 'Fetching profiles from cloud...'
            });

            await new Promise(r => setTimeout(r, 500));

            try {
                const profiles = await fetchAllProfiles(user.id);
                if (profiles.length > 0) {
                    setResults(prev => prev.map((r, i) => i === 3 ? {
                        ...r,
                        status: 'success',
                        message: `Found ${profiles.length} profile(s) in cloud`,
                        details: profiles.map(p => ({ id: p.id, name: p.name }))
                    } : r));
                } else {
                    setResults(prev => prev.map((r, i) => i === 3 ? {
                        ...r,
                        status: 'warning',
                        message: 'No profiles found in cloud for this user',
                        details: { userId: user.id }
                    } : r));
                }
            } catch (e: any) {
                setResults(prev => prev.map((r, i) => i === 3 ? {
                    ...r,
                    status: 'error',
                    message: 'Failed to fetch profiles from cloud',
                    details: { error: e.message }
                } : r));
            }
        }

        // Step 5: Check localStorage
        addResult({
            step: '5. Local Storage',
            status: 'pending',
            message: 'Checking localStorage...'
        });

        await new Promise(r => setTimeout(r, 500));

        try {
            const localData = localStorage.getItem('socialai_profiles');
            if (localData) {
                const parsed = JSON.parse(localData);
                setResults(prev => prev.map((r, i) => i === prev.length - 1 ? {
                    ...r,
                    status: 'success',
                    message: `Found ${parsed.profiles?.length || 0} profile(s) in localStorage`,
                    details: {
                        profiles: parsed.profiles?.map((p: any) => ({ id: p.id, name: p.name })) || [],
                        activeProfileId: parsed.activeProfileId
                    }
                } : r));
            } else {
                setResults(prev => prev.map((r, i) => i === prev.length - 1 ? {
                    ...r,
                    status: 'warning',
                    message: 'No profiles in localStorage'
                } : r));
            }
        } catch (e: any) {
            setResults(prev => prev.map((r, i) => i === prev.length - 1 ? {
                ...r,
                status: 'error',
                message: 'Error reading localStorage',
                details: { error: e.message }
            } : r));
        }

        // Step 6: Test Profile Save
        if (user) {
            addResult({
                step: '6. Profile Save Test',
                status: 'pending',
                message: 'Testing profile save to cloud...'
            });

            await new Promise(r => setTimeout(r, 500));

            try {
                const testProfile = {
                    user_id: user.id,
                    profile_id: 'test_diagnostic_' + Date.now(),
                    name: 'Diagnostic Test',
                    industry: 'Test',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                const { error: insertError } = await supabase.from('profiles').insert(testProfile);

                if (insertError) {
                    setResults(prev => prev.map((r, i) => i === prev.length - 1 ? {
                        ...r,
                        status: 'error',
                        message: 'Failed to save test profile',
                        details: { error: insertError.message, code: insertError.code, hint: insertError.hint }
                    } : r));
                } else {
                    // Clean up test profile
                    await supabase.from('profiles').delete().eq('profile_id', testProfile.profile_id);

                    setResults(prev => prev.map((r, i) => i === prev.length - 1 ? {
                        ...r,
                        status: 'success',
                        message: 'Successfully saved and deleted test profile'
                    } : r));
                }
            } catch (e: any) {
                setResults(prev => prev.map((r, i) => i === prev.length - 1 ? {
                    ...r,
                    status: 'error',
                    message: 'Error during save test',
                    details: { error: e.message }
                } : r));
            }
        }

        setIsRunning(false);
    };

    const getStatusColor = (status: DiagnosticResult['status']) => {
        switch (status) {
            case 'success': return 'bg-green-100 text-green-700 border-green-200';
            case 'error': return 'bg-red-100 text-red-700 border-red-200';
            case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getStatusIcon = (status: DiagnosticResult['status']) => {
        switch (status) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return '⏳';
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Cloud Storage Diagnostics</h2>
            <p className="text-sm text-slate-500 mb-6">
                This tool checks if your Supabase cloud storage is working correctly.
            </p>

            <button
                onClick={runDiagnostics}
                disabled={isRunning}
                className={`w-full py-3 rounded-lg font-bold transition-all ${isRunning
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
            >
                {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
            </button>

            {results.length > 0 && (
                <div className="mt-6 space-y-3">
                    {results.map((result, i) => (
                        <div key={i} className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span>{getStatusIcon(result.status)}</span>
                                <span className="font-semibold">{result.step}</span>
                            </div>
                            <p className="text-sm">{result.message}</p>
                            {result.details && (
                                <pre className="mt-2 text-xs bg-black/10 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(result.details, null, 2)}
                                </pre>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CloudDiagnostics;
