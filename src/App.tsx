import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AdvertisementProvider } from './contexts/AdvertisementContext';
import { ChatbotProvider } from './contexts/ChatbotContext';
import Navbar from './components/Navbar';
import { supabase } from './lib/supabase';
import toast from 'react-hot-toast';

// 懒加载路由组件
const Home = lazy(() => import('./pages/Home'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));
const WebsiteDirectory = lazy(() => import('./pages/WebsiteDirectory'));
const SoftwareDetail = lazy(() => import('./pages/SoftwareDetail'));
const WebsiteDetail = lazy(() => import('./pages/WebsiteDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const QQCallback = lazy(() => import('./pages/auth/QQCallback'));

// 处理魔法链接登录回调
const AuthCallbackHandler = () => {
  useEffect(() => {
    // Supabase 会自动处理 URL 中的认证信息
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('认证回调处理失败:', error);
          toast.error('登录失败，请重试');
        } else if (data.session) {
          // 移除登录成功提示，实现静默登录
          // 不再显示 toast.success('登录成功！欢迎回来');
          console.log('用户已登录:', data.session.user?.email);
        }
      } catch (error) {
        console.error('处理认证回调时出错:', error);
      }
    };

    handleAuthCallback();
  }, []);

  // 重定向到主页
  return <Navigate to="/" replace />;
};

// 加载中组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <AdvertisementProvider>
        <Router>
          <ChatbotProvider>
            <Navbar />
            <Toaster position="top-right" />
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/disclaimer" element={<Disclaimer />} />
                <Route path="/websites" element={<WebsiteDirectory />} />
                <Route path="/software/:id" element={<SoftwareDetail />} />
                <Route path="/website/:id" element={<WebsiteDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/auth/callback" element={<AuthCallbackHandler />} />
                <Route path="/auth/qq-callback" element={<QQCallback />} />
              </Routes>
            </Suspense>
          </ChatbotProvider>
        </Router>
      </AdvertisementProvider>
    </AuthProvider>
  );
}

export default App;