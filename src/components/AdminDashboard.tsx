import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Shield, UserPlus, Users, AlertTriangle } from 'lucide-react';
import { useElectionContract } from '../hooks/useElectionContract';

interface Candidate {
  id: number;
  name: string;
  party: string;
  description: string;
  voteCount: number;
}

const AdminDashboard = () => {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    party: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    isAdmin: checkIsAdmin, 
    addCandidate, 
    getCandidates,
    loading: contractLoading 
  } = useElectionContract();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isConnected && address) {
        try {
          const adminStatus = await checkIsAdmin(address);
          setIsAdmin(adminStatus);
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      }
    };

    checkAdminStatus();
  }, [address, isConnected, checkIsAdmin]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCandidate(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await addCandidate(newCandidate.name, newCandidate.party, newCandidate.description);
      
      // Reset form
      setNewCandidate({
        name: '',
        party: '',
        description: ''
      });

      // Reload candidates
      const updatedCandidates = await getCandidates();
      setCandidates(updatedCandidates);
    } catch (err: any) {
      console.error('Error adding candidate:', err);
      setError(err.message || 'Failed to add candidate');
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
          <p className="text-gray-400">Please connect your wallet to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">
            <span className="gradient-heading">Admin Dashboard</span>
          </h1>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
            <Shield className="text-purple-400" />
            <span className="text-sm text-gray-400">Admin</span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Add Candidate Form */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <UserPlus className="text-purple-400" />
              Add New Candidate
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={newCandidate.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-400/50"
                  placeholder="Enter candidate name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Party Name
                </label>
                <input
                  type="text"
                  name="party"
                  value={newCandidate.party}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-400/50"
                  placeholder="Enter party name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={newCandidate.description}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-400/50 min-h-[100px]"
                  placeholder="Enter candidate description"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || contractLoading}
                className={`
                  w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg
                  hover:opacity-90 transition-all flex items-center justify-center gap-2
                  ${(loading || contractLoading) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {loading || contractLoading ? (
                  <>
                    <span>Adding Candidate...</span>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Add Candidate
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Candidates List */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Users className="text-purple-400" />
              Current Candidates
            </h2>

            <div className="space-y-4">
              {candidates.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No candidates added yet.
                </p>
              ) : (
                candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{candidate.name}</h3>
                      <span className="text-sm text-purple-400">{candidate.party}</span>
                    </div>
                    <p className="text-sm text-gray-400">{candidate.description}</p>
                    <div className="text-sm text-gray-500">
                      Votes: {candidate.voteCount}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 