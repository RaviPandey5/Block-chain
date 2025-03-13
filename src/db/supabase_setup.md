# Supabase Authentication Setup

This document outlines how to fix anonymous sign-in issues and set up proper authentication for the voting application.

## Error: Anonymous Sign-ins are Disabled

If you are seeing the error `AuthApiError: Anonymous sign-ins are disabled`, follow these steps to fix it:

### Option 1: Enable Anonymous Sign-ins (Recommended for Development)

1. Go to your Supabase project dashboard (https://app.supabase.com/)
2. Navigate to Authentication → Providers
3. Under "Additional Providers", find "Anonymous"
4. Toggle the switch to enable Anonymous sign-ins
5. Click "Save" to apply the changes

### Option 2: Update Application to Use Email or Social Authentication

If you prefer not to use anonymous sign-ins for security reasons, you'll need to:

1. Implement a proper authentication flow using:
   - Email & Password
   - Magic Link
   - Social providers (Google, GitHub, etc.)

2. Update the `useCommunity` hook to use these authentication methods instead of anonymous sign-ins

## Row-Level Security (RLS) Policies

Ensure your Supabase database has the proper Row-Level Security policies:

1. Go to your Supabase project dashboard
2. Navigate to Table Editor
3. For each table (`community_users`, `discussions`, etc.), click on "Policies"
4. Ensure you have policies for:
   - `SELECT` operations (to allow reading data)
   - `INSERT` operations (to allow creating new records)
   - `UPDATE` operations (to allow updating records, typically only by their owners)

Sample policies are already included in the `community_schema.sql` file.

## Using the Seed Data SQL File

After configuring authentication properly, you can seed your database with demo data:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `src/db/seed_demo_data.sql`
4. Paste into a new SQL query
5. Run the query to populate your database with sample data

## Manual Workaround if Authentication Issues Persist

If you continue to experience authentication issues:

1. Create a user profile manually for testing:
   ```sql
   -- Replace with your actual wallet address
   INSERT INTO community_users (wallet_address, username, reputation_score, is_verified, last_activity, created_at)
   VALUES ('YOUR_WALLET_ADDRESS', 'Your_Username', 10, TRUE, NOW(), NOW())
   ```

2. This will allow the application to find your user profile when your wallet is connected, bypassing the need for Supabase authentication.

## Next Steps

- Consider implementing email verification for added security
- Consider enabling two-factor authentication for administrative accounts
- Add proper session management and token refresh logic 