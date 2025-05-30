-- Modify verification_codes table to support phone numbers
ALTER TABLE verification_codes
ADD COLUMN IF NOT EXISTS phone text,
ALTER COLUMN email DROP NOT NULL,
ADD CONSTRAINT verification_codes_phone_or_email_check 
  CHECK (
    (phone IS NOT NULL AND email IS NULL) OR 
    (email IS NOT NULL AND phone IS NULL)
  );

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS verification_codes_phone_idx ON verification_codes (phone);

-- Update RLS policies
DROP POLICY IF EXISTS "Allow public access to verification codes" ON verification_codes;

CREATE POLICY "Allow public access to verification codes"
ON verification_codes
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Add phone field to auth.users
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS phone text UNIQUE;