import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Vote, Shield, AlertCircle, Check } from 'lucide-react';
import { useElectionContract } from '../hooks/useElectionContract';
import { useAadhaarVerification } from '../hooks/useAadhaarVerification';

interface Candidate {
  id: number;
  name: string;
  party: string;
  description: string;
  voteCount: number;
}

const VotingDashboard = () => {
  const { address, isConnected } = useAccount();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [votingSuccess, setVotingSuccess] = useState(false);
  
  const { 
    getCandidates,
    vote,
    hasUserVoted,
    loading: contractLoading 
  } = useElectionContract();

  const { isVerified } = useAadhaarVerification();

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const loadedCandidates = await getCandidates();
        setCandidates(loadedCandidates);
      } catch (err) {
        console.error('Error loading candidates:', err);
        setError('Failed to load candidates');
      }
    };

    if (isConnected) {
      loadCandidates();
    }
  }, [isConnected, getCandidates]);

  useEffect(() => {
    const checkVotingStatus = async () => {
      if (isConnected && address) {
        try {
          const voted = await hasUserVoted(address);
          setHasVoted(voted);
        } catch (err) {
          console.error('Error checking voting status:', err);
        }
      }
    };

    checkVotingStatus();
  }, [address, isConnected, hasUserVoted]);

  const handleVote = async () => {
    if (!selectedCandidate) return;
    
    setLoading(true);
    setError(null);

    try {
      await vote(selectedCandidate);
      setVotingSuccess(true);
      setHasVoted(true);

      // Reload candidates to update vote counts
      const updatedCandidates = await getCandidates();
      setCandidates(updatedCandidates);
    } catch (err: any) {
      console.error('Error voting:', err);
      setError(err.message || 'Failed to submit vote');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to access the voting dashboard.</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Verification Required</h2>
          <p className="text-gray-400">Please verify your Aadhaar before voting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">
            <span className="gradient-heading">Voting Dashboard</span>
          </h1>
          {hasVoted && (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
              <Check className="text-green-400" />
              <span className="text-sm text-green-400">Vote Submitted</span>
            </div>
          )}
        </div>

        {votingSuccess && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <Check className="text-green-400" />
            <span className="text-green-400">Your vote has been successfully recorded!</span>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className={`
                p-6 bg-white/5 border rounded-xl transition-all cursor-pointer
                ${hasVoted 
                  ? 'border-white/10' 
                  : selectedCandidate === candidate.id
                    ? 'border-purple-400/50 bg-purple-400/5'
                    : 'border-white/10 hover:border-white/20'
                }
              `}
              onClick={() => !hasVoted && setSelectedCandidate(candidate.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{candidate.name}</h3>
                  <span className="text-sm text-purple-400">{candidate.party}</span>
                </div>
                {selectedCandidate === candidate.id && !hasVoted && (
                  <div className="p-2 bg-purple-400/10 rounded-full">
                    <Check className="w-5 h-5 text-purple-400" />
                  </div>
                )}
              </div>
              
              <p className="text-gray-400 text-sm mb-4">{candidate.description}</p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Votes Received</span>
                <span className="font-semibold">{candidate.voteCount}</span>
              </div>
            </div>
          ))}
        </div>

        {!hasVoted && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleVote}
              disabled={!selectedCandidate || loading || contractLoading}
              className={`
                px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg
                hover:opacity-90 transition-all flex items-center gap-2
                ${(!selectedCandidate || loading || contractLoading) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {loading || contractLoading ? (
                <>
                  <span>Submitting Vote...</span>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </>
              ) : (
                <>
                  <Vote className="w-5 h-5" />
                  Submit Vote
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingDashboard;