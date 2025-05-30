import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.qq.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME") || "3381466262@qq.com";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || "hsomvngcghcbchid";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, type = 'registration' } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: '邮箱地址不能为空' }),
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
        JSON.stringify({ error: '邮箱格式不正确' }),
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

    // Store verification code
    const { error: upsertError } = await supabaseClient
      .from('verification_codes')
      .upsert({
        email,
        code: verificationCode,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })

    if (upsertError) throw upsertError

    // Configure SMTP client with QQ Mail settings from environment variables
    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        auth: {
          username: SMTP_USERNAME,
          password: SMTP_PASSWORD,
        },
      },
    });

    try {
      // 根据类型选择不同的邮件主题和内容
      let subject = 'WE Tools - 验证码';
      let html = '';
      
      if (type === 'reset_password') {
        subject = 'WE Tools - 重置密码验证码';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">WE Tools 重置密码</h2>
            <p>您好！</p>
            <p>您正在尝试重置密码，您的验证码是：</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${verificationCode}</span>
            </div>
            <p>此验证码将在 5 分钟内有效。</p>
            <p>如果这不是您本人的操作，请忽略此邮件，并考虑修改您的密码。</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">WE Tools 团队</p>
          </div>
        `;
      } else {
        // 默认注册验证码邮件
        html = `
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
        `;
      }
      
      // 发送邮件
      await client.send({
        from: SMTP_USERNAME,
        to: email,
        subject: subject,
        html: html,
      });

      return new Response(
        JSON.stringify({ 
          message: '验证码已发送',
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } catch (error) {
      console.error('SMTP Error:', error);
      return new Response(
        JSON.stringify({ 
          error: '发送验证码失败',
          details: error.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

  } catch (error) {
    console.error('Request Error:', error);
    return new Response(
      JSON.stringify({ 
        error: '请求处理失败',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});