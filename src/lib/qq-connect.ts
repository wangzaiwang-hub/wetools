import { supabase } from './supabase';
import toast from 'react-hot-toast';

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
// 这个接口现在只用于signInWithQQ函数
export interface QQUserInfo {
  ret: number;
  msg: string;
  nickname: string;
  figureurl_qq_2: string; // 我们只关心100x100的头像
  gender: string;
  openId: string;
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
 * 使用从Edge Function获取的QQ信息登录或注册到Supabase
 * @param userInfo QQ用户信息，必须包含openId
 */
export const signInWithQQ = async (userInfo: QQUserInfo) => {
  console.log('[QQ Connect] signInWithQQ - 使用后端获取的信息进行登录/注册, openId:', userInfo.openId);
  if (!userInfo.openId) {
    throw new Error('无法注册或登录：OpenID缺失。');
  }
  const email = `${userInfo.openId}@qq.wetools.auth`; 
  // 使用更健壮的密码，以满足可能的密码策略
  const password = `qq_${userInfo.openId}_secret`; 

  // 检查用户是否已存在 - 改为调用RPC函数
  const { data: userExists, error: rpcError } = await supabase.rpc(
    'user_exists_by_qq_openid',
    { p_qq_open_id: userInfo.openId }
  );

  if (rpcError) {
    console.error('[QQ Connect] 调用RPC函数检查用户失败:', rpcError);
    throw new Error(`数据库RPC调用失败: ${rpcError.message}`);
  }

  // 如果用户已存在，直接登录
  if (userExists) {
    console.log('[QQ Connect] 用户已存在，尝试登录...');
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('[QQ Connect] Supabase signInWithPassword 错误:', signInError);
      throw new Error(`登录失败: ${signInError.message}`);
    }
    console.log('[QQ Connect] 用户登录成功。');
    return { isNewUser: false, session: sessionData.session, user: sessionData.user };
  }

  // 如果用户不存在，注册新用户
  console.log('[QQ Connect] 用户不存在，尝试注册新用户...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        nickname: userInfo.nickname,
        avatar_url: userInfo.figureurl_qq_2,
        qq_open_id: userInfo.openId, 
        full_name: userInfo.nickname, // 使用昵称作为全名
        provider: 'qq'
      }
    }
  });

  if (signUpError) {
    console.error('[QQ Connect] Supabase signUp 错误:', JSON.stringify(signUpError, null, 2));
    // 如果错误是用户已存在（可能由于竞争条件），尝试再次登录
    if (signUpError.message.includes('User already registered')) {
        console.warn('[QQ Connect] 注册失败，因为用户已存在（可能为竞争条件），将重试登录...');
        const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw new Error(`重试登录失败: ${signInError.message}`);
        }
        return { isNewUser: false, session: sessionData.session, user: sessionData.user };
    }
    // 直接抛出从Supabase收到的原始错误对象，以便UI层显示详细信息
    throw signUpError;
  }
  if (!signUpData.user) {
    throw new Error('注册成功但未能获取用户数据。');
  }
  console.log('[QQ Connect] Supabase auth user创建成功, User ID:', signUpData.user.id);

  // 在user_profiles表中创建对应的资料
  try {
    console.log('[QQ Connect] 正在创建用户资料 (user_profiles)...');
    const { error: profileError } = await supabase
      .from('user_profiles') 
      .insert({
        user_id: signUpData.user.id, 
        nickname: userInfo.nickname,
        avatar_url: userInfo.figureurl_qq_2,
        qq_open_id: userInfo.openId,
        full_name: userInfo.nickname 
      });

    if (profileError) {
      // 即使这里失败，认证用户也已经创建了，所以只记录警告
      console.error('[QQ Connect] 创建用户资料 (user_profiles) 失败:', profileError);
      toast.error('登录成功，但同步部分用户资料失败，您可以在个人中心手动修改。');
    } else {
      console.log('[QQ Connect] 用户资料创建成功。');
    }
  } catch(profileCreationError) {
      console.error('[QQ Connect] 创建用户资料时发生未知异常:', profileCreationError);
      toast.error('登录成功，但同步用户资料时发生异常。');
  }
  
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