import React from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

const AdminPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  // 检查是否是管理员
  if (status === 'loading') {
    return <div className="p-6">加载中...</div>;
  }

  if (!session?.user?.isAdmin) {
    return <div className="p-6">没有访问权限</div>;
  }

  const menuItems = [
    {
      title: '广告管理',
      description: '管理网站广告、上传新广告、设置广告链接',
      path: '/admin/ads',
      icon: '🎯',
    },
    // 可以在这里添加更多管理功能
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">管理员控制台</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <div
            key={item.path}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(item.path)}
          >
            <div className="text-3xl mb-4">{item.icon}</div>
            <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
            <p className="text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPage; 