import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Prefer': 'return=minimal'
  }
});

// Test connection and log status
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase connection status:', {
    event,
    authenticated: !!session,
    userId: session?.user?.id
  });
});

// Enable realtime subscriptions for specific tables
const channel = supabase.channel('schema-db-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'community_users' },
    (payload) => {
      try {
        console.log('User change received:', payload);
      } catch (error) {
        console.error('Error handling user change:', error);
      }
    }
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'discussions' },
    (payload) => {
      try {
        console.log('Discussion change received:', payload);
      } catch (error) {
        console.error('Error handling discussion change:', error);
      }
    }
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'discussion_comments' },
    (payload) => {
      try {
        console.log('Comment change received:', payload);
      } catch (error) {
        console.error('Error handling comment change:', error);
      }
    }
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'discussion_reactions' },
    (payload) => {
      try {
        console.log('Reaction change received:', payload);
      } catch (error) {
        console.error('Error handling reaction change:', error);
      }
    }
  );

// Handle subscription errors
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('Successfully subscribed to realtime changes');
  } else if (status === 'CLOSED') {
    console.error('Realtime subscription closed');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('Error in realtime subscription');
  }
});

export const getSupabaseUrl = () => supabaseUrl;
export const getSupabaseClient = () => supabase; 