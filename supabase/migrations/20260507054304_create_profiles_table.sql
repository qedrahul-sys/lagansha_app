/*
  # Create profiles table for SoulBind Matrimony

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `gender` (text, not null)
      - `age` (integer, not null)
      - `dob` (date)
      - `height` (text)
      - `marital_status` (text)
      - `mother_tongue` (text)
      - `religion` (text)
      - `caste` (text)
      - `sub_caste` (text)
      - `education` (text)
      - `college` (text)
      - `profession` (text)
      - `company` (text)
      - `income` (text)
      - `work_location` (text)
      - `body_type` (text)
      - `complexion` (text)
      - `diet` (text)
      - `drinking` (text)
      - `smoking` (text)
      - `hobbies` (text)
      - `physical_status` (text)
      - `family_type` (text)
      - `family_status` (text)
      - `father_profession` (text)
      - `mother_profession` (text)
      - `siblings` (text)
      - `native_place` (text)
      - `family_values` (text)
      - `current_city` (text)
      - `state` (text)
      - `country` (text, default 'India')
      - `residency_status` (text)
      - `birth_time` (text)
      - `birth_place` (text)
      - `manglik` (text)
      - `rashi` (text)
      - `gothra` (text)
      - `about` (text)
      - `expectations` (text)
      - `image` (text)
      - `verified` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `profiles` table
    - Anyone can read profiles (public browsing)
    - Only authenticated users can insert profiles
    - Only the profile creator can update/delete their own profiles

  3. Real-time
    - Enable real-time on profiles table for live sync

  4. Indexes
    - Index on religion for filter performance
    - Index on current_city for search performance
    - Index on diet for filter performance
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gender text NOT NULL DEFAULT 'Female',
  age integer NOT NULL DEFAULT 25,
  dob date,
  height text DEFAULT '',
  marital_status text DEFAULT 'Never Married',
  mother_tongue text DEFAULT '',
  religion text DEFAULT '',
  caste text DEFAULT '',
  sub_caste text DEFAULT '',
  education text DEFAULT '',
  college text DEFAULT '',
  profession text DEFAULT '',
  company text DEFAULT '',
  income text DEFAULT '',
  work_location text DEFAULT '',
  body_type text DEFAULT '',
  complexion text DEFAULT '',
  diet text DEFAULT 'Vegetarian',
  drinking text DEFAULT 'No',
  smoking text DEFAULT 'No',
  hobbies text DEFAULT '',
  physical_status text DEFAULT 'Normally Abled',
  family_type text DEFAULT 'Nuclear',
  family_status text DEFAULT 'Middle Class',
  father_profession text DEFAULT '',
  mother_profession text DEFAULT '',
  siblings text DEFAULT '',
  native_place text DEFAULT '',
  family_values text DEFAULT 'Moderate',
  current_city text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT 'India',
  residency_status text DEFAULT 'Citizen',
  birth_time text DEFAULT '',
  birth_place text DEFAULT '',
  manglik text DEFAULT 'No',
  rashi text DEFAULT '',
  gothra text DEFAULT '',
  about text DEFAULT '',
  expectations text DEFAULT '',
  image text DEFAULT '',
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can browse profiles)
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can create profiles
CREATE POLICY "Authenticated users can create profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Only creator can update their own profiles
CREATE POLICY "Users can update own profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Only creator can delete their own profiles
CREATE POLICY "Users can delete own profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Indexes for common filter operations
CREATE INDEX IF NOT EXISTS idx_profiles_religion ON profiles(religion);
CREATE INDEX IF NOT EXISTS idx_profiles_current_city ON profiles(current_city);
CREATE INDEX IF NOT EXISTS idx_profiles_diet ON profiles(diet);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
