import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, Users, Star, Eye, Clock, Award, ThumbsUp, Send, MessageCircle, X, Plus, PenSquare, Loader2 } from 'lucide-react';
import { useCommunity } from '../hooks/useCommunity';
import { useAuth } from '../hooks/useAuth';
import { formatRelativeDate } from '../helpers/date';
import { formatAddress } from '../helpers/address';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogCloseButton } from "./ui/dialog";
import type { Discussion, Comment, Contributor } from '../hooks/useCommunity';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}

const StatCard = ({ icon: Icon, value, label }: StatCardProps) => (
  <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
    <div className="flex items-center gap-4">
      <div className="shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full p-3">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  </div>
);

const Community = () => {
  const { address, isConnected } = useAuth();
  const { 
    discussions, 
    topContributors, 
    stats, 
    isLoading: loading, 
    getComments, 
    addComment,
    addReaction,
    createDiscussion
  } = useCommunity();
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);

  // Create discussion states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDiscussionTitle, setNewDiscussionTitle] = useState('');
  const [newDiscussionContent, setNewDiscussionContent] = useState('');
  const [isCreatingDiscussion, setIsCreatingDiscussion] = useState(false);

  // Fetch comments when discussion is selected
  useEffect(() => {
    if (selectedDiscussion) {
      setIsLoadingComments(true);
      getComments(selectedDiscussion.id)
        .then(fetchedComments => {
          setComments(fetchedComments);
          setIsLoadingComments(false);
        })
        .catch(error => {
          console.error('Error fetching comments:', error);
          setIsLoadingComments(false);
        });
    }
  }, [selectedDiscussion, getComments]);

  const handleOpenDiscussion = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
  };

  const handleCloseDiscussion = () => {
    setSelectedDiscussion(null);
    setComments([]);
    setNewComment('');
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedDiscussion) return;

    try {
      await addComment({
        discussionId: selectedDiscussion.id,
        content: newComment
      });
      
      // Refresh comments
      const updatedComments = await getComments(selectedDiscussion.id);
      setComments(updatedComments);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleLike = async (discussion: Discussion) => {
    if (!address || isSubmittingReaction) return;
    
    setIsSubmittingReaction(true);
    try {
      await addReaction({
        discussionId: discussion.id,
        reactionType: 'like'
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscussionTitle.trim() || !newDiscussionContent.trim()) return;
    
    setIsCreatingDiscussion(true);
    try {
      await createDiscussion({
        title: newDiscussionTitle,
        content: newDiscussionContent
      });
      
      // Reset form and close dialog on success
      setNewDiscussionTitle('');
      setNewDiscussionContent('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating discussion:', error);
    } finally {
      setIsCreatingDiscussion(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to access the community features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          <span className="gradient-heading" data-text="Community Hub">
            Community Hub
          </span>
        </h1>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            value={stats?.membersCount || 0}
            label="Community Members"
          />
          <StatCard
            icon={MessageSquare}
            value={stats?.discussionsCount || 0}
            label="Active Discussions"
          />
          <StatCard
            icon={Award}
            value={stats?.contributorsCount || 0}
            label="Verified Contributors"
          />
          <StatCard
            icon={Star}
            value={stats?.proposalsCount || 0}
            label="Featured Proposals"
          />
        </div>

        {/* Discussion Forums */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Active Discussions</h2>
              <button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
                </div>
              ) : discussions?.length === 0 ? (
                <div className="text-center py-10 px-6 bg-white/5 rounded-xl border border-white/10">
                  <PenSquare className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-60" />
                  <p className="text-gray-400 mb-4">No discussions yet</p>
                  <button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-2 rounded-lg text-white font-medium transition-all"
                  >
                    Start a Discussion
                  </button>
                </div>
              ) : (
                discussions?.map((discussion) => (
                  <div 
                    key={discussion.id} 
                    className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-white/10"
                    onClick={() => handleOpenDiscussion(discussion)}
                  >
                  <div className="flex items-start gap-4">
                      <div className={`shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full p-2 ${discussion.is_featured ? 'ring-2 ring-yellow-400' : ''}`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 truncate">{discussion.title}</h3>
                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">{discussion.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{discussion.comments_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{discussion.reactions_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{discussion.views || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatRelativeDate(discussion.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">Top Contributors</h2>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
                </div>
              ) : !topContributors || (topContributors as Contributor[]).length === 0 ? (
                <p className="text-center text-gray-400 py-8">No contributors yet</p>
              ) : (
                (topContributors as Contributor[]).map((contributor) => (
                  <div key={contributor.wallet_address} className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                        {contributor.avatar_url ? (
                    <img
                            src={contributor.avatar_url}
                            alt={contributor.username || 'Contributor'}
                      className="w-12 h-12 rounded-full"
                    />
                        ) : (
                          <Users className="w-6 h-6 text-white" />
                        )}
                      </div>
                    <div className="flex-1">
                        <h3 className="font-semibold">
                          {contributor.username || formatAddress(contributor.wallet_address)}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {contributor.discussions_created} discussions · {contributor.comments_made} comments
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                        <span>{contributor.reputation_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Create Discussion Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="w-full max-w-4xl mx-auto overflow-hidden rounded-xl border-0 p-0 shadow-2xl">
            <div className="flex flex-col max-h-[90vh]">
              {/* Header with gradient background */}
              <div className="bg-gradient-to-r from-purple-900 via-violet-800 to-indigo-900 relative">
                <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10"></div>
                <div className="relative p-6 pb-8">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                        <PenSquare className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-medium text-purple-300/80 bg-purple-500/20 px-2.5 py-1 rounded-full">
                        New Thread
                      </span>
                    </div>
                    <button 
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="p-2 text-white/70 hover:text-white transition-colors rounded-full bg-black/20 backdrop-blur-sm"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    Create a New Discussion
                  </h2>
                  <p className="text-purple-200/80 text-sm">
                    Share your thoughts with the community and spark meaningful conversations
                  </p>
                </div>
              </div>

              <div className="flex-1 bg-gradient-to-b from-[#1e0b38] to-[#0f172a] overflow-y-auto custom-scrollbar">
                <form onSubmit={handleCreateDiscussion} className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-purple-200 mb-2">
                        Discussion Title <span className="text-pink-500">*</span>
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={newDiscussionTitle}
                        onChange={(e) => setNewDiscussionTitle(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full bg-black/20 backdrop-blur-sm border border-purple-500/20 rounded-lg px-4 py-3 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white shadow-sm"
                        required
                      />
                      <p className="mt-1 text-xs text-purple-300/50">
                        Make it clear and descriptive for others to understand
                      </p>
                    </div>

                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-purple-200 mb-2">
                        Discussion Content <span className="text-pink-500">*</span>
                      </label>
                      <textarea
                        id="content"
                        value={newDiscussionContent}
                        onChange={(e) => setNewDiscussionContent(e.target.value)}
                        placeholder="Describe your thoughts in detail..."
                        className="w-full bg-black/20 backdrop-blur-sm border border-purple-500/20 rounded-lg px-4 py-3 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white shadow-sm"
                        rows={10}
                        required
                      />
                      <p className="mt-1 text-xs text-purple-300/50">
                        You can share ideas, ask questions, or start a conversation about the election
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingDiscussion || !newDiscussionTitle.trim() || !newDiscussionContent.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                      >
                        {isCreatingDiscussion ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>Publishing...</span>
                          </>
                        ) : (
                          <>
                            <PenSquare className="w-4 h-4" />
                            <span>Publish Discussion</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Discussion Detail Dialog */}
        <Dialog open={!!selectedDiscussion} onOpenChange={() => setSelectedDiscussion(null)}>
          <DialogContent className="w-full max-w-4xl mx-auto h-[80vh] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-blue-900/80 via-indigo-900/70 to-purple-900/80 backdrop-blur-xl shadow-2xl">
            {selectedDiscussion && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="shrink-0 relative bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 border-b border-white/10 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">{selectedDiscussion.title}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedDiscussion(null)}
                      className="p-2 text-white/70 hover:text-white transition-colors rounded-full bg-black/20"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-blue-200/80">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatRelativeDate(selectedDiscussion.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(selectedDiscussion);
                        }}
                        disabled={isSubmittingReaction}
                        className="flex items-center gap-2 hover:text-pink-400 transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${isSubmittingReaction ? 'animate-pulse' : ''}`} />
                        <span>{selectedDiscussion.reactions_count || 0}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>{selectedDiscussion.comments_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>{selectedDiscussion.views || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content and Comments */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Main content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="prose prose-invert prose-lg max-w-none mb-8">
                      <p className="text-lg leading-relaxed text-blue-100/90">{selectedDiscussion.content}</p>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                      <h3 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-400" />
                        Comments ({comments.length})
                      </h3>

                      {isLoadingComments ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="text-center py-8 bg-white/5 rounded-xl">
                          <MessageCircle className="w-12 h-12 text-blue-400/20 mx-auto mb-3" />
                          <p className="text-blue-200/90 font-medium">No comments yet</p>
                          <p className="text-sm text-blue-200/60 mt-1">Be the first to share your thoughts!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {comments.map((comment) => (
                            <div key={comment.id} className="bg-white/5 rounded-lg p-4">
                              <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                                  <Users className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="font-medium text-white">Anonymous User</p>
                                    <span className="text-xs text-blue-200/60">
                                      {formatRelativeDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-blue-100/90">{comment.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comment input - Fixed at bottom */}
                  <div className="shrink-0 border-t border-white/10 bg-gradient-to-r from-blue-900/90 to-indigo-900/90 p-4">
                    <div className="flex gap-2 max-w-full">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && newComment.trim()) {
                            e.preventDefault();
                            handleSubmitComment();
                          }
                        }}
                        className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim()}
                        className="shrink-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg p-2 sm:px-4 sm:py-2 hover:opacity-90 disabled:opacity-50 flex items-center gap-2 min-w-[40px] justify-center"
                        aria-label="Send message"
                      >
                        <Send className="w-5 h-5" />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Community;