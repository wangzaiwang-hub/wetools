import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-900">隐私政策</h1>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-green-600 mt-0.5" />
              <p className="text-green-800 font-medium">
                WE Tools 非常重视您的隐私保护。本隐私政策说明我们如何收集、使用和保护您的个人信息。使用我们的服务即表示您同意本隐私政策的内容。
              </p>
            </div>
          </div>

          <div className="space-y-4 text-gray-600">
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">1. 信息收集</h2>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-800 mb-2">我们可能收集以下类型的信息：</p>
                <ul className="list-disc pl-8 space-y-2 text-blue-700">
                  <li>账户信息（如用户名、电子邮件地址）</li>
                  <li>
                    <strong>第三方授权信息：</strong>
                    当您选择使用如QQ等第三方服务登录时，我们会根据您的授权，收集您在该第三方平台的公开信息，包括您的昵称（`nickname`）和头像（`avatar_url`）。
                  </li>
                  <li>日志信息（如IP地址、访问时间、设备信息）</li>
                  <li>用户行为数据（如点击、浏览记录）</li>
                  <li>系统自动收集的技术数据</li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">2. 信息使用</h2>
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="font-medium text-indigo-800 mb-2">我们收集的信息将用于：</p>
                <ul className="list-disc pl-8 space-y-2 text-indigo-700">
                  <li>提供、维护和改进我们的服务</li>
                  <li>
                    <strong>个性化体验：</strong>
                    您通过QQ等第三方服务授权的昵称和头像，将用于在您的个人资料页面以及网站的其他位置展示，为您提供更个性化的使用体验。
                  </li>
                  <li>处理用户反馈和请求</li>
                  <li>发送服务通知和更新信息</li>
                  <li>防止欺诈和提高安全性</li>
                  <li>进行数据分析和研究</li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">3. 信息共享</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium mb-2">
                  我们承诺不会出售、出租或以其他方式与第三方共享您的个人信息，除非：
                </p>
                <ul className="list-disc pl-8 space-y-2 text-red-700">
                  <li>获得您的明确同意</li>
                  <li>法律法规要求</li>
                  <li>保护我们的合法权益</li>
                  <li>与我们的服务提供商合作（他们需遵守保密义务）</li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">4. 信息安全</h2>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium mb-2">
                  我们采取各种安全措施保护您的个人信息：
                </p>
                <ul className="list-disc pl-8 space-y-2 text-green-700">
                  <li>使用加密技术传输和存储数据</li>
                  <li>定期更新安全措施</li>
                  <li>限制员工访问个人信息</li>
                  <li>定期进行安全审计</li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">5. Cookie 使用</h2>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  我们使用 Cookie 和类似技术来提供和改进服务。
                  <span className="font-medium">您可以通过浏览器设置控制 Cookie 的使用，但这可能会影响某些功能的使用。</span>
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">6. 未成年人保护</h2>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 font-medium">
                  我们建议未满18岁的未成年人在监护人指导下使用我们的服务。如果您是未成年人的监护人，发现您的被监护人未经您同意提供个人信息，请联系我们。
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">7. 用户权利</h2>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-800 font-medium mb-2">您对您的个人信息拥有以下权利：</p>
                <ul className="list-disc pl-8 space-y-2 text-purple-700">
                  <li>访问和获取您的个人信息副本</li>
                  <li>更正不准确的个人信息</li>
                  <li>删除您的个人信息</li>
                  <li>撤回同意的权利</li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">8. 联系我们</h2>
              <p>如果您对本隐私政策有任何疑问，请通过以下方式联系我们：</p>
              <ul className="list-disc pl-8 space-y-2">
                <li>邮箱：junqianxi.hub@gmail.com</li>
                <li>微信公众号：wctw.hub</li>
              </ul>
              <div className="mt-4">
                <img 
                  src="https://wangzaiwang.oss-cn-beijing.aliyuncs.com/image/QR.webp" 
                  alt="微信公众号二维码" 
                  className="w-32 h-32 object-cover rounded-lg shadow-sm"
                />
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-500">
            最后更新时间：2024年4月1日
          </div>
          
          <div className="flex justify-center mt-6">
            <Link 
              to="/" 
              className="inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回上一级
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;