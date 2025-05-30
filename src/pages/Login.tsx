import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PenTool as Tool, Mail, RefreshCw } from 'lucide-react';
import { loadQQConnectScript } from '../lib/qq-connect';
import { QQIcon } from '../components/icons/QQIcon';

// QQ登录按钮组件
const QQLoginButton = () => {
  const navigate = useNavigate();
  
  // 使用正确的回调URI
  const redirectUri = encodeURIComponent('https://wetools.wctw.fun/auth/qq-callback');
  
  const handleQQLogin = () => {
    // 生成随机state防止CSRF攻击
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('qq_state', state);
    localStorage.setItem('qq_login_from', 'login');
    
    // 构建QQ登录URL
    const appid = '102761649'; // 使用QQ互联申请的APP ID
    const loginUrl = 
      `https://graph.qq.com/oauth2.0/authorize?` +
      `response_type=code&` +
      `client_id=${appid}&` +
      `redirect_uri=${redirectUri}&` +
      `state=${state}&` +
      `scope=get_user_info`;
    
    // 显示正在跳转的消息
    toast.loading('正在跳转到QQ登录页面...');
    console.log('QQ登录URL:', loginUrl);
    
    // 跳转到QQ登录页面
    setTimeout(() => {
      window.location.href = loginUrl;
    }, 800);
  };
  
  return (
    <button
      type="button"
      onClick={handleQQLogin}
      className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-blue-200 text-blue-500 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
    >
      <QQIcon className="w-5 h-5" />
      <span>QQ登录</span>
    </button>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [isFromReset, setIsFromReset] = useState(false);
  const [resetLoginAttempts, setResetLoginAttempts] = useState(0);
  const [clearCacheVisible, setClearCacheVisible] = useState(false);
  const { signIn, sendMagicLink, signInWithQQ } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 页面加载时检查是否从缓存清理后跳转回来
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const fromReset = params.get('from') === 'reset';
    const cacheCleared = params.get('cache_cleared') === 'true';
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (fromReset) {
      setIsFromReset(true);
      // 如果是从密码重置页面来的，显示提示
      toast.success('密码已重置，请使用新密码登录', { 
        id: 'password-reset-success', 
        duration: 5000,
        icon: '🔑' 
      });
    }
    
    // 如果是缓存清理后回来的，显示提示
    if (cacheCleared) {
      // 清除URL参数但保留邮箱信息
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('cache_cleared');
      newUrl.searchParams.delete('t');
      if (emailParam) {
        newUrl.searchParams.set('email', emailParam);
      }
      window.history.replaceState({}, '', newUrl.toString());
      
      // 显示提示
      toast.success('缓存已成功清除！请尝试重新登录', {
        id: 'cache-cleared-success',
        duration: 5000,
        icon: '🧹'
      });
      
      // 如果有email，自动聚焦到密码框
      if (emailParam) {
        setTimeout(() => {
          const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
          if (passwordInput) {
            passwordInput.focus();
          }
        }, 500);
      }
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('尝试登录用户:', email);
      const { error } = await signIn(email, password);
      if (error) {
        console.error('登录失败，错误信息:', error);
        
        // 处理令牌错误 - 检查特定的TokenError类型
        if (error.name === 'TokenError' || 
            (error.message && (error.message.includes('403') || error.message.includes('token') || error.message.includes('Invalid token'))) || 
            (error.status === 403)) {
          console.log('检测到403/令牌错误，提供特殊处理选项');
          
          // 自动显示清除缓存按钮
          setClearCacheVisible(true);
          
          toast.error(
            <div>
              <p className="font-bold">登录遇到身份验证问题</p>
              <p>这可能是由于浏览器缓存或会话冲突导致的。</p>
              <p>请尝试以下解决方法:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>使用下方的"清除缓存并重试"按钮</li>
                <li>手动清除浏览器缓存和Cookie</li>
                <li>使用无痕模式/私密浏览</li>
                <li>使用魔法链接登录</li>
              </ul>
            </div>,
            { duration: 10000 }
          );
          
          // 再提供一个更明显的清除缓存提示
          setTimeout(() => {
            toast.success(
              <div className="flex items-center">
                <span className="mr-2">👇</span>
                <span>请点击下方的"清除缓存并重试"按钮</span>
              </div>,
              { duration: 5000, position: 'bottom-center' }
            );
          }, 2000);
          
          setIsLoading(false);
          return;
        }
        
        // 检查是否是从密码重置页面跳转来的
        if (error.message === 'Invalid login credentials' && isFromReset) {
          // 增加尝试次数
          const attempts = resetLoginAttempts + 1;
          setResetLoginAttempts(attempts);
          
          if (attempts === 1) {
            // 首次尝试失败，提供友好提示
            toast.error(
              <div>
                <p>登录失败，新密码可能需要几分钟来生效。</p>
                <p>请稍等片刻再尝试登录，或尝试以下方法：</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>清除浏览器缓存后重试</li>
                  <li>使用无痕模式/私密浏览</li>
                  <li>使用魔法链接登录</li>
                </ul>
              </div>,
              { duration: 8000 }
            );
          } else if (attempts === 2) {
            // 第二次尝试失败，提供更多选项
            toast.error(
              <div>
                <p>密码重置可能尚未完全生效。</p>
                <p>您可以:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>再次尝试重置密码</li>
                  <li>使用魔法链接登录</li>
                  <li>使用下方的"清除缓存并重试"按钮</li>
                  <li>联系管理员: admin@wetools.com</li>
                </ul>
              </div>,
              { duration: 8000 }
            );
            
            // 显示清除缓存按钮
            setClearCacheVisible(true);
          } else {
            // 多次尝试后，提供管理员联系方式
            toast.error(
              <div>
                <p>登录持续失败。</p>
                <p>请联系管理员: admin@wetools.com</p>
                <p>或尝试使用魔法链接登录</p>
              </div>,
              { duration: 6000 }
            );
          }
          
          setIsLoading(false);
          return;
        }
        
        if (error.message === 'Invalid login credentials') {
          toast.error('邮箱或密码错误，请重试');
        } else {
          toast.error('登录失败，请稍后重试');
        }
        setIsLoading(false);
        return;
      }
      // 登录成功，直接跳转
      navigate('/');
    } catch (error: any) {
      console.error('登录过程中发生异常:', error);
      toast.error('登录失败，请稍后重试');
      setIsLoading(false);
    }
  };

  // 处理魔法链接登录
  const handleMagicLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('请输入您的邮箱地址');
      return;
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setIsSendingMagicLink(true);
    
    try {
      const { error } = await sendMagicLink(email);
      
      if (error) {
        console.error('发送魔法链接失败:', error);
        toast.error('发送魔法链接失败，请稍后重试');
        return;
      }
      
      toast.success('魔法链接已发送！请查看您的邮箱', { duration: 5000 });
    } catch (error: any) {
      console.error('发送魔法链接过程中发生异常:', error);
      toast.error('发送魔法链接失败，请稍后重试');
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  // 清除密码重置状态的函数
  const clearResetState = () => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('from');
    window.history.replaceState({}, '', newUrl.toString());
    setIsFromReset(false);
    setResetLoginAttempts(0);
    setClearCacheVisible(false);
  };

  // 清除缓存并重试登录
  const handleClearCacheAndRetry = async () => {
    setIsLoading(true);
    try {
      toast.loading('正在清除缓存...');
      
      // 清除所有本地存储
      console.log('清除所有localStorage...');
      Object.keys(localStorage).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // 清除会话存储
      console.log('清除所有sessionStorage...');
      sessionStorage.clear();
      
      // 清除IndexedDB中的supabase相关数据
      try {
        console.log('尝试清除IndexedDB...');
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name && (db.name.includes('supabase') || db.name.includes('auth'))) {
            console.log(`删除IndexedDB数据库: ${db.name}`);
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      } catch (dbError) {
        console.error('清除IndexedDB时出错:', dbError);
      }
      
      // 清除Cookie (只能清除同源Cookie)
      console.log('尝试清除Cookies...');
      document.cookie.split(';').forEach(c => {
        const cookie = c.trim();
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        if (name.includes('supabase') || name.includes('sb-') || name.includes('auth') || name.includes('token')) {
          console.log(`删除Cookie: ${name}`);
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      // 显示成功提示
      toast.dismiss();
      toast.success('缓存已清除，正在准备重新登录...');
      
      // 等待一段时间以确保清除生效
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 强制重新加载页面
      console.log('强制刷新页面...');
      window.location.href = '/login?cache_cleared=true&t=' + new Date().getTime();
    } catch (error) {
      console.error('清除缓存时出错:', error);
      toast.error('清除缓存失败，请手动清除浏览器缓存');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Tool className="h-12 w-12 text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">登录到 WE Tools</h2>
          <p className="mt-2 text-sm text-gray-600">输入您的账号信息以继续</p>
        </div>
        
        {isFromReset && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  您已重置密码。如果登录遇到问题，密码更新可能需要几分钟时间生效。
                </p>
                <div className="mt-2">
                  <button
                    onClick={clearResetState}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    忽略此信息
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="请输入您的邮箱地址"
              required
              disabled={isLoading || isSendingMagicLink}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="请输入您的密码"
              required
              disabled={isLoading || isSendingMagicLink}
            />
            <div className="flex justify-end mt-1">
              <Link to="/forgot-password" className="text-sm text-blue-500 hover:text-blue-600">
                忘记密码？
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={isLoading || isSendingMagicLink}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
          
          {clearCacheVisible && (
            <button
              type="button"
              onClick={handleClearCacheAndRetry}
              className="w-full mt-2 py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? '正在处理...' : '清除缓存并重试'}
            </button>
          )}
          
          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 flex-grow" />
            <span className="px-2 text-sm text-gray-500">或</span>
            <div className="border-t border-gray-200 flex-grow" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleMagicLink}
              type="button"
              className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-blue-200 text-blue-500 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              disabled={isLoading || isSendingMagicLink}
            >
              <Mail className="h-5 w-5" />
              {isSendingMagicLink ? '发送中...' : '魔法链接'}
            </button>
            
            {/* 使用自定义QQ登录按钮 */}
            <QQLoginButton />
          </div>

          <p className="text-center text-sm text-gray-600">
            还没有账号？
            <Link to="/register" className="text-blue-500 hover:text-blue-600 ml-1">
              立即注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;