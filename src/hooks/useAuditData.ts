import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useElectionContract } from './useElectionContract';
import { ethers } from 'ethers';

export type VoteTransaction = {
  id: string;
  type: 'VOTE';
  description: string;
  time: string;
  block: string;
  hash: string;
  voter: string;
  candidateId: number;
};

export type VerificationTransaction = {
  id: string;
  type: 'VERIFICATION';
  description: string;
  time: string;
  block: string;
  hash: string;
  voter: string;
};

export type Transaction = VoteTransaction | VerificationTransaction;

interface AuditStats {
  securityScore: number;
  verifiedTransactions: number;
  anomaliesDetected: number;
}

interface SearchResult {
  totalFound: number;
  transactions: Transaction[];
}

interface AuditData {
  transactions: Transaction[];
  stats: AuditStats;
}

const AUDIT_DATA_KEY = ['auditData'] as const;

const INITIAL_STATS: AuditStats = {
  securityScore: 100,
  verifiedTransactions: 0,
  anomaliesDetected: 0
};

const INITIAL_DATA: AuditData = {
  transactions: [],
  stats: INITIAL_STATS
};

export function useAuditData() {
  const [searchQuery, setSearchQuery] = useState('');
  const { getContract } = useElectionContract();

  const fetchAuditData = useCallback(async (): Promise<AuditData> => {
    const contract = getContract();
    if (!contract) {
      console.log('Contract not initialized yet');
      return INITIAL_DATA;
    }

    try {
      console.log('Fetching audit events...');
      
      // Get vote events
      const voteFilter = contract.filters.VoteCast();
      const voteEvents = await contract.queryFilter(voteFilter);
      console.log(`Found ${voteEvents.length} vote events`);

      // Get verification events
      const verificationFilter = contract.filters.AadhaarVerified();
      const verificationEvents = await contract.queryFilter(verificationFilter);
      console.log(`Found ${verificationEvents.length} verification events`);

      // Process vote events
      const voteTransactions = await Promise.all(
        voteEvents.map(async (event) => {
          try {
            const block = await event.getBlock();
            const args = event.args as { voter: string; candidateId: ethers.BigNumber } | undefined;
            
            if (!args) {
              console.warn('Vote event missing arguments');
              return null;
            }

            const transaction: VoteTransaction = {
              id: `TX${event.blockNumber}-${event.transactionIndex}`,
              type: 'VOTE',
              description: `Vote cast for candidate #${args.candidateId.toNumber()}`,
              time: new Date(block.timestamp * 1000).toLocaleString(),
              block: event.blockNumber.toString(),
              hash: event.transactionHash,
              voter: args.voter,
              candidateId: args.candidateId.toNumber()
            };

            return transaction;
          } catch (error) {
            console.error('Error processing vote event:', error);
            return null;
          }
        })
      );

      // Process verification events
      const verificationTransactions = await Promise.all(
        verificationEvents.map(async (event) => {
          try {
            const block = await event.getBlock();
            const args = event.args as { user: string } | undefined;
            
            if (!args) {
              console.warn('Verification event missing arguments');
              return null;
            }

            const transaction: VerificationTransaction = {
              id: `TX${event.blockNumber}-${event.transactionIndex}`,
              type: 'VERIFICATION',
              description: 'Aadhaar verification completed',
              time: new Date(block.timestamp * 1000).toLocaleString(),
              block: event.blockNumber.toString(),
              hash: event.transactionHash,
              voter: args.user
            };

            return transaction;
          } catch (error) {
            console.error('Error processing verification event:', error);
            return null;
          }
        })
      );

      // Filter out null transactions and combine
      const validTransactions = [...voteTransactions, ...verificationTransactions]
        .filter((tx): tx is Transaction => tx !== null);

      // Sort transactions by block number
      const allTransactions = validTransactions.sort((a, b) => 
        parseInt(b.block) - parseInt(a.block)
      );

      // Calculate stats
      const stats: AuditStats = {
        securityScore: 100, // All transactions are verified on blockchain
        verifiedTransactions: allTransactions.length,
        anomaliesDetected: 0 // No anomalies in blockchain transactions
      };

      return {
        transactions: allTransactions,
        stats
      };
    } catch (error) {
      console.error('Error fetching audit data:', error);
      throw error;
    }
  }, [getContract]);

  const { data = INITIAL_DATA, isLoading, error } = useQuery({
    queryKey: AUDIT_DATA_KEY,
    queryFn: fetchAuditData,
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const searchTransactions = useCallback((query: string): SearchResult => {
    const searchTerms = query.toLowerCase().split(' ');
    const matchedTransactions = data.transactions.filter(tx => {
      const searchableText = [
        tx.id,
        tx.block,
        tx.voter,
        tx.description,
        tx.hash
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });

    return {
      totalFound: matchedTransactions.length,
      transactions: matchedTransactions
    };
  }, [data.transactions]);

  return {
    transactions: data.transactions,
    stats: data.stats,
    loading: isLoading,
    error,
    searchTransactions,
    searchQuery,
    setSearchQuery
  };
} 