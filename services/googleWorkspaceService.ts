// Google Workspace Integration Service
// Handles OAuth and API calls to Gmail, Sheets, Docs, Drive, Calendar

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

// Scopes for different Google services
export const GOOGLE_SCOPES = {
    // Read-only scopes (safer for initial implementation)
    calendar_readonly: 'https://www.googleapis.com/auth/calendar.readonly',
    gmail_readonly: 'https://www.googleapis.com/auth/gmail.readonly',
    drive_readonly: 'https://www.googleapis.com/auth/drive.readonly',
    sheets_readonly: 'https://www.googleapis.com/auth/spreadsheets.readonly',

    // Write scopes
    calendar: 'https://www.googleapis.com/auth/calendar',
    calendar_events: 'https://www.googleapis.com/auth/calendar.events',
    gmail_send: 'https://www.googleapis.com/auth/gmail.send',
    gmail_compose: 'https://www.googleapis.com/auth/gmail.compose',
    drive_file: 'https://www.googleapis.com/auth/drive.file',
    sheets: 'https://www.googleapis.com/auth/spreadsheets',
    docs: 'https://www.googleapis.com/auth/documents',
};

// Combined scope for full workspace access
export const FULL_WORKSPACE_SCOPES = [
    GOOGLE_SCOPES.calendar,
    GOOGLE_SCOPES.gmail_send,
    GOOGLE_SCOPES.drive_file,
    GOOGLE_SCOPES.sheets,
    GOOGLE_SCOPES.docs,
].join(' ');

// Token storage keys
const TOKEN_STORAGE_KEY = 'google_workspace_token';
const TOKEN_EXPIRY_KEY = 'google_workspace_token_expiry';

interface GoogleToken {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

interface CalendarEvent {
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    location?: string;
    reminders?: { useDefault: boolean };
}

interface SheetData {
    range: string;
    values: (string | number)[][];
}

// Check if Google API is configured
export const isGoogleConfigured = (): boolean => {
    return !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10;
};

// Get stored token
export const getStoredToken = (): string | null => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (token && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
            return token;
        } else {
            // Token expired, clear it
            clearStoredToken();
        }
    }
    return null;
};

// Store token
const storeToken = (token: GoogleToken): void => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token.access_token);
    const expiryTime = Date.now() + (token.expires_in * 1000) - 60000; // 1 min buffer
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
};

// Clear stored token
export const clearStoredToken = (): void => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Check if connected to Google Workspace
export const isGoogleConnected = (): boolean => {
    return !!getStoredToken();
};

// Initialize Google OAuth - opens popup for user consent
export const connectGoogleWorkspace = (scopes: string = FULL_WORKSPACE_SCOPES): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!isGoogleConfigured()) {
            reject(new Error('Google API not configured. Please set VITE_GOOGLE_CLIENT_ID'));
            return;
        }

        // Build OAuth URL
        const redirectUri = `${window.location.origin}/google-callback.html`;
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('include_granted_scopes', 'true');
        authUrl.searchParams.set('prompt', 'consent');

        // Open popup
        const popup = window.open(
            authUrl.toString(),
            'Google Authorization',
            'width=500,height=600,scrollbars=yes'
        );

        if (!popup) {
            reject(new Error('Popup blocked. Please allow popups for this site.'));
            return;
        }

        // Listen for callback
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'google-oauth-callback') {
                window.removeEventListener('message', handleMessage);

                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else if (event.data.access_token) {
                    const token: GoogleToken = {
                        access_token: event.data.access_token,
                        expires_in: parseInt(event.data.expires_in, 10),
                        token_type: event.data.token_type,
                        scope: event.data.scope,
                    };
                    storeToken(token);
                    resolve(token.access_token);
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup closed without completing
        const popupTimer = setInterval(() => {
            if (popup.closed) {
                clearInterval(popupTimer);
                window.removeEventListener('message', handleMessage);
                // Check if we got a token anyway (in case the callback worked)
                const token = getStoredToken();
                if (token) {
                    resolve(token);
                } else {
                    reject(new Error('Authorization cancelled'));
                }
            }
        }, 1000);
    });
};

// Disconnect from Google Workspace
export const disconnectGoogleWorkspace = (): void => {
    clearStoredToken();
};

// === GOOGLE CALENDAR API ===

export const createCalendarEvent = async (event: CalendarEvent, calendarId: string = 'primary'): Promise<any> => {
    const token = getStoredToken();
    if (!token) throw new Error('Not connected to Google. Please connect first.');

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create calendar event');
    }

    return response.json();
};

export const listCalendarEvents = async (
    calendarId: string = 'primary',
    maxResults: number = 10,
    timeMin?: string
): Promise<any[]> => {
    const token = getStoredToken();
    if (!token) throw new Error('Not connected to Google');

    const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        singleEvents: 'true',
        orderBy: 'startTime',
    });

    if (timeMin) {
        params.set('timeMin', timeMin);
    } else {
        params.set('timeMin', new Date().toISOString());
    }

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
        {
            headers: { 'Authorization': `Bearer ${token}` },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
    }

    const data = await response.json();
    return data.items || [];
};

// === GOOGLE SHEETS API ===

