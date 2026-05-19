/*
  # Allow anonymous profile creation

  1. Changes
    - Drop the restrictive INSERT policy that requires auth.uid() = created_by
    - Create a new INSERT policy allowing anyone (anon + authenticated) to create profiles
    - This enables the "Register Free" feature without requiring login

  2. Security
    - Anyone can insert profiles (needed for public registration)
    - created_by column remains but is nullable (anonymous users won't have a uid)
    - UPDATE and DELETE policies remain restrictive (only creator can modify)
*/

-- Drop old restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can create profiles" ON profiles;

-- Allow anyone to create profiles (public registration)
CREATE POLICY "Anyone can create profiles"
  ON profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
