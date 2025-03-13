-- Create election_stats table
CREATE TABLE IF NOT EXISTS election_stats (
  id INTEGER PRIMARY KEY,
  total_eligible_voters INTEGER NOT NULL DEFAULT 0,
  total_verified_users INTEGER NOT NULL DEFAULT 0,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  description TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create voter_demographics table
CREATE TABLE IF NOT EXISTS voter_demographics (
  id SERIAL PRIMARY KEY,
  age_group TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default demographics data
INSERT INTO voter_demographics (age_group, percentage) VALUES
  ('18-25', 25),
  ('26-35', 35),
  ('36-50', 25),
  ('51+', 15)
ON CONFLICT (id) DO UPDATE
SET percentage = EXCLUDED.percentage,
    last_updated = CURRENT_TIMESTAMP;

-- Create RLS policies
ALTER TABLE election_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_demographics ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on election_stats"
  ON election_stats FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on candidates"
  ON candidates FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on voter_demographics"
  ON voter_demographics FOR SELECT
  USING (true);

-- Create policies for authenticated write access
CREATE POLICY "Allow authenticated write access on election_stats"
  ON election_stats FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write access on candidates"
  ON candidates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write access on voter_demographics"
  ON voter_demographics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'); 