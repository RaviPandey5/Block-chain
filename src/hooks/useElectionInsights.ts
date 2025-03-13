import { useQuery } from '@tanstack/react-query';
import { useElectionContract } from './useElectionContract';
import { useVotingData } from './useVotingData';
import { supabase } from '../lib/supabase';
import { syncBlockchainData } from '../utils/syncBlockchainData';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { ethers } from 'ethers';

// Remove Gemini initialization from here as we'll use simpler analytics

interface Vote {
  timestamp: number;
  candidateId: number;
  voter: string;
}

interface Metric {
  title: string;
  value: string;
  change: number;
}

interface VotingTrend {
  timestamp: number;
  votes: number;
  analysis: string;
}

interface BlockchainInsight {
  title: string;
  value: string;
  description: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface ElectionInsights {
  metrics: Metric[];
  votingTrends: VotingTrend[];
  blockchainInsights: BlockchainInsight[];
  recentAnalysis: string[];
  dailyAnalysis: VotingTrend[];
}

export const useElectionInsights = () => {
  const { getContract } = useElectionContract();
  const { votingStats, candidates } = useVotingData();
  const { isConnected } = useAccount();
  const contract = getContract();

  // Trigger sync when wallet connects
  useEffect(() => {
    const syncData = async () => {
      if (isConnected && contract) {
        try {
          console.log('Wallet connected, syncing blockchain data...');
          await syncBlockchainData(contract);
        } catch (error) {
          console.error('Error syncing data on wallet connect:', error);
        }
      }
    };

    syncData();
  }, [isConnected, contract]);

  return useQuery({
    queryKey: ['electionInsights', isConnected],
    queryFn: async (): Promise<ElectionInsights> => {
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      try {
        // Get all blockchain events for accurate calculations
        const voteFilter = contract.filters.VoteCast();
        const verificationFilter = contract.filters.AadhaarVerified();
        
        const [voteEvents, verificationEvents] = await Promise.all([
          contract.queryFilter(voteFilter),
          contract.queryFilter(verificationFilter)
        ]);

        // Calculate total verified users and votes
        const totalVerifiedUsers = verificationEvents.length;
        const totalVotes = voteEvents.length;

        // Get vote timestamps for trend analysis
        const voteTimestamps = await Promise.all(
          voteEvents.map(async (event) => {
            const block = await event.getBlock();
            return {
              timestamp: block.timestamp * 1000,
              voter: event.args?.voter,
              candidateId: event.args?.candidateId.toNumber()
            };
          })
        );

        // Generate metrics
        const metrics = [
          {
            title: 'Total Votes',
            value: totalVotes.toString(),
            change: calculateVoteChangePercentage(voteTimestamps)
          },
          {
            title: 'Active Candidates',
            value: candidates.length.toString(),
            change: candidates.length > 0 ? 100 : 0
          },
          {
            title: 'Participation Rate',
            value: `${Math.round((totalVotes / totalVerifiedUsers) * 100)}%`,
            change: calculateParticipationRateChange(voteTimestamps, totalVerifiedUsers)
          },
          {
            title: 'Avg. Time Between Votes',
            value: calculateAverageTimeBetweenVotes(voteTimestamps),
            change: calculateTimeChangePercentage(voteTimestamps)
          }
        ];

        // Generate voting trends for the last 24 hours
        const votingTrends = generateVotingTrends(voteTimestamps);

        // Get blockchain insights
        const blockchainInsights = await generateBlockchainInsights(contract, voteEvents, verificationEvents);

        // Get daily analysis from blockchain events
        const dailyAnalysis = await generateDailyAnalysis(voteEvents);

        // Generate analysis
        const recentAnalysis = generateInsightsAnalysis({
          totalVotes,
          totalVerifiedUsers,
          participationRate: (totalVotes / totalVerifiedUsers) * 100,
          voteChangePercentage: calculateVoteChangePercentage(voteTimestamps),
          recentVotesCount: votingTrends.reduce((sum, t) => sum + t.votes, 0),
          candidateCount: candidates.length
        });

        return {
          metrics,
          votingTrends,
          blockchainInsights,
          recentAnalysis,
          dailyAnalysis
        };
      } catch (error) {
        console.error('Error fetching election insights:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
    enabled: isConnected && !!contract,
    staleTime: 10000,
    gcTime: 60000
  });
};

// Helper function to calculate participation rate change
const calculateParticipationRateChange = (votes: Vote[], totalVerifiedUsers: number): number => {
  if (totalVerifiedUsers === 0) return 0;

  const now = Date.now();
  const currentPeriodStart = now - 24 * 60 * 60 * 1000;
  const previousPeriodStart = currentPeriodStart - 24 * 60 * 60 * 1000;

  const currentPeriodVotes = votes.filter(v => v.timestamp >= currentPeriodStart).length;
  const previousPeriodVotes = votes.filter(v => v.timestamp >= previousPeriodStart && v.timestamp < currentPeriodStart).length;

  const currentRate = (currentPeriodVotes / totalVerifiedUsers) * 100;
  const previousRate = (previousPeriodVotes / totalVerifiedUsers) * 100;

  const percentageChange = ((currentRate - previousRate) / previousRate) * 100;

  // Round the percentage to nearest integer
  return Math.round(percentageChange);
};

// Helper function to calculate time change percentage
const calculateTimeChangePercentage = (votes: Vote[]): number => {
  if (votes.length < 4) return 0;

  const sortedVotes = [...votes].sort((a, b) => a.timestamp - b.timestamp);
  const recentGap = sortedVotes[sortedVotes.length - 1].timestamp - sortedVotes[sortedVotes.length - 2].timestamp;
  const previousGap = sortedVotes[sortedVotes.length - 2].timestamp - sortedVotes[sortedVotes.length - 3].timestamp;

  const percentageChange = ((recentGap - previousGap) / previousGap) * 100;

  // Round the percentage to nearest integer
  return Math.round(percentageChange);
};

// Helper function to calculate average time between votes
const calculateAverageTimeBetweenVotes = (votes: Vote[]): string => {
  if (votes.length < 2) return 'N/A';
  
  const sortedVotes = [...votes].sort((a, b) => a.timestamp - b.timestamp);
  let totalTime = 0;
  
  for (let i = 1; i < sortedVotes.length; i++) {
    totalTime += sortedVotes[i].timestamp - sortedVotes[i-1].timestamp;
  }
  
  const avgTimeMs = totalTime / (sortedVotes.length - 1);
  if (avgTimeMs < 60000) return `${Math.round(avgTimeMs / 1000)}s`;
  if (avgTimeMs < 3600000) return `${Math.round(avgTimeMs / 60000)}m`;
  return `${Math.round(avgTimeMs / 3600000)}h`;
};

// Generate voting trends with 24-hour analysis
const generateVotingTrends = (votes: Vote[]): VotingTrend[] => {
  if (votes.length === 0) return [];

  const now = Date.now();
  const trends: VotingTrend[] = [];
  
  // Create 24 hourly slots for the last 24 hours
  for (let i = 23; i >= 0; i--) {
    const hourStart = now - (i + 1) * 60 * 60 * 1000;
    const hourEnd = now - i * 60 * 60 * 1000;
    
    const hourlyVotes = votes.filter(
      vote => vote.timestamp >= hourStart && vote.timestamp < hourEnd
    );

    trends.push({
      timestamp: hourEnd,
      votes: hourlyVotes.length,
      analysis: `${hourlyVotes.length} votes in this hour`
    });
  }

  return trends;
};

// Helper function to generate daily analysis from blockchain events
const generateDailyAnalysis = async (voteEvents: any[]): Promise<VotingTrend[]> => {
  if (voteEvents.length === 0) return [];

  const now = Math.floor(Date.now() / 1000);
  const threeDaysAgo = now - (3 * 24 * 60 * 60);
  
  // Get blocks for the events
  const eventBlocks = await Promise.all(
    voteEvents.map(async (event) => {
      const block = await event.getBlock();
      return {
        timestamp: block.timestamp,
        event
      };
    })
  );

  // Group events by day
  const dailyEvents = eventBlocks.reduce((acc: { [key: string]: any[] }, { timestamp, event }) => {
    if (timestamp < threeDaysAgo) return acc;
    
    const date = new Date(timestamp * 1000).toLocaleDateString();
    acc[date] = acc[date] || [];
    acc[date].push(event);
    return acc;
  }, {});

  // Convert to VotingTrend array
  return Object.entries(dailyEvents)
    .map(([date, events]) => ({
      timestamp: new Date(date).getTime(),
      votes: events.length,
      analysis: generateDailyVoteAnalysis(events)
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
};

// Helper function to analyze daily voting patterns
const generateDailyVoteAnalysis = (events: any[]): string => {
  if (events.length === 0) return 'No voting activity';

  const hourDistribution = events.map(event => 
    new Date(event.blockTimestamp * 1000).getHours()
  );

  const morningVotes = hourDistribution.filter(h => h >= 6 && h < 12).length;
  const afternoonVotes = hourDistribution.filter(h => h >= 12 && h < 18).length;
  const eveningVotes = hourDistribution.filter(h => h >= 18 || h < 6).length;

  let peakPeriod = '';
  let peakCount = 0;

  if (morningVotes >= afternoonVotes && morningVotes >= eveningVotes) {
    peakPeriod = 'morning';
    peakCount = morningVotes;
  } else if (afternoonVotes >= morningVotes && afternoonVotes >= eveningVotes) {
    peakPeriod = 'afternoon';
    peakCount = afternoonVotes;
  } else {
    peakPeriod = 'evening';
    peakCount = eveningVotes;
  }

  return `Peak activity during ${peakPeriod} with ${peakCount} votes. Total daily votes: ${events.length}`;
};

// Generate insights analysis based on data
const generateInsightsAnalysis = (data: {
  totalVotes: number;
  totalVerifiedUsers: number;
  participationRate: number;
  voteChangePercentage: number;
  recentVotesCount: number;
  candidateCount: number;
}): string[] => {
  const insights: string[] = [];

  // Participation insight
  if (data.participationRate < 30) {
    insights.push('Low voter turnout indicates need for increased engagement initiatives.');
  } else if (data.participationRate > 70) {
    insights.push('High participation rate shows strong community engagement.');
  } else {
    insights.push(`Moderate participation rate of ${data.participationRate.toFixed(1)}% observed.`);
  }

  // Recent activity insight
  if (data.recentVotesCount > 0) {
    insights.push(`Active voting in last 24 hours with ${data.recentVotesCount} new votes cast.`);
  } else {
    insights.push('No recent voting activity in the last 24 hours.');
  }

  // Trend insight
  if (data.voteChangePercentage > 0) {
    insights.push(`Voting activity increased by ${data.voteChangePercentage.toFixed(1)}% compared to previous period.`);
  } else if (data.voteChangePercentage < 0) {
    insights.push(`Voting activity decreased by ${Math.abs(data.voteChangePercentage).toFixed(1)}% compared to previous period.`);
  } else {
    insights.push('Voting activity remains stable compared to previous period.');
  }

  // Overall status
  insights.push(`Total of ${data.totalVotes} votes cast across ${data.candidateCount} candidates with ${data.totalVerifiedUsers} verified voters.`);

  return insights;
};

// Helper function to calculate vote change percentage
const calculateVoteChangePercentage = (votes: Vote[]): number => {
  const now = Date.now();
  const last24Hours = now - 24 * 60 * 60 * 1000;
  const previous24Hours = last24Hours - 24 * 60 * 60 * 1000;

  const recentVotes = votes.filter(v => v.timestamp >= last24Hours).length;
  const previousVotes = votes.filter(v => v.timestamp >= previous24Hours && v.timestamp < last24Hours).length;

  if (previousVotes === 0) return recentVotes > 0 ? 100 : 0;
  return Math.round(((recentVotes - previousVotes) / previousVotes) * 100);
};

// New function to generate blockchain-based insights
const generateBlockchainInsights = async (
  contract: ethers.Contract,
  voteEvents: any[],
  verificationEvents: any[]
): Promise<BlockchainInsight[]> => {
  const insights: BlockchainInsight[] = [];
  
  // 1. Voter Verification Rate
  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
  const recentVerifications = verificationEvents.filter(
    event => event.blockTimestamp * 1000 >= last24Hours
  ).length;
  
  insights.push({
    title: 'Verification Rate',
    value: `${recentVerifications} new`,
    description: 'New voter verifications in last 24 hours',
    trend: recentVerifications > 0 ? 'up' : 'neutral'
  });

  // 2. Active Voter Analysis
  const uniqueVoters = new Set(voteEvents.map(event => event.args.voter)).size;
  const verifiedUsers = verificationEvents.length;
  const activeVoterPercentage = Math.round((uniqueVoters / verifiedUsers) * 100);
  
  insights.push({
    title: 'Active Voters',
    value: `${activeVoterPercentage}%`,
    description: `${uniqueVoters} out of ${verifiedUsers} verified users have voted`,
    trend: activeVoterPercentage > 50 ? 'up' : 'down'
  });

  // 3. Transaction Efficiency
  const voteTransactions = voteEvents.length;
  const successfulVotes = voteEvents.filter(event => event.status === 1).length;
  const successRate = Math.round((successfulVotes / voteTransactions) * 100);
  
  insights.push({
    title: 'Transaction Success',
    value: `${successRate}%`,
    description: `${successfulVotes} successful votes out of ${voteTransactions} attempts`,
    trend: successRate > 95 ? 'up' : successRate > 90 ? 'neutral' : 'down'
  });

  // 4. Network Activity
  const blocks = await Promise.all(voteEvents.map(event => event.getBlock()));
  const averageBlockTime = blocks.reduce((acc, block, idx, arr) => {
    if (idx === 0) return 0;
    return acc + (block.timestamp - arr[idx - 1].timestamp);
  }, 0) / (blocks.length - 1);

  insights.push({
    title: 'Network Health',
    value: `${Math.round(averageBlockTime)}s`,
    description: 'Average block time for vote transactions',
    trend: averageBlockTime < 15 ? 'up' : averageBlockTime < 30 ? 'neutral' : 'down'
  });

  return insights;
}; 