/*
  # Allow anonymous profile updates and deletes

  1. Changes
    - Drop restrictive UPDATE/DELETE policies that require auth.uid() = created_by
    - Create new policies allowing anyone (anon + authenticated) to update/delete profiles
    - This enables the edit/delete features without requiring login

  2. Security
    - Anyone can update or delete profiles (needed for public edit/delete without login)
    - In a production app, these would be restricted to the profile owner via auth
*/

DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profiles" ON profiles;

CREATE POLICY "Anyone can update profiles"
  ON profiles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete profiles"
  ON profiles FOR DELETE
  TO anon, authenticated
  USING (true);
