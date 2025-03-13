import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useElectionContract } from './useElectionContract';
import { useAuditData } from './useAuditData';

interface HomeStats {
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
}

const INITIAL_STATS: HomeStats = {
  totalVotes: 0,
  totalCandidates: 0,
  verifiedUsers: 0,
  recentTransactions: 0,
  participationRate: 0,
  securityScore: 100,
  lastVote: null,
  recentVotes: []
};

const HOME_DATA_KEY = ['homeData'] as const;

export function useHomeData() {
  const { getCandidates, getContract } = useElectionContract();
  const { transactions } = useAuditData();

  const fetchHomeData = useCallback(async (): Promise<HomeStats> => {
    try {
      const contract = getContract();
      if (!contract) {
        console.log('Contract not initialized yet');
        return INITIAL_STATS;
      }

      // Get candidates data
      const candidates = await getCandidates();
      const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
      
      // Get verification events to count verified users
      const verificationFilter = contract.filters.AadhaarVerified();
      const verificationEvents = await contract.queryFilter(verificationFilter);
      const verifiedUsers = verificationEvents.length;

      // Get vote events for recent votes
      const voteFilter = contract.filters.VoteCast();
      const voteEvents = await contract.queryFilter(voteFilter);
      
      console.log('Vote events found:', voteEvents.length);

      // Process vote events with better error handling
      const processedVotes = await Promise.all(
        voteEvents.map(async (event) => {
          try {
            const block = await event.getBlock();
            if (!block) {
              console.warn('Block not found for event:', event);
              return null;
            }

            // VoteCast event has indexed parameters: address indexed voter, uint256 indexed candidateId
            const voter = event.args?.voter;
            const candidateId = event.args?.candidateId;

            if (!voter || candidateId === undefined) {
              console.warn('Missing event arguments:', {
                voter,
                candidateId,
                event: event.args
              });
              return null;
            }

            return {
              voter: voter.toLowerCase(), // normalize address
              timestamp: block.timestamp,
              candidateId: candidateId.toNumber()
            };
          } catch (error) {
            console.error('Error processing vote event:', error);
            return null;
          }
        })
      );

      // Filter out null values and sort by timestamp
      const validVotes = processedVotes.filter((vote): vote is NonNullable<typeof vote> => vote !== null);
      const sortedVotes = validVotes.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log('Processed votes:', {
        total: validVotes.length,
        recent: sortedVotes.slice(0, 5)
      });

      // Get last vote and recent votes
      const lastVote = sortedVotes.length > 0 ? { timestamp: sortedVotes[0].timestamp } : null;
      const recentVotes = sortedVotes.slice(0, 5); // Get last 5 votes

      // Calculate participation rate
      const participationRate = verifiedUsers > 0 
        ? (totalVotes / verifiedUsers) * 100 
        : 0;

      const stats = {
        totalVotes,
        totalCandidates: candidates.length,
        verifiedUsers,
        recentTransactions: transactions.length,
        participationRate,
        securityScore: 100,
        lastVote,
        recentVotes
      };

      console.log('Returning stats:', stats);

      return stats;
    } catch (error) {
      console.error('Error fetching home data:', error);
      return INITIAL_STATS;
    }
  }, [getCandidates, getContract, transactions.length]);

  const { data = INITIAL_STATS, isLoading, error } = useQuery({
    queryKey: HOME_DATA_KEY,
    queryFn: fetchHomeData,
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  return {
    stats: data,
    loading: isLoading,
    error
  };
} 