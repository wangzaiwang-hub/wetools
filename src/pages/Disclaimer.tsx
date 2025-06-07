import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield } from 'lucide-react';

const Disclaimer = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">完整免责声明</h1>
          </div>

          {/* 重要提示 */}
          <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <p className="text-red-800 font-bold text-lg">
                  重要提示：使用本网站即表示您完全接受以下免责声明的所有条款
                </p>
                <p className="text-red-700">
                  如果您不同意以下任何条款，请立即停止使用本网站的所有服务。继续使用将被视为完全同意并接受本声明的所有条款。
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 text-gray-600">
            {/* 软件使用声明 */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">1. 软件使用声明</h2>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">
                  本网站提供的所有软件和工具<span className="text-red-600 font-bold">仅供学习和研究使用</span>。
                  用户在使用过程中必须遵守相关法律法规，<span className="text-red-600 font-bold">不得用于任何违法违规用途</span>。
                </p>
              </div>
            </section>

            {/* 责任限制 */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">2. 责任限制</h2>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <ul className="list-disc pl-6 space-y-2 text-blue-900">
                  <li>
                    用户应<span className="font-bold">自行判断软件的可用性和安全性</span>
                  </li>
                  <li>
                    本网站<span className="font-bold">不对软件的实际功能、性能、安全性做任何明示或暗示的保证</span>
                  </li>
                  <li>
                    对于因使用本网站服务而可能带来的任何直接或间接损失，<span className="text-red-600 font-bold">本网站不承担任何责任</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 知识产权声明 */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">3. 知识产权声明</h2>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-900">
                  本网站展示的第三方软件的所有权归其各自所有者所有。
                  <span className="font-bold">如果您认为本网站上的内容侵犯了您的知识产权，请立即与我们联系，我们将在核实后及时处理。</span>
                </p>
              </div>
            </section>

            {/* 服务变更声明 */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">4. 服务变更声明</h2>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 font-medium">
                  本网站保留<span className="text-red-600 font-bold">随时修改或中断服务的权利，不需事先通知用户</span>。
                  对于服务的修改、中断或终止而造成的任何损失，本网站不承担任何责任。
                </p>
              </div>
            </section>

            {/* 用户行为规范 */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">5. 用户行为规范</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-800 mb-2">用户在使用本网站服务时必须遵守以下规定：</p>
                <ul className="list-disc pl-6 space-y-2 text-red-700">
                  <li>遵守中国有关法律法规</li>
                  <li>遵守所有与网络服务有关的网络协议、规定和程序</li>
                  <li>不得为任何非法目的而使用网络服务系统</li>
                  <li>不得利用本网站进行任何可能对互联网正常运转造成不利影响的行为</li>
                  <li>不得利用本网站传播任何骚扰性、中伤性、攻击性、诽谤性、庸俗性或其他任何非法的信息资料</li>
                </ul>
              </div>
            </section>

            {/* 数据安全 */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">6. 数据安全</h2>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 mb-2">
                  本网站<span className="font-bold">不对用户的存储在本站服务器上的数据的删除或储存失败负责</span>。
                  用户应自行承担备份本站相关数据的责任。
                </p>
                <p className="text-green-800 mt-2">
                  对于通过第三方服务（如QQ登录）授权的个人信息（如昵称、头像），我们会采取合理的安全措施进行保护。但是，我们<span className="font-bold">不对因黑客攻击、计算机病毒侵入或政府管制等不可抗力因素造成的资料泄露、丢失、被盗用或被篡改等情况承担任何责任</span>。
                </p>
              </div>
            </section>

            {/* 法律适用 */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">7. 法律适用</h2>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-800">
                  本声明未涉及的问题参见国家有关法律法规，当本声明与国家法律法规冲突时，
                  <span className="font-bold">以国家法律法规为准</span>。
                </p>
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

export default Disclaimer; 