import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { DashboardData } from '../../utils/contract';
import { calculateInvestmentWithNewFormula, FIXED_INFLATION_RATE } from '../../utils/calculations';
import { RetirementForm } from './RetirementCalculator';

interface RetirementDashboardProps {
  formData?: RetirementForm;
  averageYieldRate?: number;
}

const RetirementDashboard: React.FC<RetirementDashboardProps> = ({ formData, averageYieldRate }) => {
  const { isConnected, account, contract } = useWallet();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!contract || !account) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await contract.getDashboardData(account);
      setDashboardData(data);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when wallet connects or account changes
  useEffect(() => {
    if (isConnected && contract && account) {
      fetchDashboardData();
    }
  }, [isConnected, contract, account]);

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Connect your wallet to view your retirement dashboard and track your progress.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Loading Dashboard
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Fetching your retirement data from the blockchain...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Error Loading Data
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error}
        </p>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show message if no retirement plan exists
  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Retirement Plan Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          You haven't created a retirement plan yet. Use the calculator to create your first plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Savings Progress
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Current Savings</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${dashboardData.currentSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Target Amount</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${formData && averageYieldRate !== undefined 
                ? calculateInvestmentWithNewFormula(formData, averageYieldRate, FIXED_INFLATION_RATE).toLocaleString(undefined, { maximumFractionDigits: 2 })
                : dashboardData.targetAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
              }
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(formData && averageYieldRate !== undefined 
                ? (dashboardData.currentSavings / calculateInvestmentWithNewFormula(formData, averageYieldRate, FIXED_INFLATION_RATE)) * 100
                : dashboardData.progressPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formData && averageYieldRate !== undefined 
                ? ((dashboardData.currentSavings / calculateInvestmentWithNewFormula(formData, averageYieldRate, FIXED_INFLATION_RATE)) * 100).toFixed(1)
                : dashboardData.progressPercentage.toFixed(1)
              }%
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">Complete</p>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payment Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">Monthly Payment</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              ${dashboardData.monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">Next Payment</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {dashboardData.nextPaymentDate 
                ? new Date(dashboardData.nextPaymentDate).toLocaleDateString()
                : dashboardData.hasReachedTarget 
                  ? 'Eligible for payments'
                  : 'Target not reached'
              }
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Total Payments Received: <span className="font-medium text-gray-900 dark:text-white">{dashboardData.totalPaymentsReceived}</span>
          </p>
          {dashboardData.paymentsStarted && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              ✓ Monthly payments are active
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {!dashboardData.hasReachedTarget && (
            <button 
              onClick={() => window.location.hash = '#calculator'}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              Deposit Funds
            </button>
          )}
          {dashboardData.hasReachedTarget && !dashboardData.paymentsStarted && (
            <button 
              onClick={() => window.location.hash = '#calculator'}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
            >
              Start Monthly Payments
            </button>
          )}
          <button 
            onClick={() => window.location.hash = '#calculator'}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
          >
            View Transaction History
          </button>
        </div>
      </div>
    </div>
  );
};

export default RetirementDashboard; 