import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, useNetwork } from 'wagmi';
import { type WalletClient } from 'wagmi';
import { providers, ethers, Contract } from 'ethers';

interface Candidate {
  id: number;
  name: string;
  party: string;
  description: string;
  voteCount: number;
}

const CONTRACT_ABI = [
  "function addCandidate(string name, string party, string description) external",
  "function vote(uint256 candidateId) external",
  "function getCandidates() external view returns (tuple(uint256 id, string name, string party, string description, uint256 voteCount)[])",
  "function hasVoted(address voter) external view returns (bool)",
  "function isAdmin(address user) external view returns (bool)",
  "function owner() external view returns (address)",
  "function verifyAadhaar(bytes32 _encryptedAadhaar) external",
  "function isVerified(address user) external view returns (bool)",
  "function getVerificationDetails(address user) external view returns (tuple(bool isVerified, bytes32 encryptedAadhaar, uint256 timestamp))",
  "function usedAadhaar(bytes32) external view returns (bool)",
  // Events
  "event VoteCast(address indexed voter, uint256 indexed candidateId)",
  "event AadhaarVerified(address indexed user)"
];

export function useElectionContract() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { chain } = useNetwork();
  const [loading, setLoading] = useState(false);

  // Convert wallet client to ethers signer
  const getEthersSigner = useCallback((walletClient: WalletClient) => {
    if (!walletClient || !chain) return null;
    
    const { account, transport } = walletClient;
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    };
    const provider = new providers.Web3Provider(transport, network);
    return provider.getSigner(account.address);
  }, [chain]);

  // Create contract instance
  const getContract = useCallback((): Contract | null => {
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY;

    if (!contractAddress || !alchemyKey) {
      console.error('Missing environment variables');
      return null;
    }

    try {
      // Create provider using StaticJsonRpcProvider
      const provider = new providers.StaticJsonRpcProvider(
        `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
      );

      // Create a read-only contract instance
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

      // If we have a wallet client, return a contract instance with the signer
      if (walletClient && chain) {
        const signer = getEthersSigner(walletClient);
        if (signer) {
          return contract.connect(signer);
        }
      }

      // Return read-only contract instance
      return contract;
    } catch (error) {
      console.error('Error creating contract instance:', error);
      return null;
    }
  }, [walletClient, chain, getEthersSigner]);

  const addCandidate = async (name: string, party: string, description: string) => {
    setLoading(true);
    try {
      const contract = getContract();
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await contract.addCandidate(name, party, description);
      await tx.wait(2);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (candidateId: number) => {
    setLoading(true);
    try {
      const contract = getContract();
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await contract.vote(candidateId);
      await tx.wait(2);
    } finally {
      setLoading(false);
    }
  };

  const getCandidates = async (): Promise<Candidate[]> => {
    const contract = getContract();
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('Fetching candidates...');
      const candidates = await contract.getCandidates();
      console.log('Candidates fetched:', candidates);
      
      return candidates.map((candidate: any) => ({
        id: candidate.id.toNumber(),
        name: candidate.name,
        party: candidate.party,
        description: candidate.description,
        voteCount: candidate.voteCount.toNumber()
      }));
    } catch (err) {
      console.error('Error fetching candidates:', err);
      throw err;
    }
  };

  const hasUserVoted = async (userAddress: string): Promise<boolean> => {
    const contract = getContract();
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    return await contract.hasVoted(userAddress);
  };

  const isAdmin = useCallback(async (userAddress: string): Promise<boolean> => {
    try {
      const contract = getContract();
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      console.log('Checking admin status for address:', userAddress);
      
      // First check if the user is the owner
      const owner = await contract.owner();
      if (owner.toLowerCase() === userAddress.toLowerCase()) {
        console.log('User is contract owner');
        return true;
      }

      // Then check if they're an admin
      const adminStatus = await contract.isAdmin(userAddress);
      console.log('Admin status:', adminStatus);
      return adminStatus;
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  }, [getContract]);

  return {
    addCandidate,
    vote,
    getCandidates,
    hasUserVoted,
    isAdmin,
    loading,
    getContract
  };
} 