export const createSpreadsheet = async (title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
    const token = getStoredToken();
    if (!token) throw new Error('Not connected to Google');

    const response = await fetch(
        'https://sheets.googleapis.com/v4/spreadsheets',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                properties: { title },
            }),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to create spreadsheet');
    }

    const data = await response.json();
    return {
        spreadsheetId: data.spreadsheetId,
        spreadsheetUrl: data.spreadsheetUrl,
    };
};

export const appendToSheet = async (
    spreadsheetId: string,
    range: string,
    values: (string | number)[][]
): Promise<any> => {
    const token = getStoredToken();
    if (!token) throw new Error('Not connected to Google');

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values }),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to append data to sheet');
    }

    return response.json();
};

// === GOOGLE DRIVE API ===

export const uploadToDrive = async (
    fileName: string,
    content: string,
    mimeType: string = 'text/plain',
    folderId?: string
): Promise<{ fileId: string; webViewLink: string }> => {
    const token = getStoredToken();
    if (!token) throw new Error('Not connected to Google');

    // Create metadata
    const metadata: any = {
        name: fileName,
        mimeType,
    };
    if (folderId) {
        metadata.parents = [folderId];
    }

    // Create multipart request
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const body =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        close_delim;

    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body,
        }
    );

    if (!response.ok) {
        throw new Error('Failed to upload file to Drive');
    }

    const data = await response.json();
    return {
        fileId: data.id,
        webViewLink: data.webViewLink,
    };
};

export const createGoogleDoc = async (
    title: string,
    content?: string
): Promise<{ documentId: string; webViewLink: string }> => {
    const token = getStoredToken();
    if (!token) throw new Error('Not connected to Google');

    // Create the document
    const createResponse = await fetch(
        'https://docs.googleapis.com/v1/documents',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
        }
    );

    if (!createResponse.ok) {
        throw new Error('Failed to create Google Doc');
    }

    const doc = await createResponse.json();

    // If content provided, insert it
    if (content) {
        await fetch(
            `https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requests: [{
                        insertText: {
                            location: { index: 1 },
                            text: content,
                        },
                    }],
                }),
            }
        );
    }

    // Get the web link
    const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${doc.documentId}?fields=webViewLink`,
        {
            headers: { 'Authorization': `Bearer ${token}` },
        }
    );
    const fileData = await fileResponse.json();

    return {
        documentId: doc.documentId,
        webViewLink: fileData.webViewLink,
    };
};

// === GMAIL API ===

export const sendEmail = async (
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false
): Promise<{ messageId: string }> => {
    const token = getStoredToken();
    if (!token) throw new Error('Not connected to Google');

    // Create email in RFC 2822 format
    const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
        '',
        body,
    ].join('\r\n');

    // Base64 encode
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/messages/send',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: encodedEmail }),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send email');
    }

    const data = await response.json();
    return { messageId: data.id };
};

// === HELPER FUNCTIONS FOR APP INTEGRATION ===

// Export posts schedule to Google Calendar
export const exportScheduleToCalendar = async (posts: Array<{
    title: string;
    content: string;
    scheduledDate: string;
    platform?: string;
}>): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const post of posts) {
        try {
            const startDate = new Date(post.scheduledDate);
            const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 min duration

            await createCalendarEvent({
                summary: `📱 ${post.platform || 'Social'}: ${post.title}`,
                description: post.content,
                start: { dateTime: startDate.toISOString() },
                end: { dateTime: endDate.toISOString() },
                reminders: { useDefault: true },
            });
            success++;
        } catch (e) {
            console.error('Failed to create event:', e);
            failed++;
        }
    }

    return { success, failed };
};

// Export leads to Google Sheets
export const exportLeadsToSheets = async (leads: Array<{
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    notes?: string;
}>): Promise<{ spreadsheetUrl: string }> => {
    // Create new spreadsheet
    const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(
        `Market MI Leads - ${new Date().toLocaleDateString()}`
    );

    // Prepare data with headers
    const values: (string | number)[][] = [
        ['Name', 'Email', 'Phone', 'Website', 'Notes'],
        ...leads.map(lead => [
            lead.name || '',
            lead.email || '',
            lead.phone || '',
            lead.website || '',
            lead.notes || '',
        ]),
    ];

    // Add data to sheet
    await appendToSheet(spreadsheetId, 'Sheet1!A1', values);

    return { spreadsheetUrl };
};

// Export research/strategy to Google Docs
export const exportToGoogleDoc = async (
    title: string,
    content: string
): Promise<{ webViewLink: string }> => {
    const { webViewLink } = await createGoogleDoc(title, content);
    return { webViewLink };
};

// Export email campaign draft
export const saveCampaignToDrive = async (
    campaignName: string,
    emails: Array<{ subject: string; body: string }>
): Promise<{ webViewLink: string }> => {
    const content = emails.map((email, i) =>
        `=== Email ${i + 1} ===\n\nSubject: ${email.subject}\n\n${email.body}\n\n`
    ).join('\n---\n\n');

    const { webViewLink } = await uploadToDrive(
        `${campaignName}.txt`,
        content,
        'text/plain'
    );

    return { webViewLink };
};

console.log('[GoogleWorkspace] Service loaded. Configured:', isGoogleConfigured());
