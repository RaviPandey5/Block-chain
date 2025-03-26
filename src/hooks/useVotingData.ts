import { useState, useEffect, useCallback, useRef } from 'react';
import { useElectionContract } from './useElectionContract';
import { ethers } from 'ethers';
import { useAccount, useWalletClient, useNetwork, usePublicClient } from 'wagmi';
import { providers } from 'ethers';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface VoteData {
  candidateId: number;
  voter: string;
  timestamp: number;
  blockNumber: number;
}

export interface VotingStats {
  totalVotes: number;
  participationRate: number;
  verifiedUsers: number;
  lastVote: VoteData | null;
  recentVotes: VoteData[];
}

const CONTRACT_ABI = [
  "function getCandidates() external view returns (tuple(uint256 id, string name, string party, string description, uint256 voteCount)[])",
  "event VoteCast(address indexed voter, uint256 indexed candidateId)",
  "function isVerified(address user) external view returns (bool)",
  "function getVerificationDetails(address user) external view returns (tuple(bool isVerified, bytes32 encryptedAadhaar, uint256 timestamp))",
  "event AadhaarVerified(address indexed user)"
];

const SEPOLIA_NETWORK = {
  name: 'sepolia',
  chainId: 11155111,
  ensAddress: undefined
};

const SEPOLIA_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/';

const VOTING_DATA_KEY = ['votingData'] as const;
const VOTING_INITIALIZED_KEY = ['votingInitialized'] as const;

interface VotingDataResponse {
  candidates: any[];
  votingStats: {
    totalVotes: number;
    participationRate: number;
    verifiedUsers: number;
    lastVote: VoteData | null;
    recentVotes: VoteData[];
  };
}

const EMPTY_RESPONSE: VotingDataResponse = {
  candidates: [],
  votingStats: {
    totalVotes: 0,
    participationRate: 0,
    verifiedUsers: 0,
    lastVote: null,
    recentVotes: []
  }
};

