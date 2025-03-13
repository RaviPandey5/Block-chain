import React, { useState } from 'react';
import { Search, Shield, FileCheck, AlertTriangle } from 'lucide-react';
import { useAuditData } from '../hooks/useAuditData';
import type { Transaction } from '../hooks/useAuditData';
import { useAccount } from 'wagmi';

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  description: string;
  loading?: boolean;
}

// Simple inline loading spinner component
const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]}`}>
      <svg
        className="w-full h-full text-purple-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

const AuditHub = () => {
  const { isConnected } = useAccount();
  const [searchInput, setSearchInput] = useState('');
  const { stats, transactions, loading, error, searchTransactions, setSearchQuery } = useAuditData();

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view audit data.</p>
        </div>
      </div>
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  if (error) {
    return (
      <div className="min-h-screen p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Error Loading Audit Data</h2>
          <p className="text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  const searchResults = searchInput ? searchTransactions(searchInput) : null;
  const displayedTransactions = searchResults ? searchResults.transactions : transactions;

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          <span className="gradient-heading" data-text="Audit Hub">
            Audit Hub
          </span>
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by Transaction ID, Block Number, or Voter ID"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <button 
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </div>
          {searchResults && (
            <div className="mt-2 text-sm text-gray-400">
              Found {searchResults.totalFound} matching transactions
            </div>
          )}
        </form>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={Shield}
            value={`${stats.securityScore}%`}
            label="Security Score"
            description="All security checks passed"
            loading={loading}
          />
          <StatCard
            icon={FileCheck}
            value={stats.verifiedTransactions}
            label="Verified Transactions"
            description="All votes are blockchain-verified"
            loading={loading}
          />
          <StatCard
            icon={AlertTriangle}
            value={stats.anomaliesDetected}
            label="Anomalies Detected"
            description="No suspicious activities found"
            loading={loading}
          />
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h2 className="text-2xl font-semibold mb-6">
            {searchResults ? 'Search Results' : 'Recent Transactions'}
          </h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {displayedTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  {searchResults ? 'No matching transactions found' : 'No transactions yet'}
                </div>
              ) : (
                displayedTransactions.map((transaction: Transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileCheck className={transaction.type === 'VOTE' ? 'text-green-400' : 'text-blue-400'} />
                        <span className="font-semibold">Transaction #{transaction.id}</span>
                      </div>
                      <span className="text-sm text-gray-400">{transaction.time}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{transaction.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-purple-400">Block: {transaction.block}</span>
                      <span className="text-blue-400">Hash: {transaction.hash.slice(0, 10)}...{transaction.hash.slice(-4)}</span>
                      {transaction.voter && (
                        <span className="text-green-400">Voter: {transaction.voter.slice(0, 6)}...{transaction.voter.slice(-4)}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label, description, loading }) => (
  <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
    <Icon className="w-8 h-8 text-purple-400 mb-4" />
    {loading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-white/10 rounded mb-2" />
        <div className="h-4 bg-white/10 rounded w-3/4 mb-1" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
      </div>
    ) : (
      <>
        <div className="text-3xl font-bold mb-2">{value}</div>
        <div className="text-gray-400 mb-1">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </>
    )}
  </div>
);

export default AuditHub;