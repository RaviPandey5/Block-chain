import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Define the types for our home data
interface HomeData {
  discussionsCount: number;
  membersCount: number;
  contributorsCount: number;
  proposalsCount: number;
  candidates: Candidate[];
  // Additional stats needed by Hero component
  totalVotes: number;
  totalCandidates: number;
  verifiedUsers: number;
  recentTransactions: number;
  participationRate: number;
  securityScore: number;
  lastVote: { timestamp: number } | null;
  recentVotes: Array<{
    voter: string;
    timestamp: number;
    candidateId: number;
  }>;
  loading: boolean;
  error: string | null;
}

interface Candidate {
  id: number;
  name: string;
  party: string;
  description: string;
  voteCount: number;
}

// Create default/fallback data
const defaultHomeData: HomeData = {
  discussionsCount: 0,
  membersCount: 0,
  contributorsCount: 0,
  proposalsCount: 0,
  candidates: [
    {
      id: 1,
      name: "Sarah Johnson",
      party: "Progressive Alliance",
      description: "Experienced leader focused on sustainable development",
      voteCount: 245
    },
    {
      id: 2,
      name: "Michael Chen",
      party: "Innovation Party",
      description: "Tech entrepreneur advocating for digital transformation",
      voteCount: 189
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      party: "Unity Coalition",
      description: "Community organizer committed to inclusive policies",
      voteCount: 217
    }
  ],
  // Hero component defaults
  totalVotes: 651, // Sum of default candidate votes
  totalCandidates: 3,
  verifiedUsers: 1000,
  recentTransactions: 120,
  participationRate: 65.1,
  securityScore: 100,
  lastVote: { timestamp: Math.floor(Date.now() / 1000) - 300 }, // 5 minutes ago
  recentVotes: [
    {
      voter: "0x1234567890abcdef1234567890abcdef12345678",
      timestamp: Math.floor(Date.now() / 1000) - 300,
      candidateId: 1
    },
    {
      voter: "0xabcdef1234567890abcdef1234567890abcdef12",
      timestamp: Math.floor(Date.now() / 1000) - 600,
      candidateId: 3
    },
    {
      voter: "0x7890abcdef1234567890abcdef1234567890abcd",
      timestamp: Math.floor(Date.now() / 1000) - 900,
      candidateId: 2
    }
  ],
  loading: true,
  error: null
};

// Create context
const HomeDataContext = createContext<HomeData>(defaultHomeData);

// Custom hook to use home data
export const useHomeData = () => useContext(HomeDataContext);

// The provider component
export const HomeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<HomeData>(defaultHomeData);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Fetch discussions count
        const { count: discussionsCount, error: discussionsError } = await supabase
          .from('discussions')
          .select('*', { count: 'exact', head: true });

        if (discussionsError) {
          console.error('Error fetching discussions count:', discussionsError);
        }

        // Fetch community users count
        const { count: membersCount, error: membersError } = await supabase
          .from('community_users')
          .select('*', { count: 'exact', head: true });

        if (membersError) {
          console.error('Error fetching members count:', membersError);
        }

        // Fetch contributors count (users with reputation > 0)
        const { count: contributorsCount, error: contributorsError } = await supabase
          .from('community_users')
          .select('*', { count: 'exact', head: true })
          .gt('reputation_score', 0);

        if (contributorsError) {
          console.error('Error fetching contributors count:', contributorsError);
        }

        // Fetch proposals count
        const { count: proposalsCount, error: proposalsError } = await supabase
          .from('proposals')
          .select('*', { count: 'exact', head: true });

        if (proposalsError) {
          console.error('Error fetching proposals count:', proposalsError);
        }

        // Also fetch any candidates from database if available
        // This is a fallback in case blockchain data isn't available
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidates')
          .select('*')
          .order('vote_count', { ascending: false });

        if (candidatesError) {
          console.error('Error fetching candidates:', candidatesError);
        }

        // Map candidates to our format if available
        const candidates = candidatesData ? candidatesData.map((candidate: any) => ({
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          description: candidate.description,
          voteCount: candidate.vote_count || 0
        })) : defaultHomeData.candidates;

        // Calculate totalVotes
        const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);

        // Fetch recent votes
        const { data: recentVotesData, error: recentVotesError } = await supabase
          .from('votes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        // Format votes for display
        const recentVotes = recentVotesData ? recentVotesData.map((vote: any) => ({
          voter: vote.voter_address || "0x0000000000000000000000000000000000000000",
          timestamp: Math.floor(new Date(vote.created_at).getTime() / 1000),
          candidateId: vote.candidate_id
        })) : defaultHomeData.recentVotes;

        // Get the last vote timestamp
        const lastVote = recentVotes.length > 0 
          ? { timestamp: recentVotes[0].timestamp } 
          : defaultHomeData.lastVote;

        // Calculate participation rate
        const participationRate = membersCount && membersCount > 0 
          ? (totalVotes / membersCount) * 100 
          : defaultHomeData.participationRate;

        // Fetch recent transactions
        const { count: recentTransactionsCount, error: transactionsError } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true });
          
        if (transactionsError) {
          console.error('Error fetching transactions count:', transactionsError);
        }

        // Update state with all our data
        setData({
          discussionsCount: discussionsCount || 0,
          membersCount: membersCount || 0,
          contributorsCount: contributorsCount || 0,
          proposalsCount: proposalsCount || 0,
          candidates: candidates.length > 0 ? candidates : defaultHomeData.candidates,
          totalVotes: totalVotes || defaultHomeData.totalVotes,
          totalCandidates: candidates.length || defaultHomeData.totalCandidates,
          verifiedUsers: membersCount || defaultHomeData.verifiedUsers,
          recentTransactions: recentTransactionsCount || defaultHomeData.recentTransactions,
          participationRate: participationRate || defaultHomeData.participationRate,
          securityScore: 100, // Always 100 for now
          lastVote: lastVote,
          recentVotes: recentVotes,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Error in fetchHomeData:', error);
        setData({
          ...defaultHomeData,
          loading: false,
          error: 'Failed to load home data'
        });
      }
    };

    fetchHomeData();

    // Set up real-time subscriptions for live updates
    const discussionsSubscription = supabase
      .channel('discussion-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussions' }, () => {
        fetchHomeData();
      })
      .subscribe();

    return () => {
      discussionsSubscription.unsubscribe();
    };
  }, []);

  return (
    <HomeDataContext.Provider value={data}>
      {children}
    </HomeDataContext.Provider>
  );
}; 