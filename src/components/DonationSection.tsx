import React from 'react';
import { Heart } from 'lucide-react';

const DonationSection: React.FC = () => {
  return (
    <div className="mt-16 py-12 px-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">支持我们</h2>
        <p className="text-gray-600 mb-8">
          软件全部免费，如果您觉得 WE Tools 对您有所帮助，欢迎赞助我们，帮助我们提供更好的服务！
        </p>
        
        <div className="flex flex-col md:flex-row justify-center gap-8">
          <div className="flex-1 max-w-xs mx-auto">
            <div className="bg-white p-4 rounded-xl shadow-md">
              <div className="bg-[#1677FF] text-white py-3 rounded-lg mb-4">
                <h3 className="text-lg font-medium">推荐使用支付宝</h3>
              </div>
              <img 
                src="https://wangzaiwang.oss-cn-beijing.aliyuncs.com/image/9c0c4bdd748fa6664b4a26ce3526eb0.webp" 
                alt="支付宝收款码" 
                className="w-full h-auto rounded-lg mb-2"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/300x300?text=支付宝收款码";
                }}
              />
              <p className="text-gray-500 text-sm">一丝不苟的沙漠一雕 (⁎˃ᆺ˂)</p>
            </div>
          </div>
          
          <div className="flex-1 max-w-xs mx-auto">
            <div className="bg-white p-4 rounded-xl shadow-md">
              <div className="bg-[#2AAE67] text-white py-3 rounded-lg mb-4">
                <h3 className="text-lg font-medium">推荐使用微信支付</h3>
              </div>
              <img 
                src="https://wangzaiwang.oss-cn-beijing.aliyuncs.com/image/a8cf1b0f2dd7f933812ecf87d2bf7d9.webp" 
                alt="微信收款码" 
                className="w-full h-auto rounded-lg mb-2"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/300x300?text=微信收款码";
                }}
              />
              <p className="text-gray-500 text-sm">烟火泛滥(⁎˃ᆺ˂)</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex items-center justify-center">
          <Heart className="text-red-500 mr-2 animate-pulse" />
          <p className="text-gray-600">感谢您的支持！</p>
        </div>
        <p className="mt-4 text-gray-600 text-sm">软件如有侵权，请联系下架。联系邮箱：junqianxi.hub@gmail.com</p>
      </div>
    </div>
  );
};

export default DonationSection;