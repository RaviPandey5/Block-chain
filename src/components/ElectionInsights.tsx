import React from 'react';
import { useElectionInsights, ElectionInsights as ElectionInsightsType } from '../hooks/useElectionInsights';
import { BarChart2, TrendingUp, Users, Clock, ChevronUp, ChevronDown, Activity, CheckCircle, Zap, Shield } from 'lucide-react';
import { useAccount } from 'wagmi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface Metric {
  title: string;
  value: string;
  change: number;
}

interface DemographicItem {
  ageGroup: string;
  percentage: number;
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

interface ElectionInsights {
  metrics: Metric[];
  votingTrends: VotingTrend[];
  blockchainInsights: BlockchainInsight[];
  recentAnalysis: string[];
  dailyAnalysis: VotingTrend[];
}

const ElectionInsights: React.FC = () => {
  const { isConnected } = useAccount();
  const { data: insights, isLoading, error } = useElectionInsights() as {
    data: ElectionInsightsType | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view election insights.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
          <span>Loading insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
          <p className="text-gray-400">{error instanceof Error ? error.message : 'An error occurred'}</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          <span className="gradient-heading">Election Insights</span>
        </h1>

        {/* Metrics Grid */}
        <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
          {insights.metrics.map((metric, index) => (
            <div key={index} className="p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-400/10 rounded-lg">
                  {index === 0 ? <BarChart2 className="text-purple-400" /> :
                   index === 1 ? <TrendingUp className="text-blue-400" /> :
                   index === 2 ? <Users className="text-green-400" /> :
                   <Clock className="text-yellow-400" />}
                </div>
                <div>
                  <p className="text-sm text-gray-400">{metric.title}</p>
                  <h3 className="text-2xl font-bold">{metric.value}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    {metric.change > 0 ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">{metric.change}%</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">{Math.abs(metric.change)}%</span>
                      </>
                    )}
                    <span className="text-gray-400 ml-1">vs last period</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Voting Trends Chart */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">24-Hour Voting Activity</h2>
            <div className="space-y-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insights.votingTrends}>
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#6b7280"
                      tickFormatter={(value: number) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '0.5rem'
                      }}
                      formatter={(value: number) => [`${value} votes`]}
                      labelFormatter={(label: number) => new Date(label).toLocaleString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="votes" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={true}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* 3-Day Blockchain Analysis */}
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-300">3-Day Blockchain Analysis</h3>
                {insights.dailyAnalysis.map((day, index) => (
                  <div 
                    key={day.timestamp}
                    className="p-4 bg-white/5 border border-white/10 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-400">
                        {new Date(day.timestamp).toLocaleDateString([], {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="text-sm text-gray-400">
                        {day.votes} votes
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{day.analysis}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Replace Demographics with Blockchain Insights */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">Blockchain Analytics</h2>
            <div className="grid gap-4">
              {insights.blockchainInsights.map((insight, index) => (
                <div 
                  key={index}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">{insight.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{insight.value}</span>
                      {insight.trend === 'up' && (
                        <ChevronUp className="w-4 h-4 text-green-400" />
                      )}
                      {insight.trend === 'down' && (
                        <ChevronDown className="w-4 h-4 text-red-400" />
                      )}
                      {insight.trend === 'neutral' && (
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analysis Points */}
        <div className="mt-8 bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-semibold mb-6">AI-Generated Insights</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {insights.recentAnalysis.map((point, index) => (
              <div 
                key={index}
                className="p-4 bg-white/5 border border-white/10 rounded-lg flex items-start gap-3"
              >
                <div className="p-2 bg-purple-400/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-gray-300">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionInsights;