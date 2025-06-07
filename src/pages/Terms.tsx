import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold text-gray-900">服务条款</h1>
          </div>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">
              请您仔细阅读以下条款，使用我们的服务即表示您同意接受以下所有条款。如果您不同意本条款中的任何内容，请停止使用我们的服务。
            </p>
          </div>

          <div className="space-y-4 text-gray-600">
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">1. 服务内容</h2>
              <p>
                WE Tools 是一个软件工具分享平台，为用户提供软件下载、展示等服务。
                <span className="text-red-600 font-medium">我们保留随时修改或中断服务而不需通知用户的权利。</span>
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">2. 用户账户</h2>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <p className="mb-2">
                  您可能需要注册一个账户才能使用我们的部分服务。您对账户下发生的所有活动负有全部责任。
                </p>
                <p>
                  当您使用如QQ等第三方服务进行注册和登录时，即表示您同意授权我们访问和使用您在该第三方平台的公开信息（如昵称、头像），具体细节请参阅我们的
                  <Link to="/privacy" className="font-semibold text-blue-600 hover:text-blue-800">《隐私政策》</Link>。
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">3. 用户义务</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-800 mb-2">用户在使用本网站服务时必须遵守以下规定：</p>
                <ul className="list-disc pl-8 space-y-2 text-red-700">
                  <li>遵守中华人民共和国相关法律法规</li>
                  <li>不得利用本站服务从事违法违规活动</li>
                  <li>不得干扰本站的正常运营</li>
                  <li>不得上传或传播任何违法、有害或不当内容</li>
                  <li>遵守所有与网络服务相关的网络协议、规定和程序</li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">4. 知识产权</h2>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">
                  <span className="font-medium">本网站所有原创内容的知识产权归 WE Tools 所有。</span>
                  未经许可，任何人不得擅自使用、修改、复制、公开传播、改变、散布、发行或公开发表本网站的内容。
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">5. 免责声明</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">
                  本网站对所提供的软件和服务不作任何明示或暗示的保证。用户理解并同意自行承担使用本网站服务的全部风险。
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">6. 服务变更、中断或终止</h2>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 mb-2">如发生下列任何一种情形，本网站有权随时中断或终止向用户提供服务：</p>
                <ul className="list-disc pl-8 space-y-2 text-orange-700">
                  <li>用户违反本服务条款的规定</li>
                  <li>用户注册信息不真实</li>
                  <li>用户违反相关法律法规</li>
                  <li>根据法律法规或主管部门的要求</li>
                  <li>出于安全或技术维护的需要</li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">7. 用户隐私</h2>
              <p>
                我们重视用户的隐私保护，具体隐私保护政策请参见本站的
                <Link to="/privacy" className="text-blue-600 hover:text-blue-800 font-medium">《隐私政策》</Link>。
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">8. 法律管辖</h2>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-800">
                  本协议的订立、执行和解释及争议的解决均应适用
                  <span className="font-medium">中华人民共和国法律</span>。
                  如发生本站服务条款与中华人民共和国法律相抵触时，则该条款将按相关法律规定重新解释，而其他条款则继续有效。
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">9. 联系方式</h2>
              <p>如果您对本服务条款有任何疑问，请通过以下方式联系我们：</p>
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

export default Terms;