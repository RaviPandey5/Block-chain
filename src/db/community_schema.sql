-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS discussions CASCADE;
DROP TABLE IF EXISTS discussion_comments CASCADE;
DROP TABLE IF EXISTS discussion_reactions CASCADE;
DROP TABLE IF EXISTS community_users CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS reputation_history CASCADE;

-- Create community_users table
CREATE TABLE community_users (
    wallet_address TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    avatar_url TEXT,
    reputation_score NUMERIC(10,2) DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT false,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Create discussions table
CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_address TEXT REFERENCES community_users(wallet_address) ON DELETE CASCADE,
    tx_hash TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    views INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    CONSTRAINT title_length CHECK (char_length(title) >= 3),
    CONSTRAINT content_length CHECK (char_length(content) >= 10)
);

-- Create discussion_comments table
CREATE TABLE discussion_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_address TEXT REFERENCES community_users(wallet_address) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT content_not_empty CHECK (char_length(content) >= 1)
);

-- Create discussion_reactions table
CREATE TABLE discussion_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    author_address TEXT REFERENCES community_users(wallet_address) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL,
    tx_hash TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_reaction_type CHECK (reaction_type IN ('like', 'dislike', 'heart', 'celebrate')),
    UNIQUE(discussion_id, author_address, reaction_type)
);

-- Create proposals table
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_address TEXT REFERENCES community_users(wallet_address) ON DELETE CASCADE,
    status TEXT DEFAULT 'draft',
    tx_hash TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    CONSTRAINT title_length CHECK (char_length(title) >= 3),
    CONSTRAINT content_length CHECK (char_length(content) >= 10)
);

-- Create reputation_history table
CREATE TABLE reputation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT REFERENCES community_users(wallet_address) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    points NUMERIC(5,2) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_action_type CHECK (action_type IN ('discussion_created', 'comment_added', 'reaction_received', 'proposal_created'))
);

-- Create function to update user's reputation score
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE community_users
    SET reputation_score = (
        SELECT COALESCE(SUM(points), 0)
        FROM reputation_history
        WHERE wallet_address = NEW.wallet_address
    )
    WHERE wallet_address = NEW.wallet_address;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reputation updates
CREATE TRIGGER update_reputation_after_history_change
    AFTER INSERT OR UPDATE OR DELETE ON reputation_history
    FOR EACH ROW
    EXECUTE FUNCTION update_user_reputation();

-- Create function to award reputation points
CREATE OR REPLACE FUNCTION award_reputation_points(
    p_wallet_address TEXT,
    p_action_type TEXT,
    p_reference_id UUID
) RETURNS void AS $$
DECLARE
    points NUMERIC(5,2);
BEGIN
    -- Set points based on action type
    points := CASE p_action_type
        WHEN 'discussion_created' THEN 10.0
        WHEN 'comment_added' THEN 5.0
        WHEN 'reaction_received' THEN 2.0
        WHEN 'proposal_created' THEN 15.0
        ELSE 0.0
    END;

    -- Insert into reputation history
    INSERT INTO reputation_history (
        wallet_address,
        action_type,
        points,
        reference_id
    ) VALUES (
        p_wallet_address,
        p_action_type,
        points,
        p_reference_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to update discussion views
CREATE OR REPLACE FUNCTION increment_discussion_views(discussion_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE discussions
    SET views = views + 1
    WHERE id = discussion_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better query performance
CREATE INDEX idx_discussions_author ON discussions(author_address);
CREATE INDEX idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX idx_comments_discussion ON discussion_comments(discussion_id);
CREATE INDEX idx_reactions_discussion ON discussion_reactions(discussion_id);
CREATE INDEX idx_reputation_wallet ON reputation_history(wallet_address);
CREATE INDEX idx_proposals_author ON proposals(author_address);
CREATE INDEX idx_proposals_status ON proposals(status);

-- Enable Row Level Security
ALTER TABLE community_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Community Users Policies
CREATE POLICY "Allow public read access on community_users"
    ON community_users FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Allow users to update their own profile"
    ON community_users FOR UPDATE
    USING (wallet_address = auth.uid()::text);

-- Discussions Policies
CREATE POLICY "Allow public read access on discussions"
    ON discussions FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Allow verified users to create discussions"
    ON discussions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM community_users
            WHERE wallet_address = auth.uid()::text
            AND is_verified = true
        )
    );

CREATE POLICY "Allow authors to update their discussions"
    ON discussions FOR UPDATE
    USING (author_address = auth.uid()::text);

-- Comments Policies
CREATE POLICY "Allow public read access on comments"
    ON discussion_comments FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Allow verified users to create comments"
    ON discussion_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM community_users
            WHERE wallet_address = auth.uid()::text
            AND is_verified = true
        )
    );

-- Reactions Policies
CREATE POLICY "Allow public read access on reactions"
    ON discussion_reactions FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Allow verified users to create reactions"
    ON discussion_reactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM community_users
            WHERE wallet_address = auth.uid()::text
            AND is_verified = true
        )
    );

-- Proposals Policies
CREATE POLICY "Allow public read access on proposals"
    ON proposals FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Allow verified users to create proposals"
    ON proposals FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM community_users
            WHERE wallet_address = auth.uid()::text
            AND is_verified = true
        )
    );

-- Create views for common queries
CREATE OR REPLACE VIEW discussion_stats AS
SELECT 
    d.id,
    d.title,
    d.author_address,
    d.created_at,
    d.views,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT r.id) as reaction_count
FROM discussions d
LEFT JOIN discussion_comments c ON c.discussion_id = d.id
LEFT JOIN discussion_reactions r ON r.discussion_id = d.id
GROUP BY d.id;

CREATE OR REPLACE VIEW top_contributors AS
SELECT 
    cu.wallet_address,
    cu.username,
    cu.avatar_url,
    cu.reputation_score,
    COUNT(DISTINCT d.id) as discussions_created,
    COUNT(DISTINCT c.id) as comments_made,
    COUNT(DISTINCT r.id) as reactions_given
FROM community_users cu
LEFT JOIN discussions d ON d.author_address = cu.wallet_address
LEFT JOIN discussion_comments c ON c.author_address = cu.wallet_address
LEFT JOIN discussion_reactions r ON r.author_address = cu.wallet_address
GROUP BY cu.wallet_address, cu.username, cu.avatar_url, cu.reputation_score
ORDER BY cu.reputation_score DESC;

-- Handle realtime subscriptions
BEGIN;
    -- Drop existing publication if it exists
    DROP PUBLICATION IF EXISTS supabase_realtime;
    
    -- Create new publication for all tables
    CREATE PUBLICATION supabase_realtime FOR TABLE
        discussions,
        discussion_comments,
        discussion_reactions,
        community_users,
        proposals,
        reputation_history;
COMMIT;