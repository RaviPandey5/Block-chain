-- Seed Demo Data for Community Tables
-- Run this file to add demo data to your Supabase database

-- First, clear existing data to avoid conflicts
DELETE FROM discussion_reactions;
DELETE FROM discussion_comments;
DELETE FROM discussions;
DELETE FROM reputation_history;
DELETE FROM anonymous_votes;
DELETE FROM poll_discussions;
DELETE FROM poll_options;
DELETE FROM e_voting_polls;
DELETE FROM community_users;

-- Insert demo users with different wallet addresses (use actual connected wallet at the end)
INSERT INTO community_users (wallet_address, username, reputation_score, last_activity, created_at, is_verified)
VALUES
    ('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', 'Alice_Demo', 150.50, NOW(), NOW(), true),
    ('0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'Bob_Builder', 75.25, NOW(), NOW(), true),
    ('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'Charlie_Voter', 30.00, NOW(), NOW(), true),
    ('0x90f79bf6eb2c4f870365e785982e1f101e93b906', 'Diana_Tech', 200.75, NOW(), NOW(), true),
    ('0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', 'Evan_Crypto', 45.50, NOW(), NOW(), true),
    ('0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'Poll_Creator', 100.00, NOW(), NOW(), true);

-- Insert demo discussions
INSERT INTO discussions (id, title, content, author_address, created_at, updated_at, views, is_featured, status)
VALUES
    (uuid_generate_v4(), 'Welcome to the Community Hub', 'This is a space for discussing all things related to decentralized voting and community governance. Feel free to share your thoughts and ideas!', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 125, true, 'active'),
    (uuid_generate_v4(), 'How can we improve voter participation?', 'I''ve been thinking about ways to increase participation in our governance. What incentives could we offer to encourage more people to vote?', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 87, false, 'active'),
    (uuid_generate_v4(), 'Proposal for community treasury', 'I think we should establish a community treasury to fund development initiatives. This could be funded through a small fee on transactions.', '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 54, false, 'active'),
    (uuid_generate_v4(), 'Voting system security audit', 'I would like to propose a comprehensive security audit of our voting system. We could hire a reputable firm to identify vulnerabilities.', '0x90f79bf6eb2c4f870365e785982e1f101e93b906', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', 32, false, 'active'),
    (uuid_generate_v4(), 'Introducing myself to the community', 'Hello everyone! I''m new to the governance platform but excited to participate. I have experience in smart contract development and would love to contribute.', '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', 15, false, 'active');

-- Insert demo comments
INSERT INTO discussion_comments (id, discussion_id, content, author_address, created_at)
SELECT 
    uuid_generate_v4(),
    d.id,
    CASE floor(random() * 5)
        WHEN 0 THEN 'Great discussion topic! I completely agree with your points.'
        WHEN 1 THEN 'I have a different perspective on this, but I appreciate your thoughts.'
        WHEN 2 THEN 'This is exactly what our community needs to discuss.'
        WHEN 3 THEN 'Have you considered alternative approaches to this issue?'
        WHEN 4 THEN 'Thanks for starting this conversation, very important topic.'
    END,
    (SELECT wallet_address FROM community_users ORDER BY random() LIMIT 1),
    d.created_at + (random() * INTERVAL '1 day')
FROM discussions d;

-- Insert additional comments
INSERT INTO discussion_comments (id, discussion_id, content, author_address, created_at)
SELECT 
    uuid_generate_v4(),
    d.id,
    CASE floor(random() * 5)
        WHEN 0 THEN 'I'd like to add another point to this discussion.'
        WHEN 1 THEN 'Has anyone implemented something similar before?'
        WHEN 2 THEN 'What metrics should we use to measure success here?'
        WHEN 3 THEN 'This aligns with our community values perfectly.'
        WHEN 4 THEN 'I can help with implementing this if needed.'
    END,
    (SELECT wallet_address FROM community_users WHERE wallet_address != 
        (SELECT author_address FROM discussion_comments WHERE discussion_id = d.id LIMIT 1)
     ORDER BY random() LIMIT 1),
    d.created_at + (random() * INTERVAL '2 days')
FROM discussions d;

-- Insert demo reactions
INSERT INTO discussion_reactions (id, discussion_id, author_address, reaction_type, created_at)
SELECT 
    uuid_generate_v4(),
    d.id,
    (SELECT wallet_address FROM community_users ORDER BY random() LIMIT 1),
    CASE floor(random() * 2)
        WHEN 0 THEN 'like'
        WHEN 1 THEN 'heart'
    END,
    d.created_at + (random() * INTERVAL '3 days')
FROM discussions d;

-- Insert more reactions to have multiple per discussion
INSERT INTO discussion_reactions (id, discussion_id, author_address, reaction_type, created_at)
SELECT 
    uuid_generate_v4(),
    d.id,
    (SELECT wallet_address FROM community_users WHERE wallet_address NOT IN (
        SELECT author_address FROM discussion_reactions WHERE discussion_id = d.id
    ) ORDER BY random() LIMIT 1),
    CASE floor(random() * 2)
        WHEN 0 THEN 'like'
        WHEN 1 THEN 'heart'
    END,
    d.created_at + (random() * INTERVAL '2 days')
FROM discussions d;

-- Insert reputation history based on actions taken
INSERT INTO reputation_history (id, wallet_address, action_type, points, reference_id, created_at)
SELECT 
    uuid_generate_v4(),
    author_address,
    'discussion_created',
    10.0,
    id,
    created_at
FROM discussions;

INSERT INTO reputation_history (id, wallet_address, action_type, points, reference_id, created_at)
SELECT 
    uuid_generate_v4(),
    author_address,
    'comment_added',
    5.0,
    id,
    created_at
FROM discussion_comments;

INSERT INTO reputation_history (id, wallet_address, action_type, points, reference_id, created_at)
SELECT 
    uuid_generate_v4(),
    d.author_address,
    'reaction_received',
    2.0,
    r.id,
    r.created_at
FROM discussion_reactions r
JOIN discussions d ON r.discussion_id = d.id
WHERE d.author_address != r.author_address;

-- Update users' reputation scores based on the history
UPDATE community_users u
SET reputation_score = (
    SELECT COALESCE(SUM(points), 0)
    FROM reputation_history
    WHERE wallet_address = u.wallet_address
);

-- Sample proposals
INSERT INTO proposals (id, title, content, author_address, status, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Implement token-weighted voting', 'I propose we implement a token-weighted voting system to allow users to have voting power proportional to their token holdings.', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', 'active', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), 'Community rewards program', 'Let''s establish a community rewards program to incentivize participation in governance activities.', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'draft', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- Insert demo e-voting polls
INSERT INTO e_voting_polls (id, title, description, creator_address, start_time, end_time, status, total_votes)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Community Governance Proposal #1', 'Should we implement a new reward system for active contributors?', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', NOW(), NOW() + INTERVAL '7 days', 'active', 0),
  ('550e8400-e29b-41d4-a716-446655440001', 'Technical Upgrade Vote', 'Vote on the proposed technical upgrades for Q2 2024', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 'active', 0),
  ('550e8400-e29b-41d4-a716-446655440002', 'Community Event Planning', 'Choose the theme for our next community event', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 'active', 0);

-- Insert poll options
INSERT INTO poll_options (poll_id, option_text, vote_count)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Yes, implement new reward system', 0),
  ('550e8400-e29b-41d4-a716-446655440000', 'No, keep current system', 0),
  ('550e8400-e29b-41d4-a716-446655440000', 'Yes, but with modifications', 0),
  
  ('550e8400-e29b-41d4-a716-446655440001', 'Implement all proposed upgrades', 0),
  ('550e8400-e29b-41d4-a716-446655440001', 'Implement critical upgrades only', 0),
  ('550e8400-e29b-41d4-a716-446655440001', 'Postpone upgrades to Q3', 0),
  
  ('550e8400-e29b-41d4-a716-446655440002', 'Technical Workshop', 0),
  ('550e8400-e29b-41d4-a716-446655440002', 'Community Meetup', 0),
  ('550e8400-e29b-41d4-a716-446655440002', 'Hackathon', 0);

-- Insert anonymous votes (using hashed addresses)
INSERT INTO anonymous_votes (poll_id, option_id, voter_hash)
SELECT
  '550e8400-e29b-41d4-a716-446655440000',
  (SELECT id FROM poll_options WHERE poll_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1),
  encode(sha256(('0x' || substr(md5(random()::text), 1, 40))::bytea), 'hex');

-- Insert demo poll discussions
INSERT INTO poll_discussions (poll_id, content, author_hash, created_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'I think the new reward system would incentivize more participation.', encode(sha256('anonymous1'::bytea), 'hex'), NOW() - INTERVAL '1 hour'),
  ('550e8400-e29b-41d4-a716-446655440000', 'We should carefully consider the impact on smaller contributors.', encode(sha256('anonymous2'::bytea), 'hex'), NOW() - INTERVAL '30 minutes'),
  ('550e8400-e29b-41d4-a716-446655440001', 'The technical upgrades seem essential for our growth.', encode(sha256('anonymous3'::bytea), 'hex'), NOW() - INTERVAL '2 hours'),
  ('550e8400-e29b-41d4-a716-446655440002', 'A hackathon would be great for building our community!', encode(sha256('anonymous4'::bytea), 'hex'), NOW() - INTERVAL '1 day');

-- Update vote counts
UPDATE poll_options
SET vote_count = vote_count + 1
WHERE id IN (
  SELECT option_id
  FROM anonymous_votes
  WHERE poll_id = '550e8400-e29b-41d4-a716-446655440000'
);

UPDATE e_voting_polls
SET total_votes = total_votes + 1
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Verification queries
SELECT 'community_users' as table_name, COUNT(*) as count FROM community_users
UNION ALL
SELECT 'discussions' as table_name, COUNT(*) as count FROM discussions
UNION ALL
SELECT 'discussion_comments' as table_name, COUNT(*) as count FROM discussion_comments
UNION ALL
SELECT 'discussion_reactions' as table_name, COUNT(*) as count FROM discussion_reactions
UNION ALL
SELECT 'reputation_history' as table_name, COUNT(*) as count FROM reputation_history
UNION ALL
SELECT 'proposals' as table_name, COUNT(*) as count FROM proposals
UNION ALL
SELECT 'e_voting_polls' as table_name, COUNT(*) as count FROM e_voting_polls
UNION ALL
SELECT 'poll_options' as table_name, COUNT(*) as count FROM poll_options
UNION ALL
SELECT 'anonymous_votes' as table_name, COUNT(*) as count FROM anonymous_votes
UNION ALL
SELECT 'poll_discussions' as table_name, COUNT(*) as count FROM poll_discussions; 