import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Heart, BarChart3, Vote, Users, Lock, Plus, Check, X, AlertCircle } from 'lucide-react';
import { useCommunity, type Discussion, type Comment, type Proposal, type Contributor } from '../hooks/useCommunity';
import { PostgrestError } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { formatDate } from '../helpers/date';
import { formatAddress } from '../helpers/address';

interface CreateDiscussionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string, content: string) => void;
  isLoading: boolean;
  error?: string | null;
}

const CreateDiscussionModal: React.FC<CreateDiscussionModalProps> = ({
  open,
  onOpenChange,
  onCreate,
  isLoading,
  error
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      onCreate(title, content);
      setTitle('');
      setContent('');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Discussion</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Discussion Title"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-400"
              required
            />
          </div>
          <div className="mb-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your discussion content..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-400 min-h-[200px]"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span>Creating...</span>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Discussion
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface CreateProposalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string, content: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  open,
  onOpenChange,
  onCreate,
  isLoading,
  error
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      await onCreate(title, content);
      setTitle('');
      setContent('');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">Title</label>
            <Input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Enter proposal title"
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">Description</label>
            <Textarea
              id="content"
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              placeholder="Describe your proposal..."
              rows={5}
              disabled={isLoading}
              required
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim() || !content.trim()}>
              {isLoading ? 'Creating...' : 'Create Proposal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label }) => (
  <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
    <Icon className="w-8 h-8 text-purple-400 mb-4" />
    <div className="text-3xl font-bold mb-2">{value}</div>
    <div className="text-gray-400">{label}</div>
  </div>
);

const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => {
  return (
    <div className="py-3 border-b border-white/10 last:border-0">
      <div className="flex items-center gap-2 mb-1 text-sm">
        <span className="font-medium text-purple-400">
          {comment.author?.username || formatAddress(comment.author_address)}
        </span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-500">{formatDate(comment.created_at)}</span>
      </div>
      <p className="text-gray-300">{comment.content}</p>
    </div>
  );
};

interface DiscussionCardProps {
  discussion: Discussion;
  onReaction: (id: string, reactionType: string) => void;
  isReacting: boolean;
}

const DiscussionCard: React.FC<DiscussionCardProps> = ({ discussion, onReaction, isReacting }) => {
  const { address } = useAuth();
  const walletAddress = address?.toLowerCase() || 'anonymous';
  
  console.log('Rendering DiscussionCard:', discussion);
  
  // State for comments section
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  // Track previous counts to detect changes for animation
  const [prevReactionCount, setPrevReactionCount] = useState(discussion.reactions_count || 0);
  const [prevCommentCount, setPrevCommentCount] = useState(discussion.comments_count || 0);
  const [pulseReactions, setPulseReactions] = useState(false);
  const [pulseComments, setPulseComments] = useState(false);

  const { getComments, addComment } = useCommunity();
  
  // Update the isLiked state to use account-specific localStorage key
  const [isLiked, setIsLiked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`liked_${walletAddress}_${discussion.id}`) === 'true';
    }
    return false;
  });
  
  // Initialize local count based on the real count
  const [localCount, setLocalCount] = useState<number>(discussion.reactions_count || 0);
  
  // Update useEffect for when the wallet changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStoredLiked = localStorage.getItem(`liked_${walletAddress}_${discussion.id}`) === 'true';
      setIsLiked(isStoredLiked);
      
      // Update the displayed count based on the liked state
      if (isStoredLiked && localCount === discussion.reactions_count) {
        // Keep the current count
        setLocalCount(prevCount => prevCount);
      } else if (!isStoredLiked && localCount !== discussion.reactions_count) {
        // Reset to the actual count if not liked
        setLocalCount(discussion.reactions_count || 0);
      }
    }
  }, [walletAddress, discussion.id, discussion.reactions_count, localCount]);

  // Update local count when props change, but only if the user hasn't liked yet
  useEffect(() => {
    if (!isLiked && discussion.reactions_count !== undefined) {
      setLocalCount(discussion.reactions_count);
    }
    
    // Check if counts have increased to trigger animations
    if (discussion.reactions_count !== undefined && discussion.reactions_count > prevReactionCount) {
      setPulseReactions(true);
      setTimeout(() => setPulseReactions(false), 1000);
    }
    
    if (discussion.comments_count !== undefined && discussion.comments_count > prevCommentCount) {
      setPulseComments(true);
      setTimeout(() => setPulseComments(false), 1000);
    }
    
    // Update previous counts
    setPrevReactionCount(discussion.reactions_count || 0);
    setPrevCommentCount(discussion.comments_count || 0);
  }, [discussion.reactions_count, discussion.comments_count, isLiked, prevReactionCount, prevCommentCount]);

  // Load comments when comments section is opened
  useEffect(() => {
    if (showComments && discussion.id) {
      loadComments();
    }
  }, [showComments, discussion.id]);

  // Refresh comments when the count changes (another user added a comment)
  useEffect(() => {
    if (showComments && comments.length !== (discussion.comments_count || 0)) {
      loadComments();
    }
  }, [discussion.comments_count, showComments]);

  const loadComments = async () => {
    if (!discussion.id) return;
    
    try {
      setIsLoadingComments(true);
      const fetchedComments = await getComments(discussion.id);
      setComments(fetchedComments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !discussion.id) return;
    
    try {
      setIsAddingComment(true);
      await addComment({ discussionId: discussion.id, content: commentText });
      setCommentText(''); // Clear input
      // Refresh comments
      await loadComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsAddingComment(false);
    }
  };

  // Handle the like button click
  const handleReaction = () => {
    if (!address) {
      console.log('Wallet not connected');
      return;
    }
    
    console.log('Handling reaction for discussion:', discussion.id);
    console.log('Current isLiked state:', isLiked);
    
    // Toggle liked state
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    
    // Update local count immediately for better UI feedback
    setLocalCount(prevCount => newLikedState ? prevCount + 1 : prevCount - 1);
    
    // Store in localStorage with account-specific key
    if (typeof window !== 'undefined') {
      localStorage.setItem(`liked_${walletAddress}_${discussion.id}`, newLikedState.toString());
      console.log(`Updated localStorage for discussion ${discussion.id}:`, newLikedState);
    }
    
    // Call API in background
    try {
      onReaction(discussion.id, 'like');
      console.log('Reaction API call initiated');
    } catch (error) {
      console.error('Error adding reaction:', error);
      // Don't revert UI on error to prevent flickering
    }
  };

  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  const formatUserAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatMessageDate = (date: string): string => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-purple-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg text-white">
      <h3 className="text-xl font-semibold mb-2 text-white">{discussion.title}</h3>
      <p className="text-gray-100 mb-4">{discussion.content}</p>
      <div className="flex items-center justify-between text-sm text-gray-200">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={handleReaction}
            disabled={!isLiked}
            className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-purple-400' : 'hover:text-purple-400'}`}
            whileTap={!isLiked ? { scale: 0.95 } : undefined}
          >
            <motion.div
              animate={isLiked || pulseReactions ? {
                scale: [1, 1.2, 1],
                transition: { duration: 0.3 }
              } : {}}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.span
                key={localCount}
                initial={{ opacity: 0, y: -10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  color: pulseReactions ? '#a855f7' : undefined, // Purple highlight on change
                  transition: { 
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                    color: { duration: 0.5 }
                  }
                }}
                exit={{ opacity: 0, y: 10 }}
              >
                {localCount}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <button 
            onClick={handleToggleComments}
            className={`flex items-center gap-2 transition-colors hover:text-purple-400 ${showComments ? 'text-purple-400' : ''}`}
          >
            <motion.div
              animate={pulseComments ? {
                scale: [1, 1.2, 1],
                transition: { duration: 0.3 }
              } : {}}
            >
              <MessageSquare className={`w-5 h-5 ${showComments ? 'fill-current' : ''}`} />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.span
                key={discussion.comments_count}
                initial={{ opacity: 0, y: -10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  color: pulseComments ? '#a855f7' : undefined, // Purple highlight on change
                  transition: { 
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                    color: { duration: 0.5 }
                  }
                }}
                exit={{ opacity: 0, y: 10 }}
              >
                {discussion.comments_count || 0}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span>by {discussion.author?.username || formatUserAddress(discussion.author_address)}</span>
          <span>•</span>
          <span>{formatMessageDate(discussion.created_at)}</span>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-lg font-medium mb-4">Comments</h4>
              
              {/* Comments List */}
              <div className="mb-4">
                {isLoadingComments ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
                ) : (
                  <div className="space-y-1">
                    {comments.map(comment => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-grow bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-gray-400"
                  disabled={isAddingComment}
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || isAddingComment}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingComment ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ProposalCardProps {
  proposal: Proposal;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg text-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-1 text-white">{proposal.title}</h3>
          <p className="text-sm text-gray-200 mb-2">
            By {formatAddress(proposal.author_address)} • {formatDate(proposal.created_at)}
          </p>
        </div>
        <span className={cn("text-xs px-2 py-1 rounded-full font-medium", getStatusColor(proposal.status))}>
          {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
        </span>
      </div>
      <p className="text-gray-100 mb-4 whitespace-pre-wrap">{proposal.content}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Vote size={16} />
            <span>Vote</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <BarChart3 size={16} />
            <span>Results</span>
          </Button>
        </div>
        {proposal.tx_hash && (
          <a 
            href={`https://sepolia.etherscan.io/tx/${proposal.tx_hash}`} 
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View on Etherscan
          </a>
        )}
      </div>
    </div>
  );
};

const AnonymityBanner: React.FC = () => (
  <div className="mb-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-3">
    <Lock className="text-purple-400 flex-shrink-0" />
    <p className="text-white">
      <span className="font-semibold">You're anonymous here.</span> Share your opinions freely and participate in open discussions without revealing your identity.
    </p>
  </div>
);

const Community: React.FC = () => {
  const { discussions, proposals, stats, createDiscussion, createProposal, addReaction, getComments, addComment, isLoading, error } = useCommunity();
  const { address } = useAuth();
  
  console.log('Community - Discussions data:', discussions);
  console.log('Community - Loading state:', isLoading);
  console.log('Community - Error state:', error);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('discussions');
  
  // Create discussion modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingDiscussion, setIsCreatingDiscussion] = useState(false);
  
  // Create proposal modal state
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  
  // Sort discussions by reactions_count and then by comments_count
  const sortedDiscussions = useMemo(() => {
    if (!discussions) return [];
    return [...discussions].sort((a, b) => {
      // First sort by reactions count (descending)
      if ((b.reactions_count || 0) !== (a.reactions_count || 0)) {
        return (b.reactions_count || 0) - (a.reactions_count || 0);
      }
      // If reactions count is the same, sort by comments count (descending)
      return (b.comments_count || 0) - (a.comments_count || 0);
    });
  }, [discussions]);
  
  // Sort proposals by created_at (newest first)
  const sortedProposals = useMemo(() => {
    if (!proposals) return [];
    return [...proposals].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [proposals]);
  
  const handleCreateDiscussion = async (title: string, content: string) => {
    if (!address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }
    
    setIsCreatingDiscussion(true);
    setErrorMessage(null);
    
    try {
      await createDiscussion({ title, content });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating discussion:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create discussion');
    } finally {
      setIsCreatingDiscussion(false);
    }
  };
  
  const handleCreateProposal = async (title: string, content: string) => {
    if (!address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }
    
    setIsCreatingProposal(true);
    setErrorMessage(null);
    
    try {
      await createProposal({ title, content });
      setIsProposalModalOpen(false);
    } catch (err) {
      console.error('Error creating proposal:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setIsCreatingProposal(false);
    }
  };
  
  const handleReaction = async (discussionId: string, reactionType: string) => {
    try {
      if (!address) {
        console.log("Wallet not connected for reaction");
        return;
      }
      
      console.log(`Adding ${reactionType} reaction to discussion ${discussionId}`);
      
      await addReaction({ 
        discussionId, 
        reactionType 
      });
      
      console.log('Reaction added successfully');
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const handleOpenModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) setErrorMessage(null);
  };
  
  const handleOpenProposalModalChange = (open: boolean) => {
    setIsProposalModalOpen(open);
    if (!open) setErrorMessage(null);
  };

  if (!address) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to access the community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">
          <span className="gradient-heading">Community Hub</span>
        </h1>
        <div className="flex gap-4">
          <Tabs defaultValue="discussions" className="mt-8" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="discussions" className="flex items-center gap-1">
                  <MessageSquare size={16} />
                  <span>Discussions</span>
                </TabsTrigger>
                <TabsTrigger value="proposals" className="flex items-center gap-1">
                  <Vote size={16} />
                  <span>Proposals</span>
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'discussions' ? (
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  disabled={!address}
                  className="flex items-center gap-1"
                >
                  <Plus size={16} />
                  <span>New Discussion</span>
                </Button>
              ) : (
                <Button 
                  onClick={() => setIsProposalModalOpen(true)}
                  disabled={!address}
                  className="flex items-center gap-1"
                >
                  <Plus size={16} />
                  <span>New Proposal</span>
                </Button>
              )}
            </div>
          </Tabs>
        </div>
      </div>

      <AnonymityBanner />

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard
          icon={MessageSquare}
          value={stats?.discussionsCount || 0}
          label="Discussions"
        />
        <StatCard
          icon={Users}
          value={stats?.membersCount || 0}
          label="Members"
        />
        <StatCard
          icon={Heart}
          value={stats?.contributorsCount || 0}
          label="Contributors"
        />
        <StatCard
          icon={Vote}
          value={stats?.proposalsCount || 0}
          label="Proposals"
        />
      </div>

      {/* Tabs */}
      <TabsContent value="discussions" className="mt-4 z-10 relative">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-300">Loading discussions...</p>
          </div>
        ) : discussions && discussions.length > 0 ? (
          <div className="grid gap-6">
            {sortedDiscussions.map((discussion, index) => (
              <motion.div
                key={discussion.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 opacity-100"
              >
                <DiscussionCard
                  discussion={discussion}
                  isReacting={false}
                  onReaction={handleReaction}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-purple-900/40 backdrop-blur-lg rounded-lg border border-white/20 shadow-lg">
            <MessageSquare size={40} className="text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No discussions yet</h3>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">Be the first to start a discussion in this community!</p>
            <Button 
              onClick={() => setIsModalOpen(true)} 
              disabled={!address}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 text-white font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start Discussion
            </Button>
          </div>
        )}
      </TabsContent>
      
      {/* Proposals Tab Content */}
      <TabsContent value="proposals" className="mt-4">
        {isLoading && !proposals.length ? (
          <div className="text-center py-8">
            <div className="animate-spin mb-2 mx-auto w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            <p className="text-gray-300">Loading proposals...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedProposals.length > 0 ? (
              sortedProposals.map((proposal, index) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ProposalCard proposal={proposal} />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16 bg-white/5 rounded-lg border border-white/10">
                <Vote size={32} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-1">No proposals yet</h3>
                <p className="text-gray-400 mb-4">Be the first to create a proposal</p>
                <Button onClick={() => setIsProposalModalOpen(true)} disabled={!address}>
                  Create Proposal
                </Button>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <p className="text-center py-4 text-gray-400">
                Join the conversation and build your reputation in the community.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Top Contributors</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
            </div>
          ) : (!stats || stats.contributorsCount === 0) ? (
            <div className="text-center py-6 px-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 text-gray-400">
              No contributors yet.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Display a placeholder for contributors when we have some but the list is not available */}
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  ?
                </div>
                <div>
                  <div className="font-medium">Anonymous Contributor</div>
                  <div className="text-sm text-purple-400">
                    Join the community to earn reputation
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Discussion Modal */}
      <CreateDiscussionModal
        open={isModalOpen}
        onOpenChange={handleOpenModalChange}
        onCreate={handleCreateDiscussion}
        isLoading={isCreatingDiscussion}
        error={errorMessage}
      />

      {/* Create Proposal Modal */}
      <CreateProposalModal
        open={isProposalModalOpen}
        onOpenChange={handleOpenProposalModalChange}
        onCreate={handleCreateProposal}
        isLoading={isCreatingProposal}
        error={errorMessage}
      />
    </div>
  );
};

export default Community;