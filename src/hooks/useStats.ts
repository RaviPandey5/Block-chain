import { useQuery } from '@tanstack/react-query';
import { useElectionContract } from './useElectionContract';
import { useAccount } from 'wagmi';

interface Stats {
  totalVotes: number;
  verifiedUsers: number;
  totalCandidates: number;
  participationRate: number;
}

export const useStats = () => {
  const { getContract } = useElectionContract();
  const { isConnected } = useAccount();
  const contract = getContract();

  return useQuery({
    queryKey: ['stats', isConnected],
    queryFn: async (): Promise<Stats> => {
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      try {
        // Get all blockchain events for accurate calculations
        const voteFilter = contract.filters.VoteCast();
        const verificationFilter = contract.filters.AadhaarVerified();
        
        const [voteEvents, verificationEvents, totalCandidates] = await Promise.all([
          contract.queryFilter(voteFilter),
          contract.queryFilter(verificationFilter),
          contract.getTotalCandidates()
        ]);

        const totalVotes = voteEvents.length;
        const verifiedUsers = verificationEvents.length;
        const participationRate = verifiedUsers > 0 ? (totalVotes / verifiedUsers) * 100 : 0;

        return {
          totalVotes,
          verifiedUsers,
          totalCandidates: totalCandidates.toNumber(),
          participationRate
        };
      } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
      }
    },
    enabled: isConnected && !!contract,
    refetchInterval: 30000
  });
}; 