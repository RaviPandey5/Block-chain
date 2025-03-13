export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      community_users: {
        Row: {
          wallet_address: string
          username: string | null
          avatar_url: string | null
          reputation_score: number
          last_activity: string
          created_at: string
          is_verified: boolean
        }
        Insert: {
          wallet_address: string
          username?: string | null
          avatar_url?: string | null
          reputation_score?: number
          last_activity?: string
          created_at?: string
          is_verified?: boolean
        }
        Update: {
          wallet_address?: string
          username?: string | null
          avatar_url?: string | null
          reputation_score?: number
          last_activity?: string
          created_at?: string
          is_verified?: boolean
        }
      }
      discussions: {
        Row: {
          id: string
          title: string
          content: string
          author_address: string
          tx_hash: string | null
          created_at: string
          updated_at: string
          views: number
          is_featured: boolean
          status: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_address: string
          tx_hash?: string | null
          created_at?: string
          updated_at?: string
          views?: number
          is_featured?: boolean
          status?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_address?: string
          tx_hash?: string | null
          created_at?: string
          updated_at?: string
          views?: number
          is_featured?: boolean
          status?: string
        }
      }
      discussion_comments: {
        Row: {
          id: string
          discussion_id: string
          content: string
          author_address: string
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          content: string
          author_address: string
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          content?: string
          author_address?: string
          created_at?: string
        }
      }
      discussion_reactions: {
        Row: {
          id: string
          discussion_id: string
          author_address: string
          reaction_type: string
          tx_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          author_address: string
          reaction_type: string
          tx_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          author_address?: string
          reaction_type?: string
          tx_hash?: string | null
          created_at?: string
        }
      }
      proposals: {
        Row: {
          id: string
          title: string
          content: string
          author_address: string
          status: string
          tx_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_address: string
          status?: string
          tx_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_address?: string
          status?: string
          tx_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reputation_history: {
        Row: {
          id: string
          wallet_address: string
          action_type: string
          points: number
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          action_type: string
          points: number
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          action_type?: string
          points?: number
          reference_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      discussion_stats: {
        Row: {
          id: string
          title: string
          author_address: string
          created_at: string
          views: number
          comment_count: number
          reaction_count: number
        }
      }
      top_contributors: {
        Row: {
          wallet_address: string
          username: string | null
          avatar_url: string | null
          reputation_score: number
          discussions_created: number
          comments_made: number
          reactions_given: number
        }
      }
    }
    Functions: {
      award_reputation_points: {
        Args: {
          p_wallet_address: string
          p_action_type: string
          p_reference_id: string
        }
        Returns: void
      }
      increment_discussion_views: {
        Args: {
          discussion_id: string
        }
        Returns: void
      }
    }
    Enums: {
      ReactionType: 'like' | 'dislike' | 'heart' | 'celebrate'
      ProposalStatus: 'draft' | 'active' | 'completed' | 'cancelled'
      ActionType: 'discussion_created' | 'comment_added' | 'reaction_received' | 'proposal_created'
    }
  }
} 