import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import sharp from 'npm:sharp';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { v4 as uuidv4 } from 'https://deno.land/std@0.168.0/uuid/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const buffer = await file.arrayBuffer();
    
    // 使用 sharp 转换为 WebP
    const webpBuffer = await sharp(Buffer.from(buffer))
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = `${uuidv4()}.webp`;

    // 上传到 Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('images') // 假设你的 bucket 叫 'images'
      .upload(fileName, webpBuffer, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // 获取公开 URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 