export function useVotingData(refreshInterval = 1000) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const isUpdating = useRef(false);
  const { isConnected } = useAccount();
  const { chain } = useNetwork();
  const publicClient = usePublicClient();
  
  const { getCandidates } = useElectionContract();

  // Function to get total verified users
  const getVerifiedUsersCount = async (contract: ethers.Contract): Promise<number> => {
    try {
      // Get verification events
      const filter = contract.filters.AadhaarVerified();
      const events = await contract.queryFilter(filter);
      
      // Get unique verified addresses
      const verifiedAddresses = new Set(events.map(event => event.args?.user));
      
      // Verify current status
      const verificationChecks = await Promise.all(
        Array.from(verifiedAddresses).map(async (address) => {
          try {
            return await contract.isVerified(address);
          } catch (err) {
            console.error('Error checking verification status:', err);
            return false;
          }
        })
      );

      const currentlyVerified = verificationChecks.filter(Boolean).length;
      console.log('Currently verified users:', currentlyVerified);
      return currentlyVerified;
    } catch (err) {
      console.error('Error getting verified users count:', err);
      return 0;
    }
  };

  // Use React Query for global state
  const { data: votingData, isLoading } = useQuery<VotingDataResponse, Error>({
    queryKey: VOTING_DATA_KEY,
    queryFn: async () => {
      if (!chain || !isConnected) {
        throw new Error('Please connect your wallet to the Sepolia network');
      }

      if (isUpdating.current) return EMPTY_RESPONSE;
      isUpdating.current = true;

      try {
        const contract = getContract();
        
        // Fetch all required data in parallel
        const [latestCandidates, historicalVotes, verifiedUsersCount] = await Promise.all([
          getCandidates(),
          fetchHistoricalVotes(),
          getVerifiedUsersCount(contract)
        ]);

        console.log('Fetched data:', {
          candidates: latestCandidates.length,
          votes: historicalVotes.length,
          verifiedUsers: verifiedUsersCount
        });

        // Calculate total votes from candidates
        const totalVotes = latestCandidates.reduce((sum: number, candidate: any) => 
          sum + candidate.voteCount, 0
        );

        // Calculate participation rate
        const participationRate = verifiedUsersCount > 0 
          ? (totalVotes / verifiedUsersCount) * 100 
          : 0;

        // Get last vote and recent votes (last 4)
        const lastVote = historicalVotes.length > 0 ? historicalVotes[0] : null;
        const recentVotes = historicalVotes.slice(0, 4);

        console.log('Vote data:', {
          lastVote,
          recentVotes: recentVotes.length
        });

        // Mark as initialized after first successful fetch
        queryClient.setQueryData(VOTING_INITIALIZED_KEY, true);

        return {
          candidates: latestCandidates,
          votingStats: {
            totalVotes,
            participationRate,
            verifiedUsers: verifiedUsersCount,
            lastVote,
            recentVotes
          }
        };
      } catch (err) {
        console.error('Error fetching voting data:', err);
        setError(err as Error);
        throw err;
      } finally {
        isUpdating.current = false;
      }
    },
    refetchInterval: refreshInterval,
    enabled: isConnected && !!chain,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Query for initialization status
  const { data: initialized = false } = useQuery({
    queryKey: VOTING_INITIALIZED_KEY,
    queryFn: () => false,
    staleTime: Infinity
  });

  // Create a provider for listening to events
  const getProvider = useCallback(() => {
    try {
      const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY;
      if (!alchemyKey) {
        throw new Error('Alchemy API key not found in environment variables');
      }

      // Create JSON-RPC provider directly
      return new providers.StaticJsonRpcProvider(
        `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
      );
    } catch (err) {
      console.error('Error creating provider:', err);
      throw err;
    }
  }, []);

  // Function to get contract instance
  const getContract = useCallback(() => {
    try {
      const provider = getProvider();
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      
      if (!contractAddress) {
        throw new Error('Contract address not found in environment variables');
      }

      // Create contract instance
      console.log('Creating contract with address:', contractAddress);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
      return contract;
    } catch (err) {
      console.error('Error creating contract instance:', err);
      throw err;
    }
  }, [getProvider]);

  // Function to fetch historical votes
  const fetchHistoricalVotes = async () => {
    try {
      const contract = getContract();
      const provider = getProvider();
      
      // Get the current block number
      const currentBlock = await provider.getBlockNumber();
      // Look back 1000 blocks to ensure we catch recent votes while being efficient
      const fromBlock = Math.max(0, currentBlock - 1000);
      
      console.log('Fetching vote events from block:', fromBlock, 'to', currentBlock);

      // Get vote events
      const voteFilter = contract.filters.VoteCast();
      const voteEvents = await contract.queryFilter(voteFilter, fromBlock, currentBlock);
      
      // Process vote events with block data
      const processedVotes = await Promise.all(
        voteEvents.map(async (event) => {
          try {
            // Get block data for timestamp
            const block = await provider.getBlock(event.blockNumber);
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
              blockNumber: event.blockNumber
            };
          } catch (error) {
            console.error('Error processing vote event:', error);
            return null;
          }
        })
      );

      // Filter out null values and sort by block number (descending)
      const validVotes = processedVotes
        .filter((vote): vote is VoteData => vote !== null)
        .sort((a, b) => b.blockNumber - a.blockNumber);

      console.log('Processed votes:', {
        total: validVotes.length,
        recent: validVotes.slice(0, 5)
      });

      return validVotes;
    } catch (error) {
      console.error('Error fetching historical votes:', error);
      return [];
    }
  };

  // Set up event listener for vote events
  useEffect(() => {
    if (!chain || !isConnected) return;

    let contract: ethers.Contract;
    try {
      contract = getContract();
      const provider = getProvider();

      const handleVoteEvent = async (voter: string, candidateId: ethers.BigNumber, event: any) => {
        try {
          console.log('Vote event received:', { voter, candidateId: candidateId.toNumber() });
          
          // Get block data for the new vote
          const block = await provider.getBlock(event.blockNumber);
          if (!block) {
            console.warn('Block not found for vote event');
            return;
          }

          const newVote: VoteData = {
            candidateId: candidateId.toNumber(),
            voter: voter.toLowerCase(),
            timestamp: block.timestamp,
            blockNumber: event.blockNumber
          };

          // Update the voting data with the new vote
          queryClient.setQueryData<VotingDataResponse | undefined>(
            VOTING_DATA_KEY,
            (oldData) => {
              if (!oldData) return undefined;

              // Update total votes
              const totalVotes = oldData.votingStats.totalVotes + 1;
              
              // Update recent votes (keep last 5)
              const recentVotes = [newVote, ...oldData.votingStats.recentVotes].slice(0, 5);

              // Update participation rate
              const participationRate = oldData.votingStats.verifiedUsers > 0
                ? (totalVotes / oldData.votingStats.verifiedUsers) * 100
                : 0;

              return {
                ...oldData,
                votingStats: {
                  ...oldData.votingStats,
                  totalVotes,
                  participationRate,
                  lastVote: newVote,
                  recentVotes
                }
              };
            }
          );

          // Refresh the candidates data to update vote counts
          queryClient.invalidateQueries({ queryKey: VOTING_DATA_KEY });
        } catch (err) {
          console.error('Error handling vote event:', err);
        }
      };

      // Set up event listener
      const voteFilter = contract.filters.VoteCast();
      contract.on(voteFilter, handleVoteEvent);

      return () => {
        contract.off(voteFilter, handleVoteEvent);
      };
    } catch (err) {
      console.error('Failed to set up event listener:', err);
      return;
    }
  }, [chain, isConnected, queryClient, getContract, getProvider]);

  return {
    candidates: votingData?.candidates || [],
    votingStats: votingData?.votingStats || EMPTY_RESPONSE.votingStats,
    loading: isLoading,
    error,
    initialized,
    refresh: () => queryClient.invalidateQueries({ queryKey: VOTING_DATA_KEY })
  };
} 