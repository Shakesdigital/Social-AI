import PocketBase from 'pocketbase';

// PocketBase instance URL - configure in .env
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://your-app.pockethost.io';

// Create PocketBase client instance
export const pb = new PocketBase(POCKETBASE_URL);

// Enable auto-cancellation for duplicate requests
pb.autoCancellation(false);

// Check if PocketBase is configured
export const isPocketBaseConfigured = (): boolean => {
    const url = import.meta.env.VITE_POCKETBASE_URL;
    return !!url && url !== 'https://your-app.pockethost.io';
};
