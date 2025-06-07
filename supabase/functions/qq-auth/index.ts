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
    const { code } = await req.json();
    if (!code) {
      throw new Error("请求中缺少授权码(code)");
    }

    // 1. 使用code换取access_token
    const tokenUrl = `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${QQ_APP_ID}&client_secret=${QQ_APP_KEY}&code=${code}&redirect_uri=${REDIRECT_URI}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenDataText = await tokenRes.text();

    const accessToken = new URLSearchParams(tokenDataText).get("access_token");
    if (!accessToken) {
      throw new Error(`获取access_token失败: ${tokenDataText}`);
    }

    // 2. 使用access_token获取openid
    const meUrl = `https://graph.qq.com/oauth2.0/me?access_token=${accessToken}`;
    const meRes = await fetch(meUrl);
    let meDataText = await meRes.text();
    
    // QQ的返回格式是 callback( {"client_id":"YOUR_APP_ID","openid":"YOUR_OPENID"} ); 需要清理
    if (meDataText.startsWith("callback")) {
      meDataText = meDataText.replace("callback( ", "").replace(" );", "");
    }
    const { openid } = JSON.parse(meDataText);
    if (!openid) {
      throw new Error(`获取openid失败: ${meDataText}`);
    }

    // 3. 使用access_token和openid获取用户信息
    const userUrl = `https://graph.qq.com/user/get_user_info?access_token=${accessToken}&oauth_consumer_key=${QQ_APP_ID}&openid=${openid}`;
    const userRes = await fetch(userUrl);
    const userInfo = await userRes.json();
    
    if (userInfo.ret !== 0) {
      throw new Error(`获取用户信息失败: ${userInfo.msg}`);
    }

    // 4. 返回精简的用户信息给前端
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 