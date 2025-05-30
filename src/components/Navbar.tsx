import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PenTool as Tool, User, Download } from 'lucide-react';

const Navbar = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="relative z-10">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-xl -z-10" />
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="flex items-center space-x-2 group logo-target"
          >
            <Tool className="h-8 w-8 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">
              WE Tools
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/wangzaiwang-hub/PakePlus/releases/tag/WETools"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors duration-300"
            >
              <Download size={18} />
              <span>桌面版</span>
            </a>
            
            {isAdmin && (
              <Link
                to="/admin"
                className="glass-button px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                管理后台
              </Link>
            )}
            
            {user ? (
              <Link
                to="/profile"
                className="glass-button flex items-center space-x-1 px-4 py-2 text-gray-600 hover:text-blue-500"
              >
                <User size={18} />
                <span>我的</span>
              </Link>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="glass-button px-4 py-2 text-gray-600 hover:text-blue-500"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 
                           text-white hover:from-blue-600 hover:to-blue-700 
                           transition-all duration-300
                           shadow-[0_4px_12px_-2px_rgba(59,130,246,0.2)]
                           hover:shadow-[0_8px_20px_-2px_rgba(59,130,246,0.3)]"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;