import { supabase } from './supabase';

// 引入类型声明 - 确保项目中有这个文件或对应的类型定义
/// <reference path="../types/qq-connect.d.ts" />

// QQ应用信息 - 从环境变量中获取
const QQ_APP_ID = import.meta.env.VITE_QQ_APP_ID || '102761649'; 
// const QQ_APP_KEY = 'wlRvDKG2g5E8nGYe'; // APP KEY 通常用于后端
const QQ_REDIRECT_URI = import.meta.env.VITE_QQ_REDIRECT_URI || 'https://wetools.wctw.fun/auth/qq-callback';

// 添加日志记录器
const logQQConnect = (message: string, data?: any) => {
  console.log(`[QQ Connect] ${message}`, data ? data : '');
};

// QQ用户信息接口
export interface QQUserInfo {
  ret: number;
  msg: string;
  nickname: string;
  figureurl: string; // 30x30
  figureurl_1: string; // 50x50
  figureurl_2: string; // 100x100
  figureurl_qq_1: string; // 40x40 QQ头像
  figureurl_qq_2: string; // 100x100 QQ头像
  gender: string;
  openId: string; // 重要：确保这个字段存在且被正确填充
  qq_number?: string; // 可能不存在
  is_yellow_vip?: string;
  vip?: string;
  level?: string;
  is_yellow_year_vip?: string;
  // ... 可能还有其他字段
}

interface TokenInfo {
  accessToken: string;
  openId: string;
}

/**
 * 加载QQ互联JavaScript SDK
 * @returns Promise<boolean> - SDK加载状态
 */
export const loadQQConnectScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.QC && 
        typeof window.QC.Login === 'function') { // 简化判断条件
      logQQConnect('SDK已加载且关键方法可用');
      resolve(true);
      return;
    }
    
    logQQConnect('尝试加载SDK脚本...');
    const existingScript = document.getElementById('qq-connect-sdk');
    if (existingScript) {
      logQQConnect('SDK脚本元素已存在，等待其加载...');
      
      // 如果脚本已存在但SDK未正确加载，可能需要重新加载
      if (existingScript.getAttribute('data-reload-attempt')) {
        logQQConnect('检测到之前加载失败的脚本，将其移除并重新加载');
        existingScript.remove();
      } else {
        const timeout = setTimeout(() => {
          if (window.QC && typeof window.QC.Login === 'function') {
            logQQConnect('等待后，SDK已加载且关键方法可用');
            resolve(true);
          } else {
            logQQConnect('SDK脚本元素存在但QC对象或关键方法不可用，将重新加载');
            existingScript.remove();
            loadQQConnectScript().then(resolve);
          }
        }, 2000); 
        return;
      }
    }

    const script = document.createElement('script');
    script.src = 'https://connect.qq.com/qc_jssdk.js';
    script.async = true;
    script.defer = true; 
    script.id = 'qq-connect-sdk';
    script.setAttribute('data-appid', QQ_APP_ID);
    script.setAttribute('data-redirecturi', QQ_REDIRECT_URI);
    script.setAttribute('data-reload-attempt', 'true'); // 标记为重新加载的脚本
    
    // 增加请求随机参数，避免缓存问题
    script.src = `${script.src}?_t=${Date.now()}`;
    
    script.onload = () => {
      logQQConnect('SDK脚本加载成功 (onload)');
      
      // 创建一个检查SDK初始化的函数
      const checkSDKInitialized = () => {
        if (window.QC && typeof window.QC.Login === 'function') {
          logQQConnect('SDK初始化成功，关键方法可用');
          resolve(true);
        } else {
          logQQConnect('SDK脚本已加载但QC对象或方法不可用，可能初始化延迟');
          // 等待100ms后再次检查
          setTimeout(checkSDKInitialized, 100);
        }
      };
      
      // 开始检查
      checkSDKInitialized();
    };
    
    script.onerror = (err) => {
      logQQConnect('SDK脚本加载失败:', err);
      resolve(false);
    };
    
    document.head.appendChild(script); 
  });
};

/**
 * 初始化QQ登录按钮 (如果页面上有预置的登录按钮)
 * @param containerId 容器ID
 * @param size 按钮大小
 */
export function initQQLogin(containerId: string, size: 'A_XL' | 'A_L' | 'A_M' | 'A_S' = 'A_M'): void {
  if (window.QC && typeof window.QC.Login === 'function') {
    try {
      window.QC.Login({
        btnId: containerId,
        size: size,
        scope: 'get_user_info,get_simple_userinfo',
        display: 'pc'
      });
      console.log('[QQ Connect] 登录按钮初始化成功:', containerId);
    } catch (error) {
      console.error('[QQ Connect] 登录按钮初始化失败:', error);
    }
  } else {
    console.warn('[QQ Connect] SDK未准备好或QC.Login不是函数，无法初始化登录按钮');
  }
}

/**
 * 获取QQ用户信息 (依赖SDK已通过getMe成功获取token和openid)
 */
export const getQQUserInfo = async (): Promise<QQUserInfo> => {
  logQQConnect('getQQUserInfo 调用开始');
  
  const QC = window.QC;

  if (!QC || typeof QC.api !== 'function') { 
    logQQConnect('getQQUserInfo失败: QC对象或QC.api非函数');
    throw new Error('QQ SDK未正确加载 (QC.api模块缺失或非函数)');
  }
  
  // 设置超时处理
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('获取用户信息超时')), 10000);
  });
  
  // 实际API调用
  const apiCall = new Promise<QQUserInfo>((resolve, reject) => {
    QC.api!('get_user_info', {}, 'GET') 
      .success((res: QQUserInfo, RecordemosFormat: any) => {
        logQQConnect('get_user_info API 成功回调:', res);
        if (res.ret === 0) {
          if (!res.openId && QC.Login && typeof QC.Login.userInfo === 'object' && QC.Login.userInfo && QC.Login.userInfo.openId) {
             logQQConnect('get_user_info返回数据中缺少openId，尝试从SDK内部获取');
             res.openId = QC.Login.userInfo.openId;
             logQQConnect('从QC.Login.userInfo补充了openId:', res.openId);
          } else if (!res.openId) {
            logQQConnect('get_user_info成功但无法获取openId');
          }
          resolve(res as QQUserInfo); 
        } else {
          logQQConnect('get_user_info API返回错误:', res);
          reject(new Error(res.msg || `获取用户信息失败 (ret: ${res.ret})`));
        }
      })
      .error((err: any) => {
        logQQConnect('get_user_info API错误回调:', err);
        reject(new Error(err.message || '调用QQ用户信息API失败'));
      });
  });
  
  // 使用Promise.race在超时和API调用之间竞争
  return Promise.race([apiCall, timeout]);
};

/**
 * 使用QQ账号登录或注册到Supabase
 * @param userInfo QQ用户信息，必须包含openId
 */
export const signInWithQQ = async (userInfo: QQUserInfo) => {
  logQQConnect('signInWithQQ 调用, userInfo:', userInfo);
  if (!userInfo.openId) {
    logQQConnect('signInWithQQ失败: OpenID缺失');
    throw new Error('无法注册或登录：OpenID缺失。');
  }
  const email = `${userInfo.openId}@qq.wetools.auth`; 
  const password = userInfo.openId; 

  logQQConnect(`检查用户是否存在: qq_open_id = ${userInfo.openId}`);
  const { data: existingUser, error:查用户错误 } = await supabase
    .from('user_profiles') 
    .select('user_id, qq_open_id, nickname, avatar_url') 
    .eq('qq_open_id', userInfo.openId)
    .single();

  if (查用户错误 && 查用户错误.code !== 'PGRST116') { 
    logQQConnect('查询现有用户失败:', 查用户错误);
    throw new Error(`数据库查询失败: ${查用户错误.message}`);
  }

  if (existingUser) {
    logQQConnect('用户已存在, 尝试使用密码登录 (Supabase)... Email:', email);
    // 登录重试逻辑
    let retries = 0;
    const maxRetries = 3;
    let lastError = null;
    
    while(retries < maxRetries) {
      try {
        const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          lastError = signInError;
          logQQConnect(`登录失败(尝试${retries+1}/${maxRetries}):`, signInError);
          retries++;
          // 重试前等待一些时间
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        logQQConnect('用户登录成功 (Supabase)');
        return { isNewUser: false, session: sessionData.session, user: sessionData.user };
      } catch (error) {
        lastError = error;
        logQQConnect(`登录异常(尝试${retries+1}/${maxRetries}):`, error);
        retries++;
        // 重试前等待一些时间
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 所有重试都失败
    throw new Error(lastError ? `登录失败: ${(lastError as Error).message}` : '登录失败: 多次尝试后仍未成功');
  }

  logQQConnect('用户不存在, 尝试注册新用户 (Supabase)... Email:', email);
  const preferredAvatar = userInfo.figureurl_qq_2 || userInfo.figureurl_qq_1 || userInfo.figureurl_2 || userInfo.figureurl_1 || userInfo.figureurl;
  
  // 注册重试逻辑
  let retries = 0;
  const maxRetries = 3;
  let lastError = null;
  
  while(retries < maxRetries) {
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            nickname: userInfo.nickname,
            avatar_url: preferredAvatar,
            qq_open_id: userInfo.openId, 
            full_name: userInfo.nickname, 
            provider: 'qq'
          }
        }
      });

      if (signUpError) {
        lastError = signUpError;
        logQQConnect(`注册失败(尝试${retries+1}/${maxRetries}):`, signUpError);
        retries++;
        // 重试前等待一些时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      if (!signUpData.user) {
        lastError = new Error('注册成功但未返回用户信息');
        logQQConnect(`注册成功但未返回用户信息(尝试${retries+1}/${maxRetries})`);
        retries++;
        continue;
      }
      
      logQQConnect('Supabase auth user创建成功, User ID:', signUpData.user.id);

      logQQConnect('正在创建用户资料 (user_profiles)... User ID:', signUpData.user.id);
      const { error: profileError } = await supabase
        .from('user_profiles') 
        .insert({
          user_id: signUpData.user.id, 
          nickname: userInfo.nickname,
          avatar_url: preferredAvatar,
          qq_open_id: userInfo.openId,
          full_name: userInfo.nickname 
        });

      if (profileError) {
        logQQConnect('创建用户资料 (user_profiles) 失败:', profileError);
        logQQConnect('用户资料创建失败，但认证用户已创建。');
      }
      
      logQQConnect('用户资料 (user_profiles) 创建/更新(逻辑上)成功。');
      return { isNewUser: true, session: signUpData.session, user: signUpData.user };
      
    } catch (error) {
      lastError = error;
      logQQConnect(`注册异常(尝试${retries+1}/${maxRetries}):`, error);
      retries++;
      // 重试前等待一些时间
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 所有重试都失败
  throw new Error(lastError ? `注册失败: ${(lastError as Error).message}` : '注册失败: 多次尝试后仍未成功');
};

/**
 * 获取QQ登录状态 (SDK是否认为已登录)
 */
export function getQQLoginState(): boolean {
  if (window.QC && window.QC.Login && typeof window.QC.Login.check === 'function') {
    return window.QC.Login.check();
  }
  return false;
}

/**
 * QQ登出
 */
export function qqLogout(): void {
  if (window.QC && window.QC.Login && typeof window.QC.Login.signOut === 'function') {
    window.QC.Login.signOut();
    logQQConnect('QQ已登出');
  } else {
    logQQConnect('QQ登出失败: SDK未初始化或登出方法不可用');
  }
}