# Social Media Auto-Publishing Implementation Plan

## Overview
Enable users to connect their social media accounts and automatically publish scheduled content when the publish time arrives.

## Architecture

### 1. Supported Platforms
- **Twitter/X** - OAuth 2.0 (PKCE)
- **Facebook/Instagram** - Facebook Login (Meta Business SDK)
- **LinkedIn** - LinkedIn OAuth 2.0
- **TikTok** - TikTok Login Kit

### 2. Data Structure

```typescript
// types.ts - New types
interface SocialConnection {
  id: string;
  userId: string;
  profileId: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
  platformUserId: string;
  platformUsername: string;
  accessToken: string; // Encrypted
  refreshToken?: string; // Encrypted
  tokenExpiresAt?: Date;
  connectedAt: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

interface SocialPost {
  // Existing fields...
  publishedAt?: Date;
  publishError?: string;
  externalPostId?: string; // ID from the platform
  socialConnectionId?: string; // Which connected account to use
}

interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  platform: string;
  publishedAt?: Date;
}
```

### 3. Supabase Tables

```sql
-- Social Connections Table
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, profile_id, platform)
);

-- Scheduled Posts Table
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  social_connection_id UUID REFERENCES social_connections(id),
  platform TEXT NOT NULL,
  caption TEXT NOT NULL,
  image_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, publishing, published, failed
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publishing History
CREATE TABLE publishing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_post_id UUID REFERENCES scheduled_posts(id),
  social_connection_id UUID REFERENCES social_connections(id),
  status TEXT NOT NULL,
  external_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Services

#### A. socialConnectionService.ts
- `connectPlatform(platform, authCode)` - Exchange OAuth code for tokens
- `disconnectPlatform(connectionId)` - Remove connection
- `getConnections(userId, profileId)` - Get all connections
- `refreshToken(connectionId)` - Refresh expired tokens

#### B. socialPublishService.ts
- `publishToTwitter(connection, post)` - Twitter API v2
- `publishToFacebook(connection, post)` - Graph API
- `publishToInstagram(connection, post)` - Graph API (via Facebook)
- `publishToLinkedIn(connection, post)` - LinkedIn Share API
- `publishToTikTok(connection, post)` - TikTok Share API
- `schedulePost(post, connectionId)` - Save to scheduled_posts
- `publishNow(postId)` - Immediately publish

#### C. schedulerService.ts (Netlify Scheduled Function)
- Runs every 5 minutes
- Queries `scheduled_posts WHERE scheduled_at <= NOW() AND status = 'scheduled'`
- Publishes each post and updates status

### 5. OAuth Flow

```
1. User clicks "Connect [Platform]"
2. Frontend redirects to platform OAuth URL with:
   - client_id (from env)
   - redirect_uri (our callback URL)
   - scope (required permissions)
   - state (CSRF token)
3. User authorizes on platform
4. Platform redirects back to callback URL with auth code
5. Backend exchanges code for tokens
6. Store encrypted tokens in Supabase
7. Frontend updates UI to show connected
```

### 6. Environment Variables Needed

```env
# Twitter/X
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Facebook/Instagram (same app)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Encryption
TOKEN_ENCRYPTION_KEY= # For encrypting tokens at rest
```

### 7. Implementation Phases

#### Phase 1: Foundation
- [ ] Create Supabase tables (migrations)
- [ ] Create socialConnectionService.ts
- [ ] Create socialPublishService.ts
- [ ] Update types.ts with new interfaces

#### Phase 2: OAuth Integration (Start with Twitter)
- [ ] Create OAuth redirect endpoints
- [ ] Create OAuth callback handlers
- [ ] Implement token exchange
- [ ] Store connections in Supabase

#### Phase 3: Publishing
- [ ] Implement Twitter publishing
- [ ] Implement Facebook/Instagram publishing
- [ ] Implement LinkedIn publishing
- [ ] Create Netlify scheduled function

#### Phase 4: UI
- [ ] Update CalendarView with real connection status
- [ ] Add connection management modal
- [ ] Show publish status on posts
- [ ] Add manual "Publish Now" button

#### Phase 5: Additional Platforms
- [ ] TikTok integration
- [ ] Pinterest integration (bonus)

### 8. Security Considerations
- All tokens encrypted at rest
- HTTPS only
- CSRF protection on OAuth
- Token refresh before expiry
- Rate limiting on publish endpoints
- Audit logging for all publishes

## Files to Create/Modify

1. **NEW: `services/socialConnectionService.ts`** - OAuth & connection management
2. **NEW: `services/socialPublishService.ts`** - Platform API publishing
3. **NEW: `netlify/functions/publish-scheduler.ts`** - Cron job
4. **NEW: `components/SocialConnectionModal.tsx`** - Connection UI
5. **MODIFY: `types.ts`** - Add new types
6. **MODIFY: `components/CalendarView.tsx`** - Integrate real connections
7. **NEW: Supabase migration for tables

## Getting Started

The user needs to:
1. Create apps on each social platform's developer portal
2. Configure OAuth redirect URIs
3. Add environment variables
4. Run Supabase migration

Would you like me to start implementing Phase 1 (Foundation)?
