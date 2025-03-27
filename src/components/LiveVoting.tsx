import React, { useEffect, useState } from 'react';
import { useVotingData } from '../hooks/useVotingData';
import { Activity, Users, BarChart2, Clock, User, Shield, TrendingUp, Network, Timer, Zap } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useElectionContract } from '../hooks/useElectionContract';

interface VotingSpeed {
  votesPerMinute: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdate: number;
}

interface NetworkStats {
  avgBlockTime: number;
  gasPrice: string;
  networkLoad: 'Low' | 'Medium' | 'High';
}

const LiveVoting = () => {
  const { isConnected } = useAccount();
  const { candidates, votingStats, loading, error, initialized, refresh } = useVotingData(1000); // Update every second
  const { getContract } = useElectionContract();
  const [votingSpeed, setVotingSpeed] = useState<VotingSpeed>({ votesPerMinute: 0, trend: 'stable', lastUpdate: Date.now() });
  const [networkStats, setNetworkStats] = useState<NetworkStats>({ avgBlockTime: 0, gasPrice: '0', networkLoad: 'Low' });
  const [recentBlocks, setRecentBlocks] = useState<{ number: number; timestamp: number }[]>([]);

  // Set up real-time updates
  useEffect(() => {
    const contract = getContract();
    if (!contract) return;

    const voteFilter = contract.filters.VoteCast();
    contract.on(voteFilter, () => {
      console.log('New vote detected, refreshing data...');
      refresh();
    });

    return () => {
      contract.removeAllListeners(voteFilter);
    };
  }, [getContract, refresh]);

  // Calculate voting speed and trends
  useEffect(() => {
    const calculateVotingSpeed = () => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000; // 1 minute ago
      
      const recentVotes = votingStats.recentVotes.filter(
        vote => vote.timestamp * 1000 > oneMinuteAgo
      ).length;

      setVotingSpeed(prev => ({
        votesPerMinute: recentVotes,
        trend: recentVotes > prev.votesPerMinute ? 'up' : recentVotes < prev.votesPerMinute ? 'down' : 'stable',
        lastUpdate: now
      }));
    };

    const interval = setInterval(calculateVotingSpeed, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [votingStats.recentVotes]);

  // Fetch network stats using Alchemy provider
  useEffect(() => {
    const fetchNetworkStats = async () => {
      try {
        const contract = getContract();
        if (!contract || !contract.provider) return;

        // Get latest blocks for block time calculation
        const latestBlock = await contract.provider.getBlock('latest');
        const blocks = [];
        for (let i = 0; i < 5; i++) {
          const block = await contract.provider.getBlock(latestBlock.number - i);
          if (block) {
            blocks.push({ number: block.number, timestamp: block.timestamp });
          }
        }
        setRecentBlocks(blocks);

        // Calculate average block time
        const avgBlockTime = blocks.length > 1
          ? (blocks[0].timestamp - blocks[blocks.length - 1].timestamp) / (blocks.length - 1)
          : 0;

        // Get gas price
        const gasPrice = await contract.provider.getGasPrice();
        const gasPriceGwei = parseFloat(gasPrice.toString()) / 1e9;

        // Determine network load based on gas price and block time
        let networkLoad: 'Low' | 'Medium' | 'High' = 'Low';
        if (gasPriceGwei > 100 || avgBlockTime > 15) {
          networkLoad = 'High';
        } else if (gasPriceGwei > 50 || avgBlockTime > 12) {
          networkLoad = 'Medium';
        }

        setNetworkStats({
          avgBlockTime,
          gasPrice: gasPriceGwei.toFixed(2),
          networkLoad
        });
      } catch (error) {
        console.error('Error fetching network stats:', error);
      }
    };

    const interval = setInterval(fetchNetworkStats, 15000); // Update every 15 seconds
    fetchNetworkStats(); // Initial fetch
    return () => clearInterval(interval);
  }, [getContract]);

  // Only show initialization message on first load
  if (!initialized && loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
          <span>Initializing live voting data...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view live voting data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-gray-400">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading only if we have no data yet
  if (loading && !candidates.length) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
          <span>Loading live voting data...</span>
        </div>
      </div>
    );
  }

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number, format?: 'full' | 'compact'): string => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    
    // For "Last Vote" in the stats area - use full format
    if (format === 'full') {
      return date.toLocaleString(undefined, { 
        month: 'numeric', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
    
    // For live feed - use compact format
    return date.toLocaleString(undefined, { 
      month: 'numeric', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Find the leading candidate
  const leadingCandidate = candidates.reduce((prev, current) => 
    (prev.voteCount > current.voteCount) ? prev : current
  , candidates[0]);

  const getVotingSpeedColor = (speed: number) => {
    if (speed >= 10) return 'text-green-400';
    if (speed >= 5) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getNetworkLoadColor = (load: 'Low' | 'Medium' | 'High') => {
    switch (load) {
      case 'Low': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'High': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Add a subtle loading indicator for background updates */}
        {loading && candidates.length > 0 && (
          <div className="fixed top-4 right-4 flex items-center gap-2 px-4 py-2 bg-purple-400/10 rounded-full border border-purple-400/20">
            <div className="w-3 h-3 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-sm text-purple-400">Updating...</span>
          </div>
        )}

        <h1 className="text-4xl font-bold mb-8">
          <span className="gradient-heading">Live Voting Dashboard</span>
        </h1>

        {/* Stats Grid */}
        <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
          <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-400/10 rounded-lg">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Votes Cast</p>
                <h3 className="text-2xl font-bold">{votingStats.totalVotes}</h3>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-400/10 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Participation Rate</p>
                <div>
                  <h3 className="text-2xl font-bold">
                    {votingStats.participationRate.toFixed(1)}%
                  </h3>
                  <p className="text-xs text-gray-400">
                    {votingStats.totalVotes} of {votingStats.verifiedUsers} verified users
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-400/10 rounded-lg">
                <BarChart2 className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Leading Candidate</p>
                <h3 className="text-2xl font-bold">
                  {leadingCandidate?.name || 'No votes yet'}
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-400/10 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Vote</p>
                <h3 className="text-lg font-bold">
                  {votingStats.lastVote 
                    ? formatTimestamp(votingStats.lastVote.timestamp, 'full')
                    : 'No votes yet'}
                </h3>
              </div>
            </div>
          </div>

          {/* New Analytics Cards */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-400/10 rounded-lg">
                <TrendingUp className={`w-6 h-6 ${getVotingSpeedColor(votingSpeed.votesPerMinute)}`} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Voting Speed</p>
                <h3 className="text-2xl font-bold">
                  {votingSpeed.votesPerMinute}/min
                  {votingSpeed.trend === 'up' && <span className="text-green-400 ml-2">↑</span>}
                  {votingSpeed.trend === 'down' && <span className="text-red-400 ml-2">↓</span>}
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-400/10 rounded-lg">
                <Timer className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Avg Block Time</p>
                <h3 className="text-2xl font-bold">
                  {networkStats.avgBlockTime.toFixed(1)}s
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-400/10 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Gas Price</p>
                <h3 className="text-2xl font-bold">
                  {networkStats.gasPrice} Gwei
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-400/10 rounded-lg">
                <Network className={`w-6 h-6 ${getNetworkLoadColor(networkStats.networkLoad)}`} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Network Load</p>
                <h3 className="text-2xl font-bold">
                  {networkStats.networkLoad}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Live Vote Feed */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Live Vote Feed</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                <div className={`w-2 h-2 rounded-full ${votingSpeed.votesPerMinute > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-400">
                  {votingSpeed.votesPerMinute > 0 ? 'Live' : 'Waiting for votes'}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              {!votingStats.recentVotes || votingStats.recentVotes.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No votes recorded yet
                </p>
              ) : (
                votingStats.recentVotes.map((vote, index) => {
                  const candidate = candidates.find(c => c.id === vote.candidateId);
                  return (
                    <div 
                      key={`${vote.voter}-${vote.timestamp}-${index}`}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <User className="text-purple-400 shrink-0 w-4 h-4" />
                          <p className="font-mono text-sm text-purple-400 overflow-hidden text-ellipsis">
                            {formatAddress(vote.voter)}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTimestamp(vote.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 pl-6">
                        voted for {candidate?.name || `Candidate #${vote.candidateId}`}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Results with Block Info */}
          <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl font-semibold mb-6">Real-time Results</h2>
              <div className="space-y-6">
                {candidates.map((candidate) => {
                  const percentage = votingStats.totalVotes > 0
                    ? (candidate.voteCount / votingStats.totalVotes) * 100
                    : 0;

                  return (
                    <div key={candidate.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{candidate.name}</span>
                        <span className="text-purple-400">{candidate.voteCount} votes</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{candidate.party}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Blocks */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl font-semibold mb-6">Recent Blocks</h2>
              <div className="space-y-4">
                {recentBlocks.map((block) => (
                  <div 
                    key={block.number}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-400/10 rounded-lg">
                        <Zap className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-purple-400">
                          #{block.number}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(block.timestamp * 1000).toLocaleString(undefined, { 
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveVoting;