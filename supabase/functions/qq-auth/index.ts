import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// 从环境变量中获取QQ App信息，这些需要在Supabase后台配置
const QQ_APP_ID = Deno.env.get("QQ_APP_ID")!;
const QQ_APP_KEY = Deno.env.get("QQ_APP_KEY")!;
const REDIRECT_URI = Deno.env.get("QQ_REDIRECT_URI")!;

serve(async (req) => {
  // 处理浏览器的CORS预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Check for required environment variables (Secrets)
    const QQ_APP_ID = Deno.env.get("QQ_APP_ID");
    const QQ_APP_KEY = Deno.env.get("QQ_APP_KEY");
    const REDIRECT_URI = Deno.env.get("QQ_REDIRECT_URI");

    if (!QQ_APP_ID || !QQ_APP_KEY || !REDIRECT_URI) {
      throw new Error("Supabase Function缺少关键环境变量(Secrets)，请在Supabase后台 -> Edge Functions -> qq-auth -> Settings -> Secrets中配置: QQ_APP_ID, QQ_APP_KEY, QQ_REDIRECT_URI");
    }

    // 2. Get the authorization code from the request body
    const { code } = await req.json();
    if (!code) {
      throw new Error("请求中缺少授权码(code)");
    }

    // 3. Exchange code for access token
    const tokenUrl = `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${QQ_APP_ID}&client_secret=${QQ_APP_KEY}&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenDataText = await tokenRes.text();
    
    const tokenParams = new URLSearchParams(tokenDataText);
    const accessToken = tokenParams.get("access_token");

    if (!accessToken) {
      throw new Error(`从QQ服务器获取access_token失败。QQ的响应: ${tokenDataText}`);
    }

    // 4. Use access token to get openid
    const meUrl = `https://graph.qq.com/oauth2.0/me?access_token=${accessToken}`;
    const meRes = await fetch(meUrl);
    let meDataText = await meRes.text();
    
    if (meDataText.startsWith("callback")) {
      meDataText = meDataText.substring(meDataText.indexOf("{"), meDataText.lastIndexOf("}") + 1);
    }
    const { openid } = JSON.parse(meDataText);

    if (!openid) {
      throw new Error(`从QQ服务器获取openid失败。QQ的响应: ${meDataText}`);
    }

    // 5. Use access token and openid to get user info
    const userUrl = `https://graph.qq.com/user/get_user_info?access_token=${accessToken}&oauth_consumer_key=${QQ_APP_ID}&openid=${openid}`;
    const userRes = await fetch(userUrl);
    const userInfo = await userRes.json();
    
    if (userInfo.ret !== 0) {
      throw new Error(`获取QQ用户信息失败: ${userInfo.msg}`);
    }

    // 6. Return the essential user info to the client
    const result = {
      openId: openid,
      nickname: userInfo.nickname,
      gender: userInfo.gender,
      figureurl_qq_2: userInfo.figureurl_qq_2, // 100x100头像
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("QQ Auth Function Error:", error.message);
    return new Response(JSON.stringify({ error: `QQ认证函数内部错误: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 