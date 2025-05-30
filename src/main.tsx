import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 预加载关键资源函数
const preloadCriticalResources = () => {
  // 预加载关键图片
  const preloadImages = [
    '/logo.svg', 
    '/favicon.ico'
  ];
  
  preloadImages.forEach(imageUrl => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = imageUrl;
    document.head.appendChild(link);
  });
  
  // 预连接关键域名
  const preconnectDomains = [
    'https://zjzhskqdfemfxjdbgxwv.supabase.co'
  ];
  
  preconnectDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// 在页面加载完成后执行预加载
if (document.readyState === 'complete') {
  preloadCriticalResources();
} else {
  window.addEventListener('load', preloadCriticalResources);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
