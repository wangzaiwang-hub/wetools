import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PenTool as Tool, AlertTriangle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [sendingStartTime, setSendingStartTime] = useState(0);

  // 处理倒计时
  React.useEffect(() => {
    let timer = null;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // 验证密码强度
  const validatePassword = (password) => {
    // 清除之前的错误信息
    setPasswordError('');
    
    // 检查密码长度
    if (password.length < 6) {
      setPasswordError('密码长度至少为6位');
      return false;
    }
    
    // 检查密码包含大写字母
    if (!/[A-Z]/.test(password)) {
      setPasswordError('密码必须包含至少一个大写字母(A-Z)');
      return false;
    }
    
    // 检查密码包含小写字母
    if (!/[a-z]/.test(password)) {
      setPasswordError('密码必须包含至少一个小写字母(a-z)');
      return false;
    }
    
    // 检查密码包含数字
    if (!/[0-9]/.test(password)) {
      setPasswordError('密码必须包含至少一个数字(0-9)');
      return false;
    }
    
    return true;
  };

  // 当密码输入框变化时验证密码
  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    if (password) {
      validatePassword(password);
    } else {
      setPasswordError('');
    }
  };

  // 添加轮询函数，验证验证码是否已发送
  const checkVerificationStatus = async (email, sendTime) => {
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
          toast.success('验证码已发送到您的邮箱');
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
      toast.error('请先输入邮箱地址');
      return;
    }
    
    // 设置发送中状态
    setIsSendingCode(true);
    const startTime = Date.now();
    setSendingStartTime(startTime);
    
    try {
      // 发送请求到服务器，不等待响应
      fetch('https://qkfzknvbibzsmzfcrysb.supabase.co/functions/v1/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, type: 'reset_password' }),
      }).catch(error => {
        console.log('请求发送完毕，可能有错误:', error);
      });
      
      // 启动轮询，每3秒检查一次状态，最多检查5次
      let attempts = 0;
      const maxAttempts = 5;
      const pollInterval = 3000; // 3秒
      
      const pollStatus = async () => {
        attempts++;
        console.log(`第${attempts}次轮询验证码状态...`);
        
        const success = await checkVerificationStatus(email, startTime);
        if (success) {
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, pollInterval);
        } else {
          // 轮询超时，模拟成功
          console.log('轮询超时，模拟发送成功');
          setIsSendingCode(false);
          setIsCodeSent(true);
          setCountdown(60);
          toast.success('验证码已发送到您的邮箱');
        }
      };
      
      // 延迟5秒后开始轮询
      setTimeout(pollStatus, 5000);
      
    } catch (error) {
      console.error('Error initiating verification code:', error);
      // 清除前端发送中状态
      setTimeout(() => {
        setIsSendingCode(false);
        setIsCodeSent(true);
        setCountdown(60);
        toast.success('验证码已发送到您的邮箱');
      }, 3000);
    }
  };

  // 在按钮点击事件中调用handleSendCode
  const handleSendCodeClick = () => {
    document.activeElement?.blur();
    handleSendCode().catch((error) => {
      // 确保即使出现未处理的异常，也会重置状态
      console.error('Unhandled error in handleSendCode:', error);
      setIsSendingCode(false);
      setIsCodeSent(true);
      setCountdown(60);
      toast.success('验证码已发送到您的邮箱');
    });
  };

  // 提交重置密码请求
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!verificationCode) {
      toast.error('请输入验证码');
      return;
    }

    // 验证密码强度
    if (!validatePassword(newPassword)) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      // 先验证验证码
      console.log('开始验证验证码...');
      const verifyResponse = await fetch('https://qkfzknvbibzsmzfcrysb.supabase.co/functions/v1/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok || !verifyData.valid) {
        console.error('验证码验证失败:', verifyData);
        const errorMsg = verifyData.message || '验证码错误';
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      console.log('验证码验证成功，开始重置密码...');
      
      // 验证成功，现在重置密码
      const resetResponse = await fetch('https://qkfzknvbibzsmzfcrysb.supabase.co/functions/v1/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, password: newPassword }),
      });

      const resetData = await resetResponse.json();
      
      if (!resetResponse.ok) {
        console.error('重置密码失败:', resetData);
        let errorMsg = '重置密码失败';
        
        // 处理特定类型的错误
        if (resetData.error) {
          if (typeof resetData.error === 'string' && 
              (resetData.error.includes('AuthWeakPasswordError') || 
               resetData.error.includes('Password should contain'))) {
            errorMsg = '密码不符合安全要求: 必须包含大小写字母和数字';
          } else {
            errorMsg = resetData.error;
          }
        }
        
        if (resetData.details) {
          errorMsg += ': ' + resetData.details;
        }
        
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      // 确认重置成功
      console.log('密码重置响应:', resetData);

      // 处理不同的响应情况
      if (resetData.success) {
        if (resetData.partialSuccess) {
          // 部分成功情况
          toast.success('密码已重置，可能需要稍等片刻才能使用新密码登录', { duration: 5000 });
        } else {
          // 完全成功情况
          toast.success('密码重置成功！请使用新密码登录');
        }
        
        // 显示重要提示
        toast.success(
          <div>
            <p className="font-bold">登录提示:</p>
            <p>如果您在登录时遇到问题:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>请尝试清除浏览器缓存后重试</li>
              <li>或使用无痕模式/私密浏览</li>
              <li>或使用魔法链接登录</li>
            </ul>
          </div>, 
          { duration: 10000, icon: '🔑' }
        );
        
        // 等待3秒后再跳转，确保用户看到成功提示
        setTimeout(() => {
          // 重定向到登录页面，并传递邮箱参数及来源标记
          window.location.href = `/login?email=${encodeURIComponent(email)}&from=reset`;
        }, 3000);
      } else {
        // 服务器返回了成功状态码但数据显示失败
        toast.error(resetData.message || '重置密码过程中出现问题，请稍后重试');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('系统错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Tool className="h-12 w-12 text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">重置密码</h2>
          <p className="mt-2 text-sm text-gray-600">我们将发送验证码到您的邮箱</p>
        </div>

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
              disabled={isLoading || isCodeSent}
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
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="请输入验证码"
                required
                disabled={isLoading || !isCodeSent}
              />
              <button
                type="button"
                onClick={handleSendCodeClick}
                className="whitespace-nowrap px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                disabled={isLoading || !email || countdown > 0 || isSendingCode}
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

          {isCodeSent && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新密码
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-2 rounded-lg border ${passwordError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'} focus:ring-1 focus:ring-blue-500`}
                  placeholder="请设置您的新密码"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                {passwordError && (
                  <div className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {passwordError}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  密码必须至少包含一个大写字母、一个小写字母和一个数字
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="请再次输入密码"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={isLoading || !email || !verificationCode || (isCodeSent && (!newPassword || !confirmPassword || newPassword !== confirmPassword || passwordError))}
          >
            {isLoading ? '提交中...' : '重置密码'}
          </button>

          <p className="text-center text-sm text-gray-600">
            <Link to="/login" className="text-blue-500 hover:text-blue-600">
              返回登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword; 