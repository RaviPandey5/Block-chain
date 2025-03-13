import React from 'react';
import { useVotingData } from '../hooks/useVotingData';
import { Activity, Users, BarChart2, Clock, User, Shield } from 'lucide-react';
import { useAccount } from 'wagmi';

const LiveVoting = () => {
  const { isConnected } = useAccount();
  const { candidates, votingStats, loading, error, initialized } = useVotingData(1000); // Update every second

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

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleString();
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
                  {candidates.length > 0
                    ? candidates.reduce((prev, current) => 
                        (prev.voteCount > current.voteCount) ? prev : current
                      ).name
                    : 'No votes yet'
                  }
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
                    ? formatTimestamp(votingStats.lastVote.timestamp)
                    : 'No votes yet'}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Live Vote Feed */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">Live Vote Feed</h2>
            <div className="space-y-4">
              {votingStats.recentVotes.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No votes recorded yet
                </p>
              ) : (
                votingStats.recentVotes.map((vote, index) => {
                  const candidate = candidates.find(c => c.id === vote.candidateId);
                  return (
                    <div 
                      key={`${vote.voter}-${vote.blockNumber}-${index}`}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <User className="text-purple-400" />
                        <div>
                          <p className="font-mono text-sm text-purple-400">
                            {formatAddress(vote.voter)}
                          </p>
                          <p className="text-sm text-gray-400">
                            voted for {candidate?.name || 'Unknown Candidate'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(vote.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Results */}
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
        </div>
      </div>
    </div>
  );
};

export default LiveVoting;