-- Supabase Migration: Create subscription and usage tables
-- Run this in your Supabase SQL Editor

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'pro_plus')),
  paypal_subscription_id TEXT,
  paypal_payer_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_subscription_id ON subscriptions(paypal_subscription_id);

-- ============================================
-- USAGE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  content_generations INTEGER DEFAULT 0,
  research_reports INTEGER DEFAULT 0,
  strategies INTEGER DEFAULT 0,
  leads_researched INTEGER DEFAULT 0,
  email_campaigns INTEGER DEFAULT 0,
  blog_posts INTEGER DEFAULT 0,
  chat_messages INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_usage_user_period ON usage(user_id, period_start);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscription
CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on usage
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage
CREATE POLICY "Users can view own usage" ON usage
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own usage" ON usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update own usage" ON usage
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: Increment usage
-- ============================================
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_period_start DATE,
  p_column TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Try to insert, if exists update
  INSERT INTO usage (user_id, period_start)
  VALUES (p_user_id, p_period_start)
  ON CONFLICT (user_id, period_start) DO NOTHING;
  
  -- Update the specific column
  EXECUTE format(
    'UPDATE usage SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE user_id = $2 AND period_start = $3',
    p_column, p_column
  )
  USING p_amount, p_user_id, p_period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_updated_at
  BEFORE UPDATE ON usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON usage TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage TO authenticated;
