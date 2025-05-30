import { Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
      {/* 前往网站导航的按钮 */}
      <Link 
        to="/websites"
        className="fixed top-5 left-5 z-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-all duration-300 flex items-center gap-2"
      >
        <Globe size={18} />
        <span>网站导航</span>
      </Link>

      <div className="max-w-7xl mx-auto">
        {/* Existing content ... */}
      </div>
    </div>
  );
};

export default Home; 