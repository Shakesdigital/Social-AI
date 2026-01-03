import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Check, Trash2, X } from 'lucide-react';
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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setConfirmDelete(null);
            }
        };

        if (isOpen) {
            // Use both mouse and touch events for better mobile support
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const handleSwitchProfile = (profileId: string) => {
        console.log('[ProfileSwitcher] Switching to profile:', profileId);
        onSwitchProfile(profileId);
        setIsOpen(false);
    };

    const handleDeleteClick = (e: React.MouseEvent | React.TouchEvent, profileId: string) => {
        e.stopPropagation();
        e.preventDefault();
        setConfirmDelete(profileId);
    };

    const handleConfirmDelete = (e: React.MouseEvent | React.TouchEvent, profileId: string) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('[ProfileSwitcher] Deleting profile:', profileId);
        onDeleteProfile(profileId);
        setConfirmDelete(null);
    };

    const handleCancelDelete = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setConfirmDelete(null);
    };

    const handleCreateNew = () => {
        console.log('[ProfileSwitcher] Creating new profile');
        onCreateNew();
        setIsOpen(false);
    };

    const toggleDropdown = () => {
        console.log('[ProfileSwitcher] Toggle dropdown:', !isOpen);
        setIsOpen(!isOpen);
        if (isOpen) {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="relative">
            {/* Trigger Button - larger touch target */}
            <button
                ref={triggerRef}
                onClick={toggleDropdown}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    toggleDropdown();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 transition-all touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
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
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Semi-transparent backdrop for mobile */}
                    <div
                        className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
                        onClick={() => { setIsOpen(false); setConfirmDelete(null); }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            setIsOpen(false);
                            setConfirmDelete(null);
                        }}
                    />

                    {/* Dropdown Panel */}
                    <div
                        ref={dropdownRef}
                        className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
                        style={{
                            maxHeight: 'calc(100vh - 200px)',
                            WebkitOverflowScrolling: 'touch'
                        }}
                    >
                        <div className="max-h-64 overflow-y-auto overscroll-contain">
                            {profiles.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSwitchProfile(p.id)}
                                    onTouchEnd={(e) => {
                                        if (confirmDelete !== p.id) {
                                            e.preventDefault();
                                            handleSwitchProfile(p.id);
                                        }
                                    }}
                                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors touch-manipulation ${p.id === activeProfile?.id
                                            ? 'bg-brand-50'
                                            : 'hover:bg-slate-50 active:bg-slate-100'
                                        }`}
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${p.id === activeProfile?.id
                                            ? 'bg-gradient-to-br from-brand-500 to-brand-700'
                                            : 'bg-slate-400'
                                        }`}>
                                        {p.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">
                                            {p.name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {p.industry}
                                        </p>
                                    </div>

                                    {/* Active indicator or Delete button */}
                                    {p.id === activeProfile?.id ? (
                                        <Check size={16} className="text-brand-600 shrink-0" />
                                    ) : confirmDelete === p.id ? (
                                        <div
                                            className="flex items-center gap-2"
                                            onClick={e => e.stopPropagation()}
                                            onTouchEnd={e => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={(e) => handleConfirmDelete(e, p.id)}
                                                onTouchEnd={(e) => handleConfirmDelete(e, p.id)}
                                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 active:bg-red-300 transition-colors touch-manipulation"
                                                title="Confirm delete"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={handleCancelDelete}
                                                onTouchEnd={handleCancelDelete}
                                                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 active:bg-slate-300 transition-colors touch-manipulation"
                                                title="Cancel"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => handleDeleteClick(e, p.id)}
                                            onTouchEnd={(e) => handleDeleteClick(e, p.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 active:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                                            title="Delete profile"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Create New Profile Button */}
                        <div className="border-t border-slate-100 p-2">
                            <button
                                onClick={handleCreateNew}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    handleCreateNew();
                                }}
                                className="w-full flex items-center justify-center gap-2 p-4 rounded-lg text-brand-600 hover:bg-brand-50 active:bg-brand-100 font-medium text-sm transition-colors touch-manipulation"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
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
