import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  loadQQConnectScript, 
  getQQUserInfo, 
  signInWithQQ, 
  QQUserInfo
} from '../../lib/qq-connect';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const QQCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>(['调试日志初始化...']);
  const navigate = useNavigate();
  const { user, login } = useAuth(); // Assuming login updates context and navigates

  const addDebugInfo = useCallback((info: string) => {
    console.log(`[QQ Callback] ${info}`);
    setDebugInfo(prev => [...prev, info]);
  }, []);

  useEffect(() => {
    if (user) {
      addDebugInfo('用户已登录，准备跳转到首页...');
      navigate('/');
      return;
    }

    addDebugInfo('QQCallback Effect启动，开始处理...');

    const handleQQAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        addDebugInfo(`当前URL参数: code=${code ? code.substring(0,5)+'...':'N/A'}, state=${state || 'N/A'}`);

        const errorCode = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        if (errorCode) {
          throw new Error(`QQ授权服务器返回错误: ${errorCode} - ${errorDescription || '未知QQ错误'}`);
        }

        if (!code) {
          throw new Error('URL中未找到授权码 (code)，无法继续。');
        }

        const savedState = localStorage.getItem('qq_state');
        if (state && savedState && state !== savedState) {
          localStorage.removeItem('qq_state');
          throw new Error('State参数不匹配，可能存在CSRF攻击风险。');
        }
        localStorage.removeItem('qq_state'); // 验证后清除
        addDebugInfo(state ? 'State验证通过' : 'State未在URL中提供或未进行验证');

        addDebugInfo('步骤1: 加载QQ Connect SDK...');
        const sdkLoaded = await loadQQConnectScript();
        if (!sdkLoaded) {
          throw new Error('QQ Connect SDK加载失败。');
        }
        addDebugInfo('QQ Connect SDK加载成功!');

        if (typeof window.QC === 'undefined' || !window.QC || !window.QC.Login || !window.QC.Login.getMe) {
          addDebugInfo('QC SDK对象或QC.Login.getMe方法未定义!');
          throw new Error('QQ SDK初始化失败，关键对象不可用。');
        }
        addDebugInfo('QC.Login.getMe方法可用。');

        addDebugInfo('步骤2: 调用QC.Login.getMe()获取OpenID和AccessToken...');
        const { openId, accessToken } = await new Promise<{openId: string, accessToken: string}>((resolve, reject) => {
          window.QC.Login.getMe((sdkOpenId, sdkAccessToken) => {
            addDebugInfo(`QC.Login.getMe回调: openId=${sdkOpenId}, accessToken=${sdkAccessToken ? sdkAccessToken.substring(0,8)+'...' : 'N/A'}`);
            if (sdkOpenId && sdkAccessToken) {
              addDebugInfo('从getMe成功获取OpenID和AccessToken。');
              resolve({ openId: sdkOpenId, accessToken: sdkAccessToken });
            } else {
              addDebugInfo('getMe未能返回有效的OpenID或AccessToken。');
              reject(new Error('无法从QQ SDK (getMe) 获取OpenID或AccessToken。'));
            }
          });
        });
        addDebugInfo(`获取到的OpenID: ${openId}, AccessToken: ${accessToken.substring(0,8)}...`);

        addDebugInfo('步骤3: 使用SDK获取QQ用户信息 (getQQUserInfo)...');
        // getQQUserInfo 应该在QC.Login.getMe成功后，使用SDK内部维护的token状态
        const qqProfile: QQUserInfo = await getQQUserInfo(); 
        if (!qqProfile || qqProfile.ret !== 0 || !qqProfile.openId) {
            addDebugInfo(`获取用户信息API返回异常: ret=${qqProfile?.ret}, msg=${qqProfile?.msg}, openId=${qqProfile?.openId}`);
            throw new Error(qqProfile?.msg || '获取QQ用户基本信息失败或OpenID缺失。');
        }
         // 确保从getQQUserInfo获取的openId与getMe的openId一致，作为额外校验
        if (qqProfile.openId !== openId) {
            addDebugInfo(`警告: getMe返回的openId (${openId}) 与 getQQUserInfo返回的openId (${qqProfile.openId}) 不一致! 使用getMe的openId.`);
            qqProfile.openId = openId; // 优先使用getMe直接返回的openId
        }
        addDebugInfo(`成功获取QQ用户信息: ${qqProfile.nickname} (OpenID: ${qqProfile.openId})`);

        addDebugInfo('步骤4: 使用获取到的用户信息进行Supabase登录/注册...');
        const { isNewUser, session: newSession, user: authUser } = await signInWithQQ(qqProfile);
        addDebugInfo(`Supabase处理完成. ${isNewUser ? '新用户已创建。' : '用户已存在并登录。'}`);

        if (newSession && authUser) {
          addDebugInfo('Supabase会话已建立。调用AuthContext的login方法...');
          // 使用AuthContext的login方法来更新全局状态并处理导航
          // login(newSession, authUser); // 这取决于你的AuthContext如何设计
          // 如果AuthContext的signInWithQQ已经处理了登录，这里可能不需要再次调用login
          // 暂时直接导航，假设signInWithQQ更新了Supabase的会话，主App监听器会处理
          toast.success(isNewUser ? 'QQ注册并登录成功！' : 'QQ登录成功！');
          navigate('/'); // 跳转到首页
        } else {
          throw new Error('Supabase登录/注册后未能建立有效会话。');
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addDebugInfo(`处理过程中发生严重错误: ${errorMessage}`);
        console.error('QQ登录回调处理失败详情:', err);
        setError(errorMessage);
        toast.error(`登录失败: ${errorMessage}`);
      } finally {
        setLoading(false);
        addDebugInfo('QQ登录回调处理流程结束。');
      }
    };

    handleQQAuth();

  }, [user, navigate, addDebugInfo, login]); // login from useAuth if it causes navigation

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800">正在处理QQ登录...</h2>
        <p className="text-gray-600 mt-2">请稍候，正在安全连接您的QQ账户。</p>
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

  return null; // Fallback, should ideally navigate away or show error/loading
};

export default QQCallback; 