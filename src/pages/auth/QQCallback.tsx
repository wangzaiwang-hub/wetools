import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithQQ, QQUserInfo } from '../../lib/qq-connect';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const QQCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>(['日志初始化...']);
  const navigate = useNavigate();
  const { user } = useAuth();

  const addDebugInfo = useCallback((info: string) => {
    console.log(`[QQ Callback] ${info}`);
    setDebugInfo(prev => [...prev, info]);
  }, []);

  useEffect(() => {
    if (user) {
      addDebugInfo('用户已登录，跳转到首页。');
      navigate('/');
      return;
    }

    addDebugInfo('QQ登录回调页面加载。');

    const handleAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        addDebugInfo(`从URL获取参数: code=${code ? '存在' : '不存在'}, state=${state || '不存在'}`);

        if (!code) throw new Error('URL中未找到授权码(code)，无法继续。');
        
        const savedState = localStorage.getItem('qq_state');
        if (!state || !savedState || state !== savedState) {
          localStorage.removeItem('qq_state');
          throw new Error('State参数不匹配，为防止CSRF攻击已停止登录流程。');
        }
        localStorage.removeItem('qq_state');
        addDebugInfo('State验证通过。');

        addDebugInfo('步骤1: 调用Supabase Edge Function (qq-auth) 来获取用户信息...');
        const { data: functionData, error: functionError } = await supabase.functions.invoke('qq-auth', {
          body: { code },
        });

        if (functionError) {
          addDebugInfo(`Edge Function调用失败: ${functionError.message}`);
          throw new Error(`认证服务器通信失败: ${functionError.message}`);
        }
        
        if (functionData.error) {
          addDebugInfo(`Edge Function内部错误: ${functionData.error}`);
          throw new Error(`认证失败: ${functionData.error}`);
        }
        
        addDebugInfo('Edge Function调用成功，获取到用户信息。');
        const qqProfile = functionData as { openId: string; nickname: string; figureurl_qq_2: string; gender: string; };

        addDebugInfo('步骤2: 使用获取到的用户信息进行Supabase登录/注册...');
        const { isNewUser, session, user: authUser } = await signInWithQQ({
          openId: qqProfile.openId,
          nickname: qqProfile.nickname,
          figureurl_qq_2: qqProfile.figureurl_qq_2,
          gender: qqProfile.gender || '未知',
          // 补充signInWithQQ必须的字段
          ret: 0,
          msg: 'Success',
        });
        
        addDebugInfo(`Supabase处理完成。${isNewUser ? '新用户已创建' : '老用户已登录'}。`);

        if (session && authUser) {
          toast.success(isNewUser ? 'QQ注册并登录成功！' : 'QQ登录成功！');
          
          let returnTo = localStorage.getItem('qq_login_from') || '/';
          localStorage.removeItem('qq_login_from');
          
          // 如果登录/注册成功后返回的页面是登录页或注册页，则重定向到主页
          if (['/login', '/register'].includes(returnTo)) {
            returnTo = '/';
          }
          
          navigate(returnTo);

        } else {
          throw new Error('Supabase登录或注册后未能建立有效会话。');
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        addDebugInfo(`处理过程中发生严重错误: ${errorMessage}`);
        console.error('QQ登录回调处理失败详情:', err);
        setError(errorMessage);
        toast.error(`登录失败: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    handleAuth();

  }, [user, navigate, addDebugInfo]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800">正在处理QQ登录...</h2>
        <p className="text-gray-600 mt-2">请稍候，我们正在通过安全的后端服务验证您的信息。</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
        <div className="bg-white shadow-xl rounded-lg p-6 md:p-8 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-700 mb-4 text-center">QQ登录失败</h2>
          <p className="text-red-600 mb-5 text-center whitespace-pre-wrap">{error}</p>
          <details className="mb-6 w-full">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">显示调试日志</summary>
            <div className="mt-2 bg-gray-50 p-3 rounded-md text-xs font-mono text-gray-700 max-h-48 overflow-y-auto border border-gray-200">
              {debugInfo.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all py-0.5">{line}</div>
              ))}
            </div>
          </details>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              返回登录页
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-5 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QQCallback; 