import React, { useState } from 'react';
import { ChevronDown, Plus, Building2, Check, Trash2, X } from 'lucide-react';
import { CompanyProfile } from '../types';

interface ProfileSwitcherProps {
    profiles: CompanyProfile[];
    activeProfile: CompanyProfile | null;
    onSwitchProfile: (profileId: string) => void;
    onCreateNew: () => void;
    onDeleteProfile: (profileId: string) => void;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
    profiles,
    activeProfile,
    onSwitchProfile,
    onCreateNew,
    onDeleteProfile
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const handleSwitchProfile = (profileId: string) => {
        onSwitchProfile(profileId);
        setIsOpen(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, profileId: string) => {
        e.stopPropagation();
        setConfirmDelete(profileId);
    };

    const handleConfirmDelete = (e: React.MouseEvent, profileId: string) => {
        e.stopPropagation();
        onDeleteProfile(profileId);
        setConfirmDelete(null);
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDelete(null);
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all group"
            >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {activeProfile?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                        {activeProfile?.name || 'Select Profile'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                        {activeProfile?.industry || 'No industry set'}
                    </p>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => { setIsOpen(false); setConfirmDelete(null); }}
                    />

                    {/* Dropdown Panel */}
                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                            {profiles.map((profile) => (
                                <div
                                    key={profile.id}
                                    onClick={() => handleSwitchProfile(profile.id)}
                                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${profile.id === activeProfile?.id
                                            ? 'bg-brand-50'
                                            : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${profile.id === activeProfile?.id
                                            ? 'bg-gradient-to-br from-brand-500 to-brand-700'
                                            : 'bg-slate-400'
                                        }`}>
                                        {profile.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">
                                            {profile.name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {profile.industry}
                                        </p>
                                    </div>

                                    {/* Active indicator or Delete button */}
                                    {profile.id === activeProfile?.id ? (
                                        <Check size={16} className="text-brand-600 shrink-0" />
                                    ) : confirmDelete === profile.id ? (
                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => handleConfirmDelete(e, profile.id)}
                                                className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                                title="Confirm delete"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={handleCancelDelete}
                                                className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                title="Cancel"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => handleDeleteClick(e, profile.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            style={{ opacity: 1 }}
                                            title="Delete profile"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Create New Profile Button */}
                        <div className="border-t border-slate-100 p-2">
                            <button
                                onClick={() => { onCreateNew(); setIsOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-brand-600 hover:bg-brand-50 font-medium text-sm transition-colors"
                            >
                                <Plus size={18} />
                                Add New Business
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProfileSwitcher;
