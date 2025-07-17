import React from 'react';
import { WalletProvider } from './context/WalletContext';
import Header from './components/ui/Header';
import RetirementCalculator, { RetirementForm } from './components/retirement/RetirementCalculator';
import RetirementDashboard from './components/retirement/RetirementDashboard';
import WalletConnect from './components/wallet/WalletConnect';
import 'katex/dist/katex.min.css';

function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        
        <main className="container mx-auto py-12 px-6">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-8xl font-bold leading-tight md:leading-[1.2] text-gray-900 dark:text-white mb-6">
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              XeyaRetirement
              </span>
            </h1>
            {/*
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Calculate how much money you need to secure your retirement on your own terms.
              <br />
              Save, top-up and earn interest with XeyaRetirement.
            </p>
            */}
          </div>

          {/* Main Content Grid */}
          <div className="flex justify-center">
            {/* Calculator Section */}
            <section id="calculator" className="w-full max-w-4xl">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                <RetirementCalculator
                  onCalculate={async (data: RetirementForm) => {
                    // Always return a string, not a React element or object
                    return '10.0';
                  }}
                  onCreatePlan={async (data: RetirementForm) => {
                    // Placeholder: simulate plan creation
                    return;
                  }}
                  loading={false}
                  hasExistingPlan={false}
                />
              </div>
            </section>

            {/* Sidebar - commented out
            <aside className="space-y-8 lg:col-span-1">
              {/* Dashboard Section */}
              {/*
              <section id="dashboard">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h3>
                  </div>
                  <RetirementDashboard />
                </div>
              </section>
              */}

              {/* Wallet Section */}
              {/*
              <section id="wallet">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Wallet</h3>
                  </div>
                  <WalletConnect />
                </div>
              </section>
              */}
            {/* </aside> */}
          </div>

          {/* Footer */}
          <footer className="mt-20 text-center">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <p className="text-gray-500 dark:text-gray-400">
                © 2025 XeyaRetirement. Built with ❤️ for secure retirement planning.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;
