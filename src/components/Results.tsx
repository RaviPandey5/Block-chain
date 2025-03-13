import React, { useState } from 'react';
import { useVotingData } from '../hooks/useVotingData';
import { Trophy, Medal, Award, BarChart2, Users, Activity, ArrowUp, ArrowDown, Shield } from 'lucide-react';
import { useAccount } from 'wagmi';

const Results = () => {
  const { isConnected } = useAccount();
  const { candidates, votingStats, loading, error } = useVotingData(5000); // Update every 5 seconds
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed'>('overview');

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view election results.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
          <span>Loading results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
          <p className="text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  // Sort candidates by vote count
  const sortedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
  const winner = sortedCandidates[0];
  const runnerUp = sortedCandidates[1];
  const thirdPlace = sortedCandidates[2];

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">
            <span className="gradient-heading">Election Results</span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedView('overview')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedView === 'overview'
                  ? 'bg-purple-400/20 text-purple-400'
                  : 'hover:bg-white/5'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedView('detailed')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedView === 'detailed'
                  ? 'bg-purple-400/20 text-purple-400'
                  : 'hover:bg-white/5'
              }`}
            >
              Detailed Results
            </button>
          </div>
        </div>

        {selectedView === 'overview' ? (
          <>
            {/* Winners Podium */}
            <div className="grid gap-6 mb-8 md:grid-cols-3">
              {/* Runner Up */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 order-2 md:order-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-silver/10 rounded-lg">
                    <Medal className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Runner Up</p>
                    <h3 className="text-xl font-bold">{runnerUp?.name || 'N/A'}</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">{runnerUp?.party}</div>
                  <div className="text-2xl font-bold">{runnerUp?.voteCount || 0} votes</div>
                  <div className="text-sm text-gray-400">
                    {((runnerUp?.voteCount || 0) / votingStats.totalVotes * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>

              {/* Winner */}
              <div className="bg-gradient-to-b from-purple-400/20 to-transparent border border-purple-400/20 rounded-xl p-6 order-1 md:order-2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gold/10 rounded-lg">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-400">Winner</p>
                    <h3 className="text-2xl font-bold">{winner?.name || 'N/A'}</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">{winner?.party}</div>
                  <div className="text-3xl font-bold">{winner?.voteCount || 0} votes</div>
                  <div className="text-sm text-gray-400">
                    {((winner?.voteCount || 0) / votingStats.totalVotes * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>

              {/* Third Place */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 order-3">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-bronze/10 rounded-lg">
                    <Award className="w-6 h-6 text-yellow-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Third Place</p>
                    <h3 className="text-xl font-bold">{thirdPlace?.name || 'N/A'}</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">{thirdPlace?.party}</div>
                  <div className="text-2xl font-bold">{thirdPlace?.voteCount || 0} votes</div>
                  <div className="text-sm text-gray-400">
                    {((thirdPlace?.voteCount || 0) / votingStats.totalVotes * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 mb-8 md:grid-cols-3">
              <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-400/10 rounded-lg">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Votes</p>
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
                    <h3 className="text-2xl font-bold">
                      {votingStats.participationRate.toFixed(2)}%
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-400/10 rounded-lg">
                    <BarChart2 className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Margin of Victory</p>
                    <h3 className="text-2xl font-bold">
                      {((winner?.voteCount || 0) - (runnerUp?.voteCount || 0))} votes
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">Detailed Results</h2>
            <div className="space-y-8">
              {sortedCandidates.map((candidate, index) => {
                const percentage = votingStats.totalVotes > 0
                  ? (candidate.voteCount / votingStats.totalVotes) * 100
                  : 0;

                const previousIndex = index > 0 ? index - 1 : null;
                const voteDifference = previousIndex !== null
                  ? candidate.voteCount - sortedCandidates[previousIndex].voteCount
                  : 0;

                return (
                  <div key={candidate.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{candidate.name}</h3>
                        <p className="text-sm text-gray-400">{candidate.party}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{candidate.voteCount} votes</div>
                        <div className="text-sm text-gray-400">{percentage.toFixed(1)}% of total</div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {index > 0 && (
                        <div className="absolute -right-2 -top-6 text-sm">
                          <span className={voteDifference === 0 ? 'text-gray-400' : voteDifference > 0 ? 'text-green-400' : 'text-red-400'}>
                            {voteDifference === 0 ? (
                              'Tied'
                            ) : voteDifference > 0 ? (
                              <div className="flex items-center gap-1">
                                <ArrowUp size={14} />
                                {voteDifference}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <ArrowDown size={14} />
                                {Math.abs(voteDifference)}
                              </div>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-gray-400">
                      {candidate.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;