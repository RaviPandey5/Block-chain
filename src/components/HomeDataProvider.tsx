import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useElectionContract } from '../hooks/useElectionContract';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';

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

// Create default/fallback data with zeros instead of mock data
const defaultHomeData: HomeData = {
  discussionsCount: 0,
  membersCount: 0,
  contributorsCount: 0,
  proposalsCount: 0,
  candidates: [],
  totalVotes: 0,
  totalCandidates: 0,
  verifiedUsers: 0,
  recentTransactions: 0,
  participationRate: 0,
  securityScore: 100,
  lastVote: null,
  recentVotes: [],
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
  const { getContract } = useElectionContract();
  const { address } = useAccount();

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Get contract instance
        const contract = getContract();
        if (!contract) {
          throw new Error('Contract not initialized');
        }

        // Fetch blockchain data first
        let candidates: Candidate[] = [];
        let totalVotes = 0;
        let verifiedUsers = 0;
        let recentVotes: Array<{ voter: string; timestamp: number; candidateId: number }> = [];
        let lastVote: { timestamp: number } | null = null;

        try {
          // Fetch candidates from blockchain
          candidates = await contract.getCandidates();
          candidates = candidates.map((candidate: any) => ({
            id: candidate.id.toNumber(),
            name: candidate.name,
            party: candidate.party,
            description: candidate.description,
            voteCount: candidate.voteCount.toNumber()
          }));

          // Calculate total votes from candidate data
          totalVotes = candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);

          // Get verified users count from contract events
          const verifiedFilter = contract.filters.AadhaarVerified();
          const verifiedEvents = await contract.queryFilter(verifiedFilter);
          verifiedUsers = verifiedEvents.length;

          // Fetch recent vote events from blockchain
          const voteFilter = contract.filters.VoteCast();
          const voteEvents = await contract.queryFilter(voteFilter);
          
          // Get block timestamps for events
          const processedVotes = await Promise.all(
            voteEvents.map(async (event) => {
              try {
                const block = await event.getBlock();
                const voter = event.args?.[0];
                const candidateId = event.args?.[1];

                if (!block || !voter || !candidateId) {
                  console.warn('Invalid event data:', { block, voter, candidateId });
                  return null;
                }

                return {
                  voter: voter.toLowerCase(),
                  candidateId: candidateId.toNumber(),
                  timestamp: block.timestamp,
                  blockNumber: block.number
                };
              } catch (error) {
                console.error('Error processing vote event:', error);
                return null;
              }
            })
          );

          // Filter out null values and sort by block number (descending)
          const validVotes = processedVotes
            .filter((vote): vote is NonNullable<typeof vote> => vote !== null)
            .sort((a, b) => b.blockNumber - a.blockNumber);

          // Get recent votes (last 5)
          recentVotes = validVotes.slice(0, 5).map(vote => ({
            voter: vote.voter,
            timestamp: vote.timestamp,
            candidateId: vote.candidateId
          }));

          // Set last vote if we have any votes
          if (validVotes.length > 0) {
            lastVote = { timestamp: validVotes[0].timestamp };
          }

          // Fetch transaction count (including votes and verifications)
          const recentTransactions = voteEvents.length + verifiedEvents.length;

          // Calculate participation rate
          const participationRate = verifiedUsers > 0 
            ? (totalVotes / verifiedUsers) * 100 
            : 0;

          // Update state with blockchain data
          setData(prev => ({
            ...prev,
            candidates,
            totalVotes,
            totalCandidates: candidates.length,
            verifiedUsers,
            recentTransactions,
            participationRate,
            securityScore: 100,
            lastVote,
            recentVotes,
            loading: false,
            error: null
          }));

        } catch (error) {
          console.error('Error fetching blockchain data:', error);
          throw error;
        }

        // Fetch Supabase data for community stats
        const [
          discussionsResult,
          membersResult,
          contributorsResult,
          proposalsResult,
        ] = await Promise.all([
          supabase.from('discussions').select('*', { count: 'exact', head: true }),
          supabase.from('community_users').select('*', { count: 'exact', head: true }),
          supabase.from('community_users')
            .select('*', { count: 'exact', head: true })
            .gt('reputation_score', 0),
          supabase.from('proposals').select('*', { count: 'exact', head: true }),
        ]);

        // Update state with combined data
        setData(prev => ({
          ...prev,
          discussionsCount: discussionsResult.count || 0,
          membersCount: membersResult.count || 0,
          contributorsCount: contributorsResult.count || 0,
          proposalsCount: proposalsResult.count || 0,
        }));

      } catch (error) {
        console.error('Error in fetchHomeData:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load home data'
        }));
      }
    };

    // Initial fetch
    fetchHomeData();

    // Set up blockchain event listeners
    const contract = getContract();
    if (contract) {
      const voteFilter = contract.filters.VoteCast();
      const verificationFilter = contract.filters.AadhaarVerified();

      contract.on(voteFilter, () => fetchHomeData());
      contract.on(verificationFilter, () => fetchHomeData());

      // Set up Supabase subscriptions
      const subscriptions = [
        supabase.channel('discussions-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'discussions' }, fetchHomeData)
          .subscribe(),
        supabase.channel('users-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'community_users' }, fetchHomeData)
          .subscribe(),
        supabase.channel('proposals-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, fetchHomeData)
          .subscribe()
      ];

      // Cleanup function
      return () => {
        contract.removeAllListeners(voteFilter);
        contract.removeAllListeners(verificationFilter);
        subscriptions.forEach(subscription => subscription.unsubscribe());
      };
    }

    return undefined;
  }, [getContract, address]);

  return (
    <HomeDataContext.Provider value={data}>
      {children}
    </HomeDataContext.Provider>
  );
}; 