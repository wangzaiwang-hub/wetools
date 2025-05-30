import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, recoverSession } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// 添加用户偏好设置接口
interface UserPreferences {
  itemsPerPage: number; // 每页显示的卡片数量
}

// 默认偏好设置
export const DEFAULT_PREFERENCES: UserPreferences = {
  itemsPerPage: 6, // 默认每页显示6个
};

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  userPreferences: UserPreferences;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithQQ: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: { nickname?: string; avatar_url?: string }) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  sessionLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 管理员邮箱列表
const ADMIN_EMAILS = ['wangzaiwang@wetools.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    // 获取当前用户并处理会话恢复
    const initializeAuth = async () => {
      setSessionLoading(true);
      try {
        // 尝试恢复会话
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          checkAdminStatus(session.user);
          loadUserPreferences(session.user.id);
        } else {
          // 如果没有会话，尝试恢复
          const recovery = await recoverSession();
          if (recovery.success && recovery.session?.user) {
            setUser(recovery.session.user);
            checkAdminStatus(recovery.session.user);
            loadUserPreferences(recovery.session.user.id);
          } else {
            // 恢复失败，清除状态
            setUser(null);
            setUserPreferences(DEFAULT_PREFERENCES);
            setIsAdmin(false);
            // 不显示错误消息，静默失败
            console.log('未检测到活动会话');
          }
        }
      } catch (error) {
        console.error('初始化认证时出错:', error);
        // 出错时重置为未登录状态
        setUser(null);
        setUserPreferences(DEFAULT_PREFERENCES);
        setIsAdmin(false);
      } finally {
        setSessionLoading(false);
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('认证状态变化:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        checkAdminStatus(session.user);
        loadUserPreferences(session.user.id);
        // 移除登录成功提示，实现静默登录
        // 不再显示 toast.success('登录成功！');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserPreferences(DEFAULT_PREFERENCES);
        setIsAdmin(false);
        toast.success('已安全退出');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('令牌已刷新');
      } else if (event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        toast.success('用户信息已更新');
      } else if (event === 'PASSWORD_RECOVERY') {
        toast.success('密码恢复邮件已发送');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (user: User | null) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      // 检查是否是预设的管理员邮箱
      if (ADMIN_EMAILS.includes(user.email || '')) {
        setIsAdmin(true);
        return;
      }

      // 从 user_profiles 表中获取用户信息
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      // 检查用户元数据中的 is_admin 字段
      const userMetadata = user.user_metadata;
      const isUserAdmin = userMetadata?.is_admin || profile?.is_admin || false;
      
      setIsAdmin(isUserAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // 加载用户偏好设置
  const loadUserPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // 使用 maybeSingle() 代替 single()

      if (error) {
        console.error('加载用户偏好设置出错:', error);
        return;
      }

      if (data) {
        // 合并默认设置与用户设置
        setUserPreferences({
          ...DEFAULT_PREFERENCES,
          ...(data.preferences || {})
        });
      } else {
        // 如果用户没有偏好设置，创建一个默认的
        createDefaultPreferences(userId);
      }
    } catch (error) {
      console.error('加载用户偏好设置时出错:', error);
    }
  };

  // 为新用户创建默认偏好设置
  const createDefaultPreferences = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          preferences: DEFAULT_PREFERENCES
        });

      if (error) {
        console.error('创建用户偏好设置出错:', error);
      }
    } catch (error) {
      console.error('创建用户偏好设置时出错:', error);
    }
  };

  // 更新用户偏好设置
  const updatePreferences = async (preferences: Partial<UserPreferences>) => {
    if (!user) {
      throw new Error('用户未登录');
    }

    // 更新本地状态
    const updatedPreferences = {
      ...userPreferences,
      ...preferences
    };
    setUserPreferences(updatedPreferences);

    try {
      // 更新数据库
      const { error } = await supabase
        .from('user_preferences')
        .update({
          preferences: updatedPreferences
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('更新偏好设置时出错:', error);
      // 回滚本地状态
      setUserPreferences(userPreferences);
      throw error;
    }
  };

  // 添加一个专门清理无效令牌的函数
  const clearInvalidTokens = async () => {
    console.log('执行彻底的令牌清理...');
    
    // 1. 清除所有localStorage中的Supabase相关数据
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('token')) {
        console.log(`清除localStorage项: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // 2. 清除所有sessionStorage数据
    Object.keys(sessionStorage).forEach(key => {
      console.log(`清除sessionStorage项: ${key}`);
      sessionStorage.removeItem(key);
    });
    
    try {
      // 3. 显式调用注销API
      await supabase.auth.signOut({ scope: 'global' });
      console.log('全局注销API调用成功');
    } catch (e) {
      console.error('注销API调用失败:', e);
    }
    
    // 4. 设置空用户状态
    setUser(null);
    setIsAdmin(false);
    setUserPreferences(DEFAULT_PREFERENCES);
    
    console.log('令牌清理完成');
    
    // 等待一段时间确保清理生效
    return new Promise(resolve => setTimeout(resolve, 1500));
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log(`开始登录过程: ${email}`);
      
      // 先检查是否有无效令牌导致的403错误
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError && (sessionError.status === 403 || (sessionError.message && sessionError.message.includes('token')))) {
          console.log('检测到现有会话令牌无效，执行预清理');
          await clearInvalidTokens();
        }
      } catch (sessionCheckError) {
        console.error('检查会话状态时出错:', sessionCheckError);
      }
      
      // 清除任何现有的会话数据和本地存储
      await signOut();
      
      // 增加重试机制
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`登录尝试 ${retryCount + 1}/${maxRetries}`);
          
          // 尝试登录
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) {
            console.error(`尝试 ${retryCount + 1} 登录失败:`, error);
            lastError = error;
            
            // 检查特定错误类型
            if (error.message.includes('Invalid login credentials')) {
              // 登录凭证无效，不再重试
              return { error };
            } else if (error.status === 403 || error.message.includes('403') || error.message.includes('token') || error.message.includes('Invalid token')) {
              // 对于403错误或令牌相关错误，执行更彻底的清理
              console.log('检测到403或令牌错误，执行更彻底的清理');
              await clearInvalidTokens();
              
              // 等待更长时间后重试
              await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
              // 其他错误
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            retryCount++;
          } else {
            // 登录成功
            console.log('登录成功:', data.user?.email);
            return { error: null };
          }
        } catch (retryError) {
          console.error(`登录尝试 ${retryCount + 1} 出错:`, retryError);
          lastError = retryError as Error;
          retryCount++;
          
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 如果尝试了所有重试仍未成功，提供更清晰的错误信息
      if (lastError && (lastError.status === 403 || (lastError.message && (lastError.message.includes('403') || lastError.message.includes('token'))))) {
        console.error('多次尝试后仍出现令牌错误，建议用户清除浏览器缓存或使用无痕模式');
        return { 
          error: {
            ...lastError,
            message: '登录身份验证遇到问题。请清除浏览器缓存后重试，或使用无痕模式登录。',
            status: 403,
            name: 'TokenError'
          } as Error
        };
      }
      
      console.error(`在 ${maxRetries} 次尝试后登录失败`);
      return { error: lastError as Error };
    } catch (error) {
      console.error('登录过程中出错:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      // 先清除本地存储中的会话数据
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      // 然后调用Supabase登出
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('登出过程中出错:', error);
      return { error: error as Error };
    }
  };

  const updateProfile = async (data: { nickname?: string; avatar_url?: string }) => {
    if (!user) throw new Error('No user logged in');

    try {
      // 更新 Supabase Auth 用户元数据
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          nickname: data.nickname,
          avatar_url: data.avatar_url,
        },
      });

      if (authError) throw authError;

      // 更新数据库中的用户配置
      const { error: dbError } = await supabase
        .from('user_profiles')
        .update({
          nickname: data.nickname,
          avatar_url: data.avatar_url,
        })
        .eq('user_id', user.id);

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // 添加魔法链接登录方法
  const sendMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`, // 重定向到专门的回调处理路由
        }
      });
      
      return { error };
    } catch (error) {
      console.error('发送魔法链接过程中出错:', error);
      return { error: error as Error };
    }
  };

  const signInWithQQ = async () => {
    try {
      // 生成随机state防止CSRF攻击
      const state = Math.random().toString(36).substring(2);
      localStorage.setItem('qq_state', state);
      localStorage.setItem('qq_login_from', window.location.pathname);

      // 构建QQ登录URL
      const qqLoginUrl = `https://graph.qq.com/oauth2.0/authorize?` +
        `response_type=code&` +
        `client_id=${import.meta.env.VITE_QQ_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(import.meta.env.VITE_QQ_REDIRECT_URI)}&` +
        `state=${state}&` +
        `scope=get_user_info`;

      // 跳转到QQ登录页面
      window.location.href = qqLoginUrl;
    } catch (error) {
      console.error('QQ登录跳转失败:', error);
      toast.error('QQ登录失败，请重试');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      userPreferences,
      signUp,
      signIn,
      signOut,
      signInWithQQ,
      sendMagicLink,
      updateProfile,
      updatePreferences,
      sessionLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};