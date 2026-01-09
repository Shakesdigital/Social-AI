# Cloud Storage Setup Guide

This guide explains how to set up Supabase cloud storage for Social AI so that your profiles and all data persist permanently and never get lost.

## Why Cloud Storage?

Without cloud storage:
- Data is only stored in your browser's localStorage
- Clearing browser data = losing all your work
- Different devices = can't access your data
- Hard refresh can sometimes clear data

With cloud storage:
- Data is stored securely in Supabase (PostgreSQL database)
- Data persists forever (unless you delete it)
- Accessible from any device
- Protected by your account authentication

## Setup Steps

### Step 1: Create a Supabase Account (Free)

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" and sign up
3. Create a new project (give it any name)
4. Wait for the project to be created (~2 minutes)

### Step 2: Create the Database Tables

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste the contents of `supabase/schema.sql` from this repository
4. Click **Run** to execute the SQL
5. You should see "Success" messages

### Step 3: Get Your API Keys

1. In Supabase, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

### Step 4: Add Environment Variables to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your Social AI site
3. Go to **Site settings** → **Environment variables**
4. Add these variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

5. Click **Save**

### Step 5: Redeploy

1. In Netlify, go to **Deploys**
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete

### Step 6: Verify It Works

1. Open your deployed site
2. Press F12 to open browser console
3. Look for these messages:

```
[Supabase] Configuration status: { urlConfigured: true, keyConfigured: true, url: "https://xxx..." }
```

If you see `urlConfigured: true` and `keyConfigured: true`, cloud storage is working!

## What Gets Saved to Cloud

Once configured, the following data is saved to the cloud:

| Data Type | Description |
|-----------|-------------|
| **Profiles** | All your company profiles |
| **Calendar** | Content calendar posts and topics |
| **Leads** | Lead generation results |
| **Email** | Email marketing campaigns |
| **Blog** | Blog posts and trending topics |
| **Research** | Market research reports |
| **Strategy** | Marketing strategies |

## Troubleshooting

### "Supabase NOT configured" in console

- Check that environment variables are correctly set in Netlify
- Make sure variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Redeploy after adding variables

### "Error inserting profile" or database errors

- Make sure you ran the SQL schema in Supabase
- Check that Row Level Security (RLS) policies were created
- Verify the tables exist: Go to Supabase → Table Editor

### Data not syncing

- Check browser console for error messages
- Make sure you're logged in to the app
- Wait a few seconds - there's a debounce on cloud saves

## Security

- All data is protected by Supabase Row Level Security
- Users can only access their own data
- Data is encrypted in transit (HTTPS)
- Supabase provides enterprise-grade security

## Need Help?

If you're having issues, check the browser console (F12) for detailed error messages. The app logs all cloud sync operations.
