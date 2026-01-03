# OAuth Configuration Guide for marketmi.shakesdigital.com

This guide walks you through configuring all OAuth providers and external services for your domain.

## Your Domain
- **Production URL**: `https://marketmi.shakesdigital.com`
- **Callback URLs** (needed for OAuth):
  - Supabase Auth: `https://marketmi.shakesdigital.com` (root)
  - Google Workspace: `https://marketmi.shakesdigital.com/google-callback.html`

---

## 1. Supabase Configuration

### Step 1: Update Site URL
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication → URL Configuration**
4. Update these settings:
   - **Site URL**: `https://marketmi.shakesdigital.com`
   - **Redirect URLs**: Add these (one per line):
     ```
     https://marketmi.shakesdigital.com
     https://marketmi.shakesdigital.com/**
     http://localhost:5173
     http://localhost:5173/**
     ```

### Step 2: Configure Google OAuth in Supabase
1. Go to **Authentication → Providers → Google**
2. Enable Google provider if not already enabled
3. You'll need:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
4. The **Callback URL** shown in Supabase (looks like `https://xxxx.supabase.co/auth/v1/callback`) - you'll need this for Google Cloud Console

---

## 2. Google Cloud Console Configuration

### For Supabase OAuth (Login with Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services → Credentials**
4. Find your OAuth 2.0 Client ID (or create one)
5. Click to edit it
6. Add to **Authorized JavaScript origins**:
   ```
   https://marketmi.shakesdigital.com
   http://localhost:5173
   ```
7. Add to **Authorized redirect URIs**:
   ```
   https://xxxx.supabase.co/auth/v1/callback
   ```
   (Replace `xxxx` with your Supabase project reference from the Supabase dashboard)

### For Google Workspace Integration (Calendar, Sheets, etc.)

1. In the same OAuth 2.0 Client ID settings
2. Add to **Authorized JavaScript origins**:
   ```
   https://marketmi.shakesdigital.com
   http://localhost:5173
   ```
3. Add to **Authorized redirect URIs**:
   ```
   https://marketmi.shakesdigital.com/google-callback.html
   http://localhost:5173/google-callback.html
   ```

### Enable Required APIs
1. Go to **APIs & Services → Library**
2. Enable these APIs:
   - Google Calendar API
   - Google Sheets API
   - Google Docs API
   - Google Drive API
   - Gmail API (if using email features)

---

## 3. GitHub OAuth Configuration

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on your OAuth App (or create one under **OAuth Apps**)
3. Update these fields:
   - **Homepage URL**: `https://marketmi.shakesdigital.com`
   - **Authorization callback URL**: 
     ```
     https://xxxx.supabase.co/auth/v1/callback
     ```
     (Replace `xxxx` with your Supabase project reference)

### Get Callback URL from Supabase
1. Go to Supabase Dashboard → Authentication → Providers → GitHub
2. Copy the **Callback URL** shown there
3. Paste it in GitHub's Authorization callback URL

---

## 4. Environment Variables

Make sure your `.env` file (or hosting environment variables) includes:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google (for Workspace integration - Calendar, Sheets, etc.)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Groq (for AI features)
VITE_GROQ_API_KEY=your-groq-key

# Optional: ElevenLabs for TTS
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key
```

---

## 5. Netlify/Vercel Configuration (if applicable)

If deploying to Netlify or Vercel, add these environment variables in your hosting dashboard:

### Netlify
1. Go to Site Settings → Environment Variables
2. Add each variable from the `.env` file above

### Vercel  
1. Go to Project Settings → Environment Variables
2. Add each variable

---

## 6. Testing Checklist

After configuration, test these flows:

- [ ] **Google Login**: Click "Continue with Google" on auth page
- [ ] **GitHub Login**: Click "Continue with GitHub" on auth page
- [ ] **Google Workspace Connect**: Go to settings, connect to Google Workspace
- [ ] **OAuth Popup**: Verify popups open correctly and redirect back

---

## Troubleshooting

### "redirect_uri_mismatch" error
- The redirect URI in your code doesn't match what's configured in Google/GitHub
- Double-check the exact URLs including trailing slashes

### "Invalid origin" error
- The JavaScript origin isn't whitelisted in Google Cloud Console
- Add both `https://` versions

### Popup blocked
- Browser blocking popups - user needs to allow popups for the site
- Or use redirect flow instead of popup

### "Access denied" after OAuth
- User may have denied permissions
- Check if all required scopes are approved

---

## Quick Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [GitHub Developer Settings](https://github.com/settings/developers)
