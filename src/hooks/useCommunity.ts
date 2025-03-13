import { useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '../types/supabase';
import { PostgrestError } from '@supabase/supabase-js';

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];

export interface CommunityStats {
  discussionsCount: number
  membersCount: number
  contributorsCount: number
  proposalsCount: number
}

export type Discussion = Tables['discussions']['Row'] & {
  author?: Tables['community_users']['Row']
  reactions_count?: number
  comments_count?: number
}

export type Comment = Tables['discussion_comments']['Row'] & {
  author?: Tables['community_users']['Row']
}

export type Proposal = Tables['proposals']['Row']

export type Reaction = Tables['discussion_reactions']['Row']
export type Contributor = Views['top_contributors']['Row']
export type DiscussionStats = Views['discussion_stats']['Row']

const QUERY_KEYS = {
  discussions: ['discussions'],
  comments: ['comments'],
  reactions: ['reactions'],
  contributors: ['contributors'],
  stats: ['community', 'stats'],
  proposals: ['proposals']
} as const;

export function useCommunity() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  // Ensure user profile exists and is authenticated with Supabase
  const ensureUserProfile = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');

    try {
      // Check if the user exists in the community_users table
      const { data: existingUser, error: checkError } = await supabase
        .from('community_users')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking user:', checkError);
        throw checkError;
      }

      if (!existingUser) {
        console.log('User not found, creating new profile...');
        
        // Create the user profile
        const userData = {
          wallet_address: address.toLowerCase(),
          username: `User_${address.slice(0, 6)}`,
          reputation_score: 0,
          is_verified: true, // Auto-verify for demo
          last_activity: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        const { error: createError } = await supabase
          .from('community_users')
          .insert([userData]);

        if (createError) {
          console.error('Error creating user:', createError);
          
          // Check if this is a permissions error (likely RLS or auth issue)
          if (createError.code === '42501' || createError.message.includes('permission') || createError.message.includes('policy')) {
            throw new Error('You need to connect your wallet to the community. Please ensure your wallet is properly connected.');
          }
          
          throw createError;
        }
        
        console.log('User profile created successfully');
      } else {
        console.log('User found:', existingUser);
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      throw error;
    }
  }, [address]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!address) return;

    // Subscribe to discussion reactions
    const discussionSubscription = supabase
      .channel('discussion-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_reactions'
        },
        (payload) => {
          // Invalidate discussions query to update counts
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.discussions });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
        }
      )
      .subscribe();

    // Subscribe to discussion comments
    const commentsSubscription = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_comments'
        },
        (payload) => {
          // Invalidate comments and discussions queries to update counts
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.discussions });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
        }
      )
      .subscribe();

    return () => {
      discussionSubscription.unsubscribe();
      commentsSubscription.unsubscribe();
    };
  }, [address, queryClient]);

  // Fetch discussions with author details and counts
  const {
    data: discussions = [],
    isLoading: discussionsLoading,
    error: discussionsError
  } = useQuery<Discussion[]>({
    queryKey: QUERY_KEYS.discussions,
    queryFn: async () => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        // First get discussion stats for reaction and comment counts
        const { data: discussionStats, error: statsError } = await supabase
          .from('discussion_stats')
          .select('*');

        if (statsError) {
          console.error("Error fetching discussion stats:", statsError);
          throw statsError;
        }

        // Get all discussions with author details
        const { data: discussionsData, error: discussionsError } = await supabase
          .from('discussions')
          .select(`
            *,
            author:community_users (
              wallet_address,
              username,
              avatar_url,
              reputation_score
            )
          `)
          .order('created_at', { ascending: false });

        if (discussionsError) {
          console.error("Error fetching discussions:", discussionsError);
          throw discussionsError;
        }
        
        if (!discussionsData) return [];

        console.log('Fetched discussions:', discussionsData);
        console.log('Discussion stats:', discussionStats);

        // Map discussions with stats
        return discussionsData.map(discussion => ({
          ...discussion,
          reactions_count: discussionStats?.find(stat => stat.id === discussion.id)?.reaction_count || 0,
          comments_count: discussionStats?.find(stat => stat.id === discussion.id)?.comment_count || 0
        }));
      } catch (error) {
        console.error("Error fetching discussions:", error);
        throw error;
      }
    },
    enabled: !!address,
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  // Fetch top contributors
  const {
    data: topContributors = [],
    isLoading: contributorsLoading,
    error: contributorsError
  } = useQuery<Contributor[]>({
    queryKey: QUERY_KEYS.contributors,
    queryFn: async () => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        const { data, error } = await supabase
          .from('top_contributors')
          .select('*');

        if (error) throw error;
        if (!data) return [];

        return data;
      } catch (error) {
        console.error("Error fetching contributors:", error);
        throw error;
      }
    },
    enabled: !!address
  });

  // Fetch community stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery<CommunityStats>({
    queryKey: QUERY_KEYS.stats,
    queryFn: async () => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        const [
          { count: discussionsCount, error: discussionsError },
          { count: membersCount, error: membersError },
          { count: contributorsCount, error: contributorsError },
          { count: proposalsCount, error: proposalsError }
        ] = await Promise.all([
          supabase.from('discussions').select('*', { count: 'exact', head: true }),
          supabase.from('community_users').select('*', { count: 'exact', head: true }),
          supabase.from('community_users').select('*', { count: 'exact', head: true }).gt('reputation_score', 0),
          supabase.from('proposals').select('*', { count: 'exact', head: true })
        ]);

        if (discussionsError) throw discussionsError;
        if (membersError) throw membersError;
        if (contributorsError) throw contributorsError;
        if (proposalsError) throw proposalsError;

        return {
          discussionsCount: discussionsCount || 0,
          membersCount: membersCount || 0,
          contributorsCount: contributorsCount || 0,
          proposalsCount: proposalsCount || 0
        };
      } catch (error) {
        console.error("Error fetching stats:", error);
        throw error;
      }
    },
    enabled: !!address
  });

  // Fetch proposals
  const {
    data: proposals = [],
    isLoading: proposalsLoading,
    error: proposalsError
  } = useQuery<Proposal[]>({
    queryKey: QUERY_KEYS.proposals,
    queryFn: async () => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data) return [];

        return data as Proposal[];
      } catch (error) {
        console.error("Error fetching proposals:", error);
        throw error;
      }
    },
    enabled: !!address
  });

  // Create discussion mutation
  const createDiscussion = useMutation({
    mutationFn: async ({ title, content, txHash }: { title: string; content: string; txHash?: string }) => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        const discussionData = {
          title,
          content,
          author_address: address.toLowerCase(),
          tx_hash: txHash,
          status: 'active',
          views: 0,
          is_featured: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating discussion with data:', discussionData);

        const { data, error } = await supabase
          .from('discussions')
          .insert([discussionData])
          .select()
          .single();

        if (error) {
          console.error('Error creating discussion:', error);
          throw error;
        }

        if (data && data.id) {
          try {
            // Create reputation entry for creating a discussion
            await supabase.rpc('award_reputation_points', {
              p_wallet_address: address.toLowerCase(),
              p_action_type: 'discussion_created',
              p_reference_id: data.id
            });
          } catch (reputationError) {
            console.error('Error updating reputation:', reputationError);
            // Continue without failing if reputation update fails
          }
        }

        console.log('Discussion created successfully:', data);
        return data;
      } catch (error) {
        console.error("Error in createDiscussion:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.discussions });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    }
  });

  // Add reaction mutation with optimistic updates
  const addReaction = useMutation({
    mutationFn: async ({ discussionId, reactionType, txHash }: { discussionId: string; reactionType: string; txHash?: string }) => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        // First check if the user has already reacted to this discussion
        const { data: existingReactions, error: checkError } = await supabase
          .from('discussion_reactions')
          .select('*')
          .match({ 
            discussion_id: discussionId,
            author_address: address.toLowerCase() 
          });

        if (checkError) {
          console.error('Error checking existing reactions:', checkError);
          throw checkError;
        }

        // If the user has already reacted, return the existing reaction
        if (existingReactions && existingReactions.length > 0) {
          console.log('User already reacted to this discussion, skipping...');
          return existingReactions[0];
        }

        const reactionData = {
          discussion_id: discussionId,
          author_address: address.toLowerCase(),
          reaction_type: reactionType,
          tx_hash: txHash,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('discussion_reactions')
          .insert([reactionData])
          .select()
          .single();

        if (error) {
          // Handle 409 conflicts (already exists) gracefully
          if (error.code === '23505' || error.code === 'P0001' || error.status === 409) {
            console.log('Reaction already exists, skipping...');
            return reactionData;
          }
          
          console.error('Error adding reaction:', error);
          throw error;
        }

        if (data && data.id) {
          try {
            // Create reputation entry for receiving a reaction (for the discussion author)
            const { data: discussionData, error: discussionError } = await supabase
              .from('discussions')
              .select('author_address')
              .eq('id', discussionId)
              .single();

            if (discussionError) {
              console.error('Error fetching discussion:', discussionError);
              return data;
            }
            
            if (discussionData && discussionData.author_address && 
                discussionData.author_address !== address.toLowerCase()) {
              await supabase.rpc('award_reputation_points', {
                p_wallet_address: discussionData.author_address,
                p_action_type: 'reaction_received',
                p_reference_id: data.id
              });
            }
          } catch (reputationError) {
            console.error('Error updating reputation:', reputationError);
          }
        }

        return data;
      } catch (error) {
        console.error("Error in addReaction:", error);
        // Make sure we don't throw an error that would cause the UI to revert
        // Just log it and return something to prevent the UI from reverting
        return null;
      }
    },
    // The onMutate function runs before the mutation function
    onMutate: async ({ discussionId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.discussions });
      
      // Save the previous value
      const previousDiscussions = queryClient.getQueryData<Discussion[]>(QUERY_KEYS.discussions);
      
      // Return context with the previous value
      return { previousDiscussions };
    },
    onError: (error, variables, context) => {
      console.log('Reaction mutation failed, reverting optimistic update');
      // If there was an error, revert back to the previous value
      if (context?.previousDiscussions) {
        queryClient.setQueryData(QUERY_KEYS.discussions, context.previousDiscussions);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to make sure our local data is correct
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.discussions });
    }
  });

  // Seed demo data for testing
  const seedDemoData = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        // Create sample discussions
        const demoDiscussions = [
          {
            title: 'Welcome to the Community Hub',
            content: 'This is a space for discussing all things related to decentralized voting and community governance. Feel free to share your thoughts and ideas!',
          },
          {
            title: 'How can we improve voter participation?',
            content: 'I\'ve been thinking about ways to increase participation in our governance. What incentives could we offer to encourage more people to vote?',
          },
          {
            title: 'Proposal for community treasury',
            content: 'I think we should establish a community treasury to fund development initiatives. This could be funded through a small fee on transactions.',
          }
        ];

        console.log('Creating demo discussions...');
        
        for (const discussion of demoDiscussions) {
          await createDiscussion.mutateAsync({
            title: discussion.title,
            content: discussion.content
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Error in seedDemoData:", error);
        throw error;
      }
    }
  });

  // Fetch comments for a discussion
  const getComments = useCallback(async (discussionId: string): Promise<Comment[]> => {
    if (!address) throw new Error('Wallet not connected');

    try {
      await ensureUserProfile();

      const { data, error } = await supabase
        .from('discussion_comments')
        .select(`
          *,
          author:community_users (
            wallet_address,
            username,
            avatar_url,
            reputation_score
          )
        `)
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) return [];
      
      return data as Comment[];
    } catch (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }
  }, [address, ensureUserProfile]);

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async ({ discussionId, content }: { discussionId: string; content: string }) => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        const commentData = {
          discussion_id: discussionId,
          author_address: address.toLowerCase(),
          content,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('discussion_comments')
          .insert([commentData])
          .select()
          .single();

        if (error) {
          console.error('Error adding comment:', error);
          throw error;
        }

        // Create reputation entry for adding a comment
        if (data && data.id) {
          try {
            await supabase.rpc('award_reputation_points', {
              p_wallet_address: address.toLowerCase(),
              p_action_type: 'comment_added',
              p_reference_id: data.id
            });
          } catch (reputationError) {
            console.error('Error updating reputation:', reputationError);
          }
        }

        return data;
      } catch (error) {
        console.error("Error in addComment:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.discussions });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    }
  });

  // Add createProposal mutation
  const createProposal = useMutation({
    mutationFn: async ({ title, content, txHash }: { title: string; content: string; txHash?: string }) => {
      if (!address) throw new Error('Wallet not connected');

      try {
        await ensureUserProfile();

        const proposalData = {
          title,
          content,
          author_address: address.toLowerCase(),
          tx_hash: txHash,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('proposals')
          .insert([proposalData])
          .select()
          .single();

        if (error) {
          console.error('Error creating proposal:', error);
          throw error;
        }

        if (data && data.id) {
          try {
            // Create reputation entry for creating a proposal
            await supabase.rpc('award_reputation_points', {
              p_wallet_address: address.toLowerCase(),
              p_action_type: 'proposal_created',
              p_reference_id: data.id
            });
          } catch (reputationError) {
            console.error('Error updating reputation:', reputationError);
            // Continue without failing if reputation update fails
          }
        }

        return data;
      } catch (error) {
        console.error("Error in createProposal:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.proposals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    }
  });

  const error = discussionsError || contributorsError || statsError || proposalsError;

  return {
    discussions,
    proposals,
    topContributors,
    stats,
    createDiscussion: createDiscussion.mutateAsync,
    createProposal: createProposal.mutateAsync,
    addReaction: addReaction.mutateAsync,
    seedDemoData: seedDemoData.mutateAsync,
    getComments,
    addComment: addComment.mutateAsync,
    isLoading: discussionsLoading || contributorsLoading || statsLoading || proposalsLoading || 
               createDiscussion.isPending || addReaction.isPending || 
               seedDemoData.isPending || addComment.isPending || createProposal.isPending,
    error: error ? error instanceof Error ? error.message : 'An error occurred' : null
  };
}