/*
  # Storage policies for profile photos

  1. Storage Policies
    - Anyone can view profile photos (public bucket)
    - Anyone can upload profile photos (needed for anonymous registration)
    - Anyone can update/delete profile photos

  2. Security
    - Bucket is public so images can be displayed without signed URLs
    - Upload is open to allow registration without login
*/

-- Allow anyone to upload profile photos
CREATE POLICY "Anyone can upload profile photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'profile-photos');

-- Allow anyone to view profile photos
CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'profile-photos');

-- Allow anyone to update profile photos
CREATE POLICY "Anyone can update profile photos"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'profile-photos')
  WITH CHECK (bucket_id = 'profile-photos');

-- Allow anyone to delete profile photos
CREATE POLICY "Anyone can delete profile photos"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'profile-photos');
