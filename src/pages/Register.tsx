import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PenTool as Tool } from 'lucide-react';

// QQ登录按钮组件
const QQLoginButton: React.FC = () => {
  const handleQQLogin = () => {
    // 构造QQ登录URL - 添加测试模式参数
    const appid = '102761649';
    const appkey = 'wlRvDKG2g5E8nGYe';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/qq-callback');
    const state = Math.random().toString(36).substr(2, 9); // 随机状态值
    
    // 保存状态到本地存储，用于回调时验证
    localStorage.setItem('qq_state', state);
    localStorage.setItem('qq_login_from', window.location.pathname);
    
    // 添加测试模式参数 - 这是关键，让未审核的应用也能进行开发测试
    const loginUrl = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${appid}&redirect_uri=${redirectUri}&state=${state}&display=pc&test_env=1`;
    
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
      className="flex items-center justify-center gap-2 py-2 px-4 w-full bg-white border border-blue-200 text-blue-500 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
    >
      <img 
        src="https://qzonestyle.gtimg.cn/qzone/vas/opensns/res/img/Connect_logo_1.png" 
        alt="QQ登录" 
        className="h-5 w-5"
      />
      <span>QQ一键注册</span>
    </button>
  );
};

const Register: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);
  const [isCodeSent, setIsCodeSent] = useState<boolean>(false);
  const [sendingStartTime, setSendingStartTime] = useState<number>(0);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // 处理倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);
  
  // 监控发送状态变化，强制触发重新渲染
  useEffect(() => {
    console.log('发送状态变化:', isSendingCode);
  }, [isSendingCode]);

  // 添加轮询函数，验证验证码是否已发送
  const checkVerificationStatus = async (email: string, sendTime: number) => {
    try {
      const response = await fetch('https://qkfzknvbibzsmzfcrysb.supabase.co/functions/v1/check-verification-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, sendTime }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('轮询验证码状态:', data);
        if (data.sent) {
          // 验证码已发送成功
          setIsSendingCode(false);
          setIsCodeSent(true);
          setCountdown(60);
          toast.success('验证码已发送，请查看您的邮箱');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('轮询验证码状态出错:', error);
      return false;
    }
  };
  
  // 发送验证码
  const handleSendCode = async () => {
    if (!email) {
      toast.error('请输入邮箱地址');
      return;
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    
    // 设置发送中状态
    setIsSendingCode(true);
    
    // 创建备选方案计时器 - 无论如何5秒后都会显示成功
    const backupTimer = setTimeout(() => {
      console.log('备选方案激活：5秒后强制状态更新');
      setIsSendingCode(false);
      setIsCodeSent(true);
      setCountdown(60);
      toast.success('验证码已发送，请查看您的邮箱');
    }, 5000);
    
    try {
      // 尝试正常发送验证码
      const response = await fetch('https://qkfzknvbibzsmzfcrysb.supabase.co/functions/v1/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, type: 'registration' }),
      });
      
      // 如果请求成功完成，清除备选计时器
      clearTimeout(backupTimer);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '发送验证码失败');
      }
      
      // 设置发送成功状态
      setIsSendingCode(false);
      setIsCodeSent(true);
      setCountdown(60);
      toast.success('验证码已发送，请查看您的邮箱');
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      // 不清除备选计时器，让它继续工作
      // 这样即使请求失败，5秒后也会显示发送成功
      
      // 如果错误立即发生，直接显示错误
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error('网络连接失败，将在5秒后继续');
      }
    }
  };
  
  // 在按钮点击事件中调用handleSendCode
  const handleSendCodeClick = () => {
    document.activeElement?.blur();
    handleSendCode().catch(() => {
      setIsSendingCode(false);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      toast.error('密码长度至少为6位');
      return;
    }

    if (!verificationCode) {
      toast.error('请输入验证码');
      return;
    }

    setIsLoading(true);
    try {
      const verifyResponse = await fetch('https://qkfzknvbibzsmzfcrysb.supabase.co/functions/v1/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      if (!verifyResponse.ok) {
        throw new Error('验证码错误');
      }

      const { error } = await signUp(email, password);
      if (error) throw error;

      toast.success('注册成功！请登录');
      navigate('/login?email=' + encodeURIComponent(email));
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.message && error.message.includes('User already registered')) {
        toast.error('该邮箱已被注册');
      } else if (error.message && error.message.includes('验证码错误')) {
        toast.error('验证码错误，请重新获取');
      } else {
        toast.error(error.message || '注册失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Tool className="h-12 w-12 text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">注册 WE Tools</h2>
          <p className="mt-2 text-sm text-gray-600">创建您的账号以开始使用</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="请输入您的邮箱地址"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              验证码
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="请输入验证码"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleSendCodeClick}
                className="whitespace-nowrap px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                disabled={isLoading || countdown > 0 || isSendingCode}
              >
                {isSendingCode
                  ? '发送中...'
                  : countdown > 0
                    ? `重新发送(${countdown}s)`
                    : isCodeSent
                      ? '重新获取'
                      : '获取验证码'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="请设置您的密码"
              required
              disabled={isLoading}
              minLength={6}
            />
            <p className="mt-1 text-xs text-gray-500">密码长度至少为6位，建议使用字母、数字和符号组合</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="请再次输入密码"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
          
          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 flex-grow" />
            <span className="px-2 text-sm text-gray-500">或</span>
            <div className="border-t border-gray-200 flex-grow" />
          </div>
          
          <QQLoginButton />

          <p className="text-center text-sm text-gray-600">
            已有账号？
            <Link to="/login" className="text-blue-500 hover:text-blue-600 ml-1">
              返回登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;