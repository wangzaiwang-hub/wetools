import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SMTP_USERNAME', 'SMTP_PASSWORD']
    for (const envVar of requiredEnvVars) {
      if (!Deno.env.get(envVar)) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }

    // Get email from request body
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
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
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingCode) {
      const timeSinceLastCode = Date.now() - new Date(existingCode.created_at).getTime()
      if (timeSinceLastCode < 60000) { // 1 minute cooldown
        return new Response(
          JSON.stringify({ error: '请等待60秒后再次发送验证码' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429 
          }
        )
      }
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Store verification code
    const { error: upsertError } = await supabaseClient
      .from('verification_codes')
      .upsert({
        email,
        code: verificationCode,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes expiry
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      throw new Error('验证码存储失败，请稍后重试')
    }

    // Configure SMTP client
    const client = new SmtpClient()

    try {
      await client.connectTLS({
        hostname: "smtp.gmail.com",
        port: 465,
        username: Deno.env.get('SMTP_USERNAME')!,
        password: Deno.env.get('SMTP_PASSWORD')!,
      })

      await client.send({
        from: Deno.env.get('SMTP_USERNAME')!,
        to: email,
        subject: 'WE Tools - 验证码',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">WE Tools 验证码</h2>
            <p>您好！</p>
            <p>您的验证码是：</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${verificationCode}</span>
            </div>
            <p>此验证码将在 5 分钟内有效。</p>
            <p>如果这不是您本人的操作，请忽略此邮件。</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">WE Tools 团队</p>
          </div>
        `,
        html: true,
      })

      await client.close()
    } catch (emailError) {
      console.error('SMTP Error:', emailError)
      throw new Error('邮件发送失败，请检查邮箱地址是否正确')
    }

    return new Response(
      JSON.stringify({ message: '验证码已发送到您的邮箱' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : '发送验证码失败，请稍后重试'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})