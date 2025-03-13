import React from 'react';
import { Vote, Shield, Users, BarChart2, ChevronRight } from 'lucide-react';
import { useHomeData } from '../hooks/useHomeData';
import { useAccount } from 'wagmi';

interface HeroProps {
  onNavigate: (page: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { stats, loading } = useHomeData();
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold mb-8">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Secure Blockchain
            </span>
            <br />
            <span className="text-white">Voting System</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            A decentralized e-voting system powered by blockchain technology and secured with Aadhaar verification.
          </p>
          {!isConnected && (
            <div className="flex justify-center mb-24">
              <button
                onClick={() => onNavigate('registration')}
                className="relative bg-gradient-to-r from-purple-600/90 to-blue-600/90 hover:from-purple-600 hover:to-blue-600 border-none backdrop-blur-xl text-white rounded-full transition-all duration-500 group hover:shadow-[0_0_2rem_-0.5rem_var(--purple-500)] hover:scale-105 w-80"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse" />
                <div className="relative inline-flex items-center gap-2 px-8 py-4 transition-transform duration-500 group-hover:translate-x-1">
                  <span className="text-lg font-semibold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent">
                    Start Secure Voting
                  </span>
                  <span className="relative w-6 h-6 overflow-hidden">
                    <span className="absolute inset-0 transition-transform duration-500 group-hover:translate-x-full">→</span>
                    <span className="absolute inset-0 transition-transform duration-500 -translate-x-full group-hover:translate-x-0">→</span>
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-16">
          <StatCard
            icon={Vote}
            value={stats.totalVotes}
            label="Total Votes Cast"
            loading={loading}
          />
          <StatCard
            icon={Users}
            value={stats.verifiedUsers}
            label="Verified Users"
            loading={loading}
          />
          <StatCard
            icon={BarChart2}
            value={stats.totalCandidates}
            label="Active Candidates"
            loading={loading}
          />
          <StatCard
            icon={Shield}
            value={`${stats.participationRate.toFixed(1)}%`}
            label="Participation Rate"
            loading={loading}
          />
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          <FeatureCard
            title="Secure Voting"
            description="Cast your vote securely with blockchain technology and Aadhaar verification."
            onClick={() => onNavigate('voting')}
          />
          <FeatureCard
            title="Live Results"
            description="Watch real-time voting results and analytics as they happen."
            onClick={() => onNavigate('live')}
          />
          <FeatureCard
            title="Audit Trail"
            description="View complete transaction history and verify the integrity of votes."
            onClick={() => onNavigate('audit')}
          />
        </div>

        {/* Recent Activity */}
        <div className="mt-12 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Recent Activity</h2>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
              <span className="text-gray-400">
                {loading ? 'Updating...' : 'Live'}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Recent Transactions</span>
              <span className="font-semibold">{stats.recentTransactions}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Last Vote</span>
              <span className="font-semibold">
                {stats.lastVote 
                  ? new Date(stats.lastVote.timestamp * 1000).toLocaleString()
                  : 'No votes yet'
                }
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Participation Rate</span>
              <span className="font-semibold">{stats.participationRate.toFixed(1)}%</span>
            </div>
            
            {/* Live Vote Feed */}
            {stats.recentVotes && stats.recentVotes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold mb-3">Live Vote Feed</h3>
                <div className="space-y-2">
                  {stats.recentVotes.map((vote, index) => (
                    <div 
                      key={`${vote.voter}-${vote.timestamp}-${index}`} 
                      className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Vote className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400">
                          {vote.voter.slice(0, 6)}...{vote.voter.slice(-4)}
                        </span>
                      </div>
                      <span className="text-gray-400">
                        {new Date(vote.timestamp * 1000).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label, loading }) => (
  <div className="p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
    <Icon className="w-8 h-8 text-purple-400 mb-4" />
    {loading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-white/10 rounded mb-2" />
        <div className="h-4 bg-white/10 rounded w-3/4" />
      </div>
    ) : (
      <>
        <div className="text-3xl font-bold mb-2">{value}</div>
        <div className="text-gray-400">{label}</div>
      </>
    )}
  </div>
);

interface FeatureCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, onClick }) => (
  <button
    onClick={onClick}
    className="p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 text-left transition-all hover:bg-white/10"
  >
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
    <div className="flex items-center gap-1 text-purple-400 mt-4 text-sm">
      Learn More
      <ChevronRight className="w-4 h-4" />
    </div>
  </button>
);

export default Hero;