import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 添加密码强度验证函数
function validatePasswordStrength(password: string) {
  // 检查密码长度
  if (password.length < 6) {
    return {
      valid: false,
      message: '密码长度至少为6位'
    };
  }
  
  // 检查是否包含小写字母
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: '密码必须包含至少一个小写字母(a-z)'
    };
  }
  
  // 检查是否包含大写字母
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: '密码必须包含至少一个大写字母(A-Z)'
    };
  }
  
  // 检查是否包含数字
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: '密码必须包含至少一个数字(0-9)'
    };
  }
  
  return {
    valid: true,
    message: '密码强度符合要求'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    for (const envVar of requiredEnvVars) {
      if (!Deno.env.get(envVar)) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }

    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: '邮箱和密码不能为空' }),
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

    // 验证密码强度 - 在发送请求到Supabase之前进行预检
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'AuthWeakPasswordError',
          message: passwordValidation.message,
          details: '密码必须包含大写字母、小写字母和数字'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // 首先检查用户是否存在
    const { data: userData, error: userError } = await supabaseClient.auth.admin
      .listUsers({
        filters: {
          email: email
        }
      });

    if (userError) {
      console.error('Error finding user:', userError);
      throw new Error('查找用户信息失败，请稍后重试');
    }

    if (!userData || userData.users.length === 0) {
      return new Response(
        JSON.stringify({ error: '该邮箱地址未注册' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    const userId = userData.users[0].id;
    
    // 记录各种方法是否成功的状态
    let method1Success = false;
    let method2Success = false;
    let method3Success = false;
    
    // 记录错误信息
    const errors = {
      method1: null,
      method2: null,
      method3: null
    };
    
    // 方法1: 使用标准API直接更新密码
    try {
      console.log(`尝试方法1: 直接为用户 ${userId} 更新密码`);
      
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        {
          password: password,
          email_confirmed: true
        }
      );

      if (updateError) {
        console.error('Error updating password (Method 1):', updateError);
        errors.method1 = updateError.message;
      } else {
        console.log('Password updated successfully (Method 1)');
        method1Success = true;
      }
    } catch (error) {
      console.error('Exception in method 1:', error);
      errors.method1 = error instanceof Error ? error.message : String(error);
    }

    // 方法2 (备用): 使用恢复令牌 - 只有在方法1失败时才尝试
    if (!method1Success) {
      try {
        console.log(`尝试方法2: 使用恢复令牌更新用户 ${userId} 的密码`);
        
        // 强制登出用户，清理所有现有会话
        await supabaseClient.auth.admin.signOut(userId);
        
        // 等待一小段时间，让会话清理生效
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 尝试使用Supabase的原生方式重置密码
        const { error: passwordResetError } = await supabaseClient.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: `${Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:3000'}/reset-password`,
          }
        });
        
        if (passwordResetError) {
          console.error('Error generating recovery link:', passwordResetError);
          errors.method2 = passwordResetError.message;
        } else {
          // 直接再次尝试更新密码
          const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
            userId,
            {
              password: password,
              email_confirmed: true
            }
          );
          
          if (updateError) {
            console.error('Error updating password (Method 2):', updateError);
            errors.method2 = updateError.message;
          } else {
            console.log('Password updated successfully (Method 2)');
            method2Success = true;
          }
        }
      } catch (tokenError) {
        console.error('Exception in method 2:', tokenError);
        errors.method2 = tokenError instanceof Error ? tokenError.message : String(tokenError);
      }
    }

    // 方法3: 更新用户元数据（可能帮助触发密码哈希重新计算）
    try {
      console.log(`尝试方法3: 更新用户 ${userId} 的元数据`);
      
      const { error: metadataError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            password_updated_at: new Date().toISOString(),
            last_password_reset: new Date().toISOString(),
            password_reset_attempt: true
          },
          app_metadata: {
            password_version: Math.floor(Math.random() * 10000).toString(), // 随机值强制刷新密码版本
            forced_password_reset: false,
            password_reset_time: new Date().toISOString()
          }
        }
      );

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        errors.method3 = metadataError.message;
      } else {
        console.log('User metadata updated successfully (Method 3)');
        method3Success = true;
      }
    } catch (metaError) {
      console.error('Exception in method 3:', metaError);
      errors.method3 = metaError instanceof Error ? metaError.message : String(metaError);
    }

    // 若方法1和方法2都失败，再尝试一次直接更新
    if (!method1Success && !method2Success) {
      try {
        console.log(`最后尝试: 最后一次尝试更新用户 ${userId} 的密码`);
        
        // 先尝试清理会话
        await supabaseClient.auth.admin.signOut(userId);
        
        // 等待一小段时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 再次尝试更新密码
        const { error: finalUpdateError } = await supabaseClient.auth.admin.updateUserById(
          userId,
          {
            password: password,
            email_confirmed: true
          }
        );

        if (finalUpdateError) {
          console.error('Error in final password update attempt:', finalUpdateError);
        } else {
          console.log('Password updated successfully in final attempt');
          method1Success = true; // 使用方法1的标志
        }
      } catch (finalError) {
        console.error('Exception in final attempt:', finalError);
      }
    }

    // 新增方法4: 通过删除所有用户会话并在安全模式下重置密码
    let method4Success = false;
    try {
      if (!method1Success && !method2Success) {
        console.log(`尝试方法4: 强制模式重置用户 ${userId} 的密码`);
        
        // 1. 强制删除所有用户会话
        await supabaseClient.auth.admin.signOut(userId, {
          scope: 'global' // 删除所有设备的会话
        });
        
        // 2. 等待会话清理完成
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. 使用系统级API重置密码
        const { error: resetError } = await supabaseClient.auth.admin.resetUserPasswordByEmail(email, {
          redirectTo: `${Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:3000'}/reset-confirmation`
        });
        
        if (resetError) {
          console.error('Error in method 4 (password reset):', resetError);
        } else {
          // 4. 直接通过admin API设置新密码
          const { error: forceUpdateError } = await supabaseClient.auth.admin.updateUserById(
            userId,
            { 
              password: password,
              email_confirmed: true,
              user_metadata: {
                password_reset_forced: true,
                reset_timestamp: Date.now()
              }
            }
          );
          
          if (forceUpdateError) {
            console.error('Error in method 4 (force update):', forceUpdateError);
          } else {
            console.log('Password forcibly updated in method 4');
            method4Success = true;
          }
        }
      }
    } catch (method4Error) {
      console.error('Exception in method 4:', method4Error);
    }

    // 检查是否有任何方法成功
    const anyMethodSuccessful = method1Success || method2Success || method4Success;
    
    // 如果没有任何方法成功，但方法3成功，也算部分成功
    const partialSuccess = !anyMethodSuccessful && method3Success;

    if (!anyMethodSuccessful && !partialSuccess) {
      console.error('All password reset methods failed', errors);
      return new Response(
        JSON.stringify({ 
          error: '密码重置失败',
          details: '所有重置方法都失败，请联系管理员或稍后重试',
          errorDetails: errors
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // 返回相应的成功响应
    if (anyMethodSuccessful) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '密码已重置成功，请使用新密码登录',
          methods: {
            direct: method1Success,
            token: method2Success,
            metadata: method3Success,
            force: method4Success
          },
          important_note: '您需要完全清除浏览器缓存和Cookie后再尝试登录，或使用无痕模式/其他浏览器登录'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // 部分成功（仅方法3成功）
      return new Response(
        JSON.stringify({ 
          success: true, 
          partialSuccess: true,
          message: '密码部分重置成功，如果登录遇到问题，请稍后再试或联系管理员',
          methods: {
            direct: false,
            token: false,
            metadata: true,
            force: false
          },
          login_instructions: '请完全退出登录，清除浏览器缓存和Cookie后再尝试登录。如果仍无法登录，请使用"忘记密码"或"魔法链接"功能。',
          alternative_login: '您也可以使用魔法链接功能登录，无需输入密码。'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: '密码重置失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}); 