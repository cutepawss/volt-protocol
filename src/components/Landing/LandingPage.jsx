import React from 'react';
import { Zap, ArrowRight, Github } from 'lucide-react';

export default function VoltLanding({ onLaunchApp }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6" style={{ color: '#2f578c' }} />
            <span className="text-xl font-bold">Volt Protocol</span>
          </div>
          <div className="flex items-center gap-6">
            <a 
              href="https://github.com/cutepawss/volt-protocol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <button 
              onClick={onLaunchApp}
              className="px-5 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: '#2f578c' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#234567'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2f578c'}
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block mb-6 px-3 py-1 border rounded-full text-sm" style={{ backgroundColor: 'rgba(47, 87, 140, 0.1)', borderColor: 'rgba(47, 87, 140, 0.2)', color: '#5a8fc7' }}>
            Arc Testnet
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
            Money streams,<br />
            not payments
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl">
            Create continuous payment streams. Trade future cash flows. 
            Get instant liquidity without waiting.
          </p>

          <div className="flex items-center gap-4">
            <button 
              onClick={onLaunchApp}
              className="group px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              style={{ backgroundColor: '#2f578c' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#234567'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2f578c'}
            >
              Start Streaming
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="https://github.com/cutepawss/volt-protocol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-6 border-y border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold mb-1">$2.5M+</div>
            <div className="text-sm text-gray-500">Total Volume</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-1">1,200+</div>
            <div className="text-sm text-gray-500">Active Streams</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-1">500+</div>
            <div className="text-sm text-gray-500">Users</div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="mb-32">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">Continuous payment streams</h2>
                <p className="text-lg text-gray-400 mb-6">
                  Money flows per second. Not weekly, not monthly. Every second.
                  Set it up once and forget about it.
                </p>
                <p className="text-gray-500">
                  Perfect for payroll, subscriptions, vesting schedules, or any recurring payment.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">$142.53</div>
                  <div className="text-gray-500">earned in the last minute</div>
                  <div className="mt-4 text-sm" style={{ color: '#5a8fc7' }}>● Streaming now</div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="mb-32">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-slate-900 border border-slate-800 rounded-xl p-8 h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-4">Your Stream</div>
                  <div className="text-gray-500 mb-4">Total: $10,000</div>
                  <button 
                    className="px-6 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(47, 87, 140, 0.2)', color: '#5a8fc7' }}
                  >
                    List on Marketplace
                  </button>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-4xl font-bold mb-6">Turn streams into instant cash</h2>
                <p className="text-lg text-gray-400 mb-6">
                  Need money now? List your stream on the marketplace. 
                  Other users buy it at a discount, you get instant liquidity.
                </p>
                <p className="text-gray-500">
                  No middlemen, no paperwork, no waiting.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">AI-powered risk scoring</h2>
                <p className="text-lg text-gray-400 mb-6">
                  Every stream in the marketplace gets a risk score. 
                  Make informed decisions when buying streams.
                </p>
                <p className="text-gray-500">
                  Higher risk, bigger discount. Lower risk, premium price.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 h-64 flex items-center justify-center">
                <div className="w-full max-w-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Risk Score</span>
                    <span className="text-2xl font-bold text-green-400">A</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    Low risk • Recommended buy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Who's using Volt?</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-6">
              <div className="text-lg font-semibold mb-2">Freelancers</div>
              <div className="text-sm text-gray-500">Get paid continuously for ongoing projects</div>
            </div>
            <div className="p-6">
              <div className="text-lg font-semibold mb-2">Companies</div>
              <div className="text-sm text-gray-500">Automated payroll and subscriptions</div>
            </div>
            <div className="p-6">
              <div className="text-lg font-semibold mb-2">Investors</div>
              <div className="text-sm text-gray-500">Buy discounted future cash flows</div>
            </div>
            <div className="p-6">
              <div className="text-lg font-semibold mb-2">DAOs</div>
              <div className="text-sm text-gray-500">Continuous treasury distributions</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Start streaming today</h2>
          <p className="text-xl text-gray-400 mb-10">
            No credit check. No approval needed. Just connect your wallet.
          </p>
          <button 
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-lg font-medium text-lg transition-colors"
            style={{ backgroundColor: '#2f578c' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#234567'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2f578c'}
          >
            Launch App
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: '#2f578c' }} />
            <span className="font-semibold">Volt Protocol</span>
            <span className="text-gray-600 text-sm">• Built on Arc Network</span>
          </div>
          <div className="flex gap-8 text-gray-500 text-sm">
            <a href="https://github.com/cutepawss/volt-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}