import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import Dysmsapi20170525, * as $Dysmsapi20170525 from 'https://esm.sh/@alicloud/dysmsapi20170525@2.0.24';
import * as $OpenApi from 'https://esm.sh/@alicloud/openapi-client@0.4.8';
import * as $Util from 'https://esm.sh/@alicloud/tea-util@1.4.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const createClient_ = (accessKeyId: string, accessKeySecret: string): Dysmsapi20170525 => {
  const config = new $OpenApi.Config({
    accessKeyId,
    accessKeySecret,
  });
  config.endpoint = 'dysmsapi.aliyuncs.com';
  return new Dysmsapi20170525(config);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone } = await req.json()

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validate phone number format
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if a code was recently sent
    const { data: existingCode } = await supabaseClient
      .from('verification_codes')
      .select('created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingCode) {
      const timeSinceLastCode = Date.now() - new Date(existingCode.created_at).getTime()
      if (timeSinceLastCode < 60000) { // 1 minute cooldown
        return new Response(
          JSON.stringify({ error: 'Please wait before requesting another code' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429 
          }
        )
      }
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Create Aliyun SMS client
    const client = createClient_(
      Deno.env.get('ALIYUN_ACCESS_KEY_ID')!,
      Deno.env.get('ALIYUN_ACCESS_KEY_SECRET')!
    )

    // Send SMS
    const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName: Deno.env.get('ALIYUN_SMS_SIGN_NAME'),
      templateCode: Deno.env.get('ALIYUN_SMS_TEMPLATE_CODE'),
      templateParam: JSON.stringify({ code: verificationCode }),
    });

    const runtime = new $Util.RuntimeOptions({});
    const result = await client.sendSmsWithOptions(sendSmsRequest, runtime);

    if (result.body.code !== 'OK') {
      throw new Error(`Failed to send SMS: ${result.body.message}`);
    }

    // Store verification code
    const { error: upsertError } = await supabaseClient
      .from('verification_codes')
      .upsert({
        phone,
        code: verificationCode,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })

    if (upsertError) throw upsertError

    return new Response(
      JSON.stringify({ message: 'Verification code sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send verification code',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})