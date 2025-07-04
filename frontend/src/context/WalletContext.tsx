import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { createPensionContract, PensionContract } from '../utils/contract';

interface WalletContextType {
  account: string | null;
  isConnected: boolean;
  provider: ethers.providers.Web3Provider | null;
  contract: PensionContract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [contract, setContract] = useState<PensionContract | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setError(null);
    if (!(window as any).ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to use this app.');
      return;
    }

    try {
      // Request account access
      const accounts = await (window as any).ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      // Create provider
      const web3Provider = new ethers.providers.Web3Provider((window as any).ethereum);
      
      // Create contract instance
      const pensionContract = createPensionContract(web3Provider);
      
      setAccount(accounts[0]);
      setProvider(web3Provider);
      setContract(pensionContract);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet.');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setError(null);
  };

  // Listen for account changes
  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          // Recreate provider and contract with new account
          const web3Provider = new ethers.providers.Web3Provider((window as any).ethereum);
          const pensionContract = createPensionContract(web3Provider);
          setProvider(web3Provider);
          setContract(pensionContract);
        } else {
          disconnectWallet();
        }
      });

      // Listen for chain changes
      (window as any).ethereum.on('chainChanged', () => {
        // Recreate provider and contract when chain changes
        const web3Provider = new ethers.providers.Web3Provider((window as any).ethereum);
        const pensionContract = createPensionContract(web3Provider);
        setProvider(web3Provider);
        setContract(pensionContract);
      });
    }
  }, []);

  const value = {
    account,
    isConnected: !!account,
    provider,
    contract,
    connectWallet,
    disconnectWallet,
    error
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}; 