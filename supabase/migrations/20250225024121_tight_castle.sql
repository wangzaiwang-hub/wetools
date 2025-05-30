/*
  # Create admin user

  1. Changes
    - Insert admin user with email admin@wetools.com and specified password
    - Note: Password is hashed using Supabase's built-in password hashing
*/

-- Insert admin user with specified credentials
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'wangzaiwang@wetools.com',
  crypt('admin18749018672', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  'authenticated',
  '',
  '',
  '',
  ''
);