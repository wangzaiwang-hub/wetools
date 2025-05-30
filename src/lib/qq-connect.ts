import { supabase } from './supabase';

// 引入类型声明 - 确保项目中有这个文件或对应的类型定义
/// <reference path="../types/qq-connect.d.ts" />

// QQ应用信息 - 从安全的环境变量中获取更为安全，此处为示例
const QQ_APP_ID = '102761649'; 
// const QQ_APP_KEY = 'wlRvDKG2g5E8nGYe'; // APP KEY 通常用于后端
const QQ_REDIRECT_URI = 'https://wetools.wctw.fun/auth/qq-callback';

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
        typeof window.QC.Login === 'function' && 
        window.QC.Login.getMe) { // 检查 getMe 是否存在
      console.log('[QQ Connect] SDK已加载且关键方法(Login, Login.getMe)可用');
      resolve(true);
      return;
    }
    console.log('[QQ Connect] 尝试加载SDK脚本...');
    const existingScript = document.getElementById('qq-connect-sdk');
    if (existingScript) {
      console.log('[QQ Connect] SDK脚本元素已存在，等待其加载...');
      const timeout = setTimeout(() => {
        if (window.QC && 
            typeof window.QC.Login === 'function' && 
            window.QC.Login.getMe) {
          console.log('[QQ Connect] 等待后，SDK已加载且关键方法可用');
          resolve(true);
        } else {
          console.error('[QQ Connect] SDK脚本元素存在但QC对象或关键方法仍未加载/不可用');
          resolve(false); 
        }
      }, 2000); 
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://connect.qq.com/qc_jssdk.js';
    script.async = true;
    script.defer = true; 
    script.id = 'qq-connect-sdk';
    script.setAttribute('data-appid', QQ_APP_ID);
    script.setAttribute('data-redirecturi', QQ_REDIRECT_URI); 
    script.onload = () => {
      console.log('[QQ Connect] SDK脚本加载成功 (onload)');
      if (window.QC && 
          typeof window.QC.Login === 'function' && 
          window.QC.Login.getMe) { 
        console.log('[QQ Connect] onload后，SDK已加载且关键方法可用');
        resolve(true);
      } else {
        console.error('[QQ Connect] SDK onload触发但QC对象或关键方法不可用');
        resolve(false);
      }
    };
    script.onerror = (err) => {
      console.error('[QQ Connect] SDK脚本加载失败:', err);
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
  console.log('[QQ Connect] getQQUserInfo 调用开始');
  
  const QC = window.QC;

  if (!QC || typeof QC.api !== 'function') { 
    console.error('[QQ Connect] getQQUserInfo失败: QC对象或QC.api非函数');
    throw new Error('QQ SDK未正确加载 (QC.api模块缺失或非函数)');
  }
  
  // 到此处，QC 和 QC.api 应该都是有效的
  return new Promise<QQUserInfo>((resolve, reject) => {
    // 使用非空断言操作符 (!) 告诉 TypeScript QC.api 在这里肯定不是 undefined
    QC.api!('get_user_info', {}, 'GET') 
      .success((res: QQUserInfo, RecordemosFormat: any) => {
        console.log('[QQ Connect] get_user_info API 成功回调:', res);
        if (res.ret === 0) {
          if (!res.openId && QC.Login && typeof QC.Login.userInfo === 'object' && QC.Login.userInfo && QC.Login.userInfo.openId) {
             console.warn('[QQ Connect] get_user_info返回数据中缺少openId，尝试从SDK内部获取');
             res.openId = QC.Login.userInfo.openId;
             console.log('[QQ Connect] 从QC.Login.userInfo补充了openId:', res.openId);
          } else if (!res.openId) {
            console.error('[QQ Connect] get_user_info成功但无法获取openId');
          }
          resolve(res as QQUserInfo); 
        } else {
          console.error('[QQ Connect] get_user_info API返回错误:', res);
          reject(new Error(res.msg || `获取用户信息失败 (ret: ${res.ret})`));
        }
      })
      .error((err: any) => {
        console.error('[QQ Connect] get_user_info API错误回调:', err);
        reject(new Error(err.message || '调用QQ用户信息API失败'));
      });
  });
};

/**
 * 使用QQ账号登录或注册到Supabase
 * @param userInfo QQ用户信息，必须包含openId
 */
export const signInWithQQ = async (userInfo: QQUserInfo) => {
  console.log('[QQ Connect] signInWithQQ 调用, userInfo:', userInfo);
  if (!userInfo.openId) {
    console.error('[QQ Connect] signInWithQQ失败: OpenID缺失');
    throw new Error('无法注册或登录：OpenID缺失。');
  }
  const email = `${userInfo.openId}@qq.wetools.auth`; 
  const password = userInfo.openId; 

  console.log(`[QQ Connect] 检查用户是否存在: qq_open_id = ${userInfo.openId}`);
  const { data: existingUser, error:查用户错误 } = await supabase
    .from('user_profiles') 
    .select('user_id, qq_open_id, nickname, avatar_url') 
    .eq('qq_open_id', userInfo.openId)
    .single();

  if (查用户错误 && 查用户错误.code !== 'PGRST116') { 
    console.error('[QQ Connect] 查询现有用户失败:', 查用户错误);
    throw new Error(`数据库查询失败: ${查用户错误.message}`);
  }

  if (existingUser) {
    console.log('[QQ Connect] 用户已存在, 尝试使用密码登录 (Supabase)... Email:', email);
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('[QQ Connect] Supabase signInWithPassword 错误:', signInError);
      throw new Error(`登录失败: ${signInError.message}`);
    }
    console.log('[QQ Connect] 用户登录成功 (Supabase)');
    return { isNewUser: false, session: sessionData.session, user: sessionData.user };
  }

  console.log('[QQ Connect] 用户不存在, 尝试注册新用户 (Supabase)... Email:', email);
  const preferredAvatar = userInfo.figureurl_qq_2 || userInfo.figureurl_qq_1 || userInfo.figureurl_2 || userInfo.figureurl_1 || userInfo.figureurl;
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
    console.error('[QQ Connect] Supabase signUp 错误:', signUpError);
    throw new Error(`注册失败: ${signUpError.message}`);
  }
  if (!signUpData.user) {
    console.error('[QQ Connect] Supabase signUp成功但未返回用户信息');
    throw new Error('注册成功但未能获取用户数据。');
  }
  console.log('[QQ Connect] Supabase auth user创建成功, User ID:', signUpData.user.id);

  console.log('[QQ Connect] 正在创建用户资料 (user_profiles)... User ID:', signUpData.user.id);
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
    console.error('[QQ Connect] 创建用户资料 (user_profiles) 失败:', profileError);
    console.warn('[QQ Connect] 用户资料创建失败，但认证用户已创建。');
  }
  console.log('[QQ Connect] 用户资料 (user_profiles) 创建/更新(逻辑上)成功。');

  return { isNewUser: true, session: signUpData.session, user: signUpData.user };
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
 * QQ退出登录 (从QQ侧退出)
 */
export function qqLogout(): void {
  if (window.QC && window.QC.Login && typeof window.QC.Login.signOut === 'function') {
    window.QC.Login.signOut();
    console.log('[QQ Connect] QC.Login.signOut() 已调用');
  }
}