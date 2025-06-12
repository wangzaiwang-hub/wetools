//
// 请将这段代码放置在 project/supabase/functions/_shared/cors.ts
//
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}; 