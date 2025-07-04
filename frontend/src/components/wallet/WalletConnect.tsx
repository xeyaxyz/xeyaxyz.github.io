import React from 'react';
import { useWallet } from '../../context/WalletContext';

const WalletConnect: React.FC = () => {
  const { account, isConnected, connectWallet, disconnectWallet, error } = useWallet();

  return (
    <div className="space-y-4">
      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Wallet Connected
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Address:</p>
            <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </p>
          </div>
          <button
            onClick={disconnectWallet}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={connectWallet}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Connect MetaMask
          </button>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 