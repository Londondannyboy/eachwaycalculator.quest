-- User Profile Items Table
-- Run this migration against your Neon database for user preferences and memory

-- Create user profile items table
CREATE TABLE IF NOT EXISTS user_profile_items (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    item_type VARCHAR(100) NOT NULL, -- 'default_stake', 'preferred_terms', 'favorite_sport', 'calculation', etc.
    value TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_type, value)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profile_user ON user_profile_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_type ON user_profile_items(item_type);
CREATE INDEX IF NOT EXISTS idx_user_profile_user_type ON user_profile_items(user_id, item_type);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profile_update_timestamp ON user_profile_items;
CREATE TRIGGER user_profile_update_timestamp
    BEFORE UPDATE ON user_profile_items
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_timestamp();

-- Verify the table
SELECT 'user_profile_items table created successfully' as status;
