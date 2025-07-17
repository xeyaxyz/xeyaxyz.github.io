import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { useWallet } from '../../context/WalletContext';
import { CONTRACT_ADDRESS } from '../../utils/contract';
import { createPortal } from 'react-dom';
import { BlockMath, InlineMath } from 'react-katex';
import BitcoinPriceChart from '../ui/BitcoinPriceChart';
import WalletConnect from '../wallet/WalletConnect';
import RetirementDashboard from './RetirementDashboard';
import { calculateInvestmentWithNewFormula, FIXED_INFLATION_RATE } from '../../utils/calculations';

// Tooltip component using a portal
const Tooltip: React.FC<{ text: string; children: ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  // Helper to update position
  const updatePosition = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height + 4,
        left: rect.left + rect.width / 2,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (show) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('mousemove', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('mousemove', updatePosition);
      };
    }
  }, [show]);

  return (
    <span
      ref={ref}
      className="relative group inline-block align-middle"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={-1}
    >
      {children}
      {show && createPortal(
        <span
          className="z-[9999] fixed px-3 py-2 rounded bg-gray-900 text-xs text-white shadow-lg whitespace-normal"
          style={{
            top: coords.top,
            left: coords.left,
            transform: 'translateX(-50%)',
            minWidth: 160,
            maxWidth: 320,
          }}
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
};

export interface RetirementForm {
  lifeExpectancyYears: number;
  monthlySpending: number;
  retirementAge: number;
  currentAge: number;
}

interface RetirementCalculatorProps {
  onCalculate?: (data: RetirementForm) => Promise<string>;
  onCreatePlan?: (data: RetirementForm) => Promise<void>;
  loading?: boolean;
  hasExistingPlan?: boolean;
}

const defaultForm: RetirementForm = {
  lifeExpectancyYears: 20,
  monthlySpending: 5000,
  retirementAge: 65,
  currentAge: 30,
};



// Simulate fetching average yield rate from Pendle Finance smart contract
async function fetchPendleAverageYieldRate(): Promise<number> {
  // TODO: Replace with actual contract call
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 400));
  return 0; // Example: 5.2% annual yield
}



const RetirementCalculator: React.FC<RetirementCalculatorProps> = ({
  onCalculate,
  onCreatePlan,
  loading = false,
  hasExistingPlan = false,
}) => {
  const { isConnected, contract, account, connectWallet } = useWallet();
  const [form, setForm] = useState<RetirementForm>(defaultForm);
  const [requiredInvestment, setRequiredInvestment] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [averageYieldRate, setAverageYieldRate] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [showWalletContent, setShowWalletContent] = useState(false);
  const [showHelpText, setShowHelpText] = useState(false);

  // Fetch average yield rate on mount
  useEffect(() => {
    fetchPendleAverageYieldRate().then(rate => {
      setAverageYieldRate(rate);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: Number(value) }));
    // Clear previous results when form changes
    setRequiredInvestment(null);
    setError(null);
    setSuccess(null);
  };

  const calculateInvestment = async () => {
    // Always allow local calculation, regardless of wallet connection
    if (form.retirementAge <= form.currentAge) {
      setError('Desired Retirement Age must be greater than Current Age.');
      return;
    }
    if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000' || !contract) {
      // Use local calculation when contract is not deployed or wallet not connected
      console.log('Using local calculation');
      const result = calculateInvestmentLocally();
      setRequiredInvestment(result);
      return;
    }

    // Defensive check: log and verify contract instance
    console.log('Current contract instance:', contract);
    if (!contract || typeof contract.calculateRequiredInvestment !== 'function') {
      setError('Smart contract not loaded or invalid. Please reconnect your wallet.');
      return;
    }

    setIsCalculating(true);
    setError(null);
    
    try {
      const { lifeExpectancyYears, monthlySpending, retirementAge, currentAge } = form;
      
      console.log('Calculating investment with parameters:', {
        lifeExpectancyYears,
        monthlySpending,
        retirementAge,
        currentAge
      });
      // Log provider network
      if (contract && contract.getProvider()) {
        contract.getProvider().getNetwork().then(net => console.log('Provider network:', net));
      }
      // Call the smart contract to calculate required investment
      const yieldRateBps = Math.round((averageYieldRate ?? 0) * 100);
      const inflationRateBps = Math.round(FIXED_INFLATION_RATE * 100);
      const requiredInvestmentUSD = await contract.calculateRequiredInvestment(
        lifeExpectancyYears,
        monthlySpending,
        retirementAge,
        currentAge,
        yieldRateBps,
        inflationRateBps
      );
      
      console.log('Calculation result:', requiredInvestmentUSD);
      setRequiredInvestment(requiredInvestmentUSD);
    } catch (err: any) {
      console.error('Error calculating investment:', err); // Log full error
      if (contract && contract.getProvider()) {
        contract.getProvider().getNetwork().then(net => console.log('Provider network (on error):', net));
      }
      // Provide more specific error messages
      if (err.message?.includes('contract')) {
        setError('Smart contract not found. Please ensure the contract is deployed and the address is correct.');
      } else if (err.message?.includes('network')) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (err.message?.includes('gas')) {
        setError('Transaction would fail due to insufficient gas. Please try with different parameters.');
      } else if (err.message?.includes('execution reverted')) {
        setError('Calculation failed. Please check your input values and try again.');
      } else {
        setError(`Failed to calculate investment: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  // Local calculation function that works without blockchain
  const calculateInvestmentLocally = (): number => {
    return calculateInvestmentWithNewFormula(form, averageYieldRate ?? 0, FIXED_INFLATION_RATE);
  };

  // Helper to check if a plan exists for the current user
  const checkPlanExists = async () => {
    if (!contract || !account) return false;
    const plan = await contract.getRetirementPlan(account);
    return !!plan;
  };

  // Helper to create a plan if needed, then deposit funds
  const handleDeposit = async (monthlySpendingUSD: number) => {
    if (!(window as any).ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }
    if (!isConnected || !contract || !account) {
      setError('Please connect your wallet.');
      return;
    }
    if (monthlySpendingUSD <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    setIsCreatingPlan(true);
    setError(null);
    setSuccess(null);
    try {
      console.log("Account:", account);
      // 1. Check if plan exists
      const planExists = await checkPlanExists();
      console.log("Plan exists:", planExists);
      // 2. If not, create the plan
      if (!planExists) {
        const { lifeExpectancyYears, retirementAge, currentAge } = form;
        const yieldRateBps = Math.round((averageYieldRate ?? 0) * 100);
        const inflationRateBps = Math.round(FIXED_INFLATION_RATE * 100);
        try {
          const tx = await contract.createRetirementPlan(
            lifeExpectancyYears,
            monthlySpendingUSD,
            retirementAge,
            currentAge,
            yieldRateBps,
            inflationRateBps
          );
          await tx.wait();
          console.log("Retirement plan created");
        } catch (planErr) {
          const errObj = planErr as Error;
          console.error("Error creating retirement plan:", errObj);
          setError(`Failed to create retirement plan: ${errObj.message || planErr}`);
          setIsCreatingPlan(false);
          return;
        }
      }
      // Log user savings before deposit
      let savings;
      try {
        savings = await contract.getUserSavings(account);
        console.log("User savings:", savings);
      } catch (savingsErr) {
        const errObj = savingsErr as Error;
        console.error("Error fetching user savings:", errObj);
      }
      // 3. Convert USD to ETH (wei) and deposit
      const usdAmountScaled = Math.round(monthlySpendingUSD * 1e8);
      console.log("USD amount scaled:", usdAmountScaled);
      let weiAmount;
      try {
        weiAmount = await contract.usdToWei(usdAmountScaled);
        console.log("Wei amount:", weiAmount);
      } catch (convErr) {
        const errObj = convErr as Error;
        console.error("Error converting USD to Wei:", errObj);
        setError(`Failed to convert USD to Wei: ${errObj.message || convErr}`);
        setIsCreatingPlan(false);
        return;
      }
      try {
        const tx2 = await contract.depositFunds(weiAmount);
        await tx2.wait();
        setSuccess('Deposit successful! Your funds have been added to your retirement plan.');
        setCustomAmount(0);
        console.log("Deposit successful");
      } catch (depErr) {
        const errObj = depErr as Error;
        console.error('Error in deposit flow:', errObj);
        if (errObj.message?.includes('user rejected')) {
          setError('Transaction was cancelled by user.');
        } else if (errObj.message?.includes('insufficient funds')) {
          setError('Insufficient ETH for gas fees or deposit. Please add more ETH to your wallet.');
        } else if (errObj.message?.includes('network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(`Failed to deposit funds: ${errObj.message || 'Unknown error'}`);
        }
        setIsCreatingPlan(false);
        return;
      }
    } finally {
      setIsCreatingPlan(false);
    }
  };

  // Handler for cryptocurrency save buttons
  const handleCryptoSave = async () => {
    if (!(window as any).ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to use this app.');
      return;
    }
    
    if (!isConnected) {
      try {
        await connectWallet();
        setShowWalletContent(true);
      } catch (err: any) {
        setError(err.message || 'Failed to connect wallet.');
      }
    } else {
      setShowWalletContent(true);
    }
  };

  // Handler for help button
  const handleHelpToggle = () => {
    setShowHelpText(!showHelpText);
  };

  // Custom amount button: Earn interest on smaller amount
  const handleCustomAmount = async () => {
    if (customAmount === 0) {
      setError('Please enter a custom amount greater than zero.');
      return;
    }
    await handleDeposit(customAmount);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setCustomAmount(value);
    setError(null); // Clear any previous errors when user starts typing
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateInvestment();
  };

  const inputClass = "w-full px-4 py-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white";

  return (
    <div className="space-y-6">


      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-300">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Life Expectancy After Retirement (years)
            </label>
            <input
              type="number"
              name="lifeExpectancyYears"
              value={form.lifeExpectancyYears}
              onChange={handleChange}
              min="1"
              max="50"
              required
              className={inputClass}
              placeholder="20"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              Desired Monthly Spending After Retirement (USD)
              <Tooltip text="Use today's prices when choosing this value. Pretend that the prices won't change — of course they will, and of course we have taken it into account.">
                <span
                  tabIndex={0}
                  aria-label="What is this?"
                  className="ml-1 text-gray-400 text-base font-normal select-none border border-gray-400 rounded-full p-0.5 w-5 h-5 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  ?
                </span>
              </Tooltip>
            </label>
            <input
              type="number"
              name="monthlySpending"
              value={form.monthlySpending}
              onChange={handleChange}
              min="1"
              required
              className={inputClass}
              placeholder="5000"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Desired Retirement Age
            </label>
            <input
              type="number"
              name="retirementAge"
              value={form.retirementAge}
              onChange={handleChange}
              min="1"
              max="100"
              required
              className={inputClass}
              placeholder="65"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Current Age
            </label>
            <input
              type="number"
              name="currentAge"
              value={form.currentAge}
              onChange={handleChange}
              min="1"
              max="100"
              required
              className={inputClass}
              placeholder="30"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isCalculating}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isCalculating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Calculating...</span>
            </div>
          ) : (
            'Calculate'
          )}
        </button>
      </form>

      {requiredInvestment !== null && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 w-full max-w-none mx-auto">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-0.1 text-center">
          With an average annual consumer price index of 2.54% over the last 30 years, you need
          </h3>
          <p className="text-4xl font-bold text-green-900 dark:text-green-100 text-center">
            ${requiredInvestment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2 text-center">
            to spend ${form.monthlySpending.toLocaleString()} per month at today's prices after retirement. <br />
            This is achievable if you start saving now.
          </h3>

          {/* Bitcoin Price Chart - moved above Calculation details */}
          {/*
          <div className="mb-8">
            <BitcoinPriceChart />
          </div>
          */}

          {/*
          <div className="mt-4 text-sm text-gray-700 dark:text-gray-200">
            <strong>Calculation details:</strong><br />
            Life expectancy after retirement (LEAR): <b>{form.lifeExpectancyYears}</b> years<br />
            Desired monthly spending after retirement (DMSAR): <b>${form.monthlySpending.toLocaleString()}</b><br />
            Desired retirement age (DRA): <b>{form.retirementAge}</b><br />
            Current age (CA): <b>{form.currentAge}</b><br />
            Years until retirement (DRA-CA): <b>{form.retirementAge - form.currentAge}</b><br />
            Average annual consumer price index (AACPI): <b>{FIXED_INFLATION_RATE}%</b> (based on average across last 30 years)<br /><br />
            The amount of money you want to spend during your retirement:
            <BlockMath math={String.raw`\sum_{k=0}^{\text{LEAR}-1} 12 \times \text{DMSAR} \times (1+0.01\,\text{AACPI})^{\text{DRA}-\text{CA}+k}`} />
            Taking into account that you earn interest both before and after retirement, the amount of money you need to stake now is
            <BlockMath math={String.raw`\sum_{k=0}^{\text{LEAR}-1} 12 \times \text{DMSAR} \times \left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AIOYC}}\right)^{\text{DRA}-\text{CA}+k}`} />
            <span className="block mt-2">According to the geometric series sum formula, if AACPI &ne; AIOYC, this sum is equal to</span>
            <BlockMath math={String.raw`12 \times \text{DMSAR} \times \left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AIOYC}}\right)^{\text{DRA}-\text{CA}} \times \frac{1-\left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AIOYC}}\right)^{\text{LEAR}}}{1-\left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AIOYC}}\right)}`}/>
            <span className="block mt-2">If AACPI = AIOYC, then this sum is equal to</span>
            <BlockMath math={String.raw`12 \times \text{DMSAR} \times \left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AIOYC}}\right)^{\text{DRA}-\text{CA}} \times \text{LEAR}`}/>
            <span className="block mt-6 font-semibold">With your values:</span>
            {(() => {
              const DMSAR = form.monthlySpending;
              const LEAR = form.lifeExpectancyYears;
              const DRA = form.retirementAge;
              const CA = form.currentAge;
              const AACPI = FIXED_INFLATION_RATE;
              const AIOYC = Number(averageYieldRate) || 0;
              const yearsUntilRetirement = DRA - CA;
              const ratio = (1 + 0.01 * AACPI) / (1 + 0.01 * AIOYC);
              const ratioPow = Math.pow(ratio, yearsUntilRetirement);
              const ratioPowRounded = Number(ratioPow.toFixed(3));
              const ratioStr = ratioPowRounded.toLocaleString(undefined, { maximumFractionDigits: 3 });
              if (Math.abs(AACPI - AIOYC) < 0.0001) {
                const approx = 12 * DMSAR * ratioPow * LEAR;
                const approxTrunc = Math.trunc(approx);
                return (
                  <>
                    <div className="whitespace-nowrap mt-2 text-center">
                      <InlineMath math={
                        String.raw`12 \times ${DMSAR} \times \left(\frac{1+0.01\times${AACPI}}{1+0.01\times${AIOYC}}\right)^{${DRA}-${CA}} \times ${LEAR} \approx 12 \times ${DMSAR} \times ${ratioStr} \times ${LEAR} \approx ${approxTrunc.toString()}`
                      }/>
                    </div>
                  </>
                );
              } else {
                const ratioPowLEAR = Math.pow(ratio, LEAR);
                const seriesNumerator = 1 - ratioPowLEAR;
                const seriesDenominator = 1 - ratio;
                const series = seriesNumerator / seriesDenominator;
                const seriesRounded = Number(series.toFixed(3));
                const approx = 12 * DMSAR * ratioPow * series;
                const approxTrunc = Math.trunc(approx);
                return (
                  <>
                    <div className="whitespace-nowrap mt-2 text-center">
                      <InlineMath math={
                        String.raw`12 \times ${DMSAR} \times \left(\frac{1+0.01\times${AACPI}}{1+0.01\times${AIOYC}}\right)^{${DRA}-${CA}} \times \frac{1-\left(\frac{1+0.01\times${AACPI}}{1+0.01\times${AIOYC}}\right)^{${LEAR}}}{1-\left(\frac{1+0.01\times${AACPI}}{1+0.01\times${AIOYC}}\right)} \approx 12 \times ${DMSAR} \times ${ratioStr} \times ${seriesRounded} \approx ${approxTrunc.toString()}`
                      }/>
                    </div>
                  </>
                );
              }
            })()}
          </div>
          */}
          
          <div className="mt-8 space-y-3">
            <button
              onClick={handleCryptoSave}
              disabled={isCreatingPlan}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isCreatingPlan ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Retirement Plan...</span>
                </div>
              ) : (
                `Save in Bitcoin`
              )}
            </button>
            
            <button
              onClick={handleCryptoSave}
              disabled={isCreatingPlan}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isCreatingPlan ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Save in Ethereum'
              )}
            </button>
            
            <button
              onClick={handleCryptoSave}
              disabled={isCreatingPlan}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isCreatingPlan ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Save in PendleFinance principal tokens'
              )}
            </button>
            
            <button
              onClick={handleCryptoSave}
              disabled={isCreatingPlan}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isCreatingPlan ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Save in Solana'
              )}
            </button>
            
            <button
              onClick={handleHelpToggle}
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {showHelpText ? 'Hide the help text' : 'Help me with the decision'}
            </button>
          </div>
          
          {/* Help Text */}
          {showHelpText && (
            <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-blue-700 dark:text-blue-200">
              <b>Bitcoin</b> is the first and most well-known cryptocurrency, created by the pseudonymous Satoshi Nakamoto in 2009. It is a decentralized digital currency that enables peer-to-peer transactions without the need for intermediaries like banks. Bitcoin's supply is capped at 21 million coins, introducing a deflationary economic model. It uses a proof-of-work consensus mechanism, where miners validate transactions and secure the network. Bitcoin is primarily used as a store of value and is often referred to as "digital gold."
              </p>
              
              {/* Bitcoin Price Chart */}
              <div className="mt-8">
                <BitcoinPriceChart />
              </div>
              <br /><br />
              <p className="text-blue-700 dark:text-blue-200">
              <b>Ethereum</b> is a decentralized, open-source blockchain that introduced smart contracts—programmable agreements that execute automatically. Launched in 2015 by Vitalik Buterin and others, Ethereum enables developers to build decentralized applications (dApps) on its platform. It transitioned from proof-of-work to proof-of-stake in 2022 via "The Merge," making it more energy-efficient. Ether (ETH) is the native currency, used for transaction fees, staking, and governance. Ethereum is the backbone of DeFi, NFTs, DAOs, and many Web3 innovations.
              <br /><br />
              <b>Pendle Finance</b> is a DeFi protocol that splits yield-bearing tokens into two parts: principal tokens (PT) and yield tokens (YT). Principal tokens represent the base value of the underlying asset and are redeemable for 1:1 at maturity. They trade at a discount before maturity, allowing users to earn fixed yields by buying PTs and holding them to term. This mechanism enables secondary market interest rate trading and fixed-income strategies in DeFi. PTs are essential to Pendle’s mission of creating a yield-centric ecosystem for tokenized interest.
              <br /><br />
              <b>Solana</b> is a high-performance blockchain designed for fast, low-cost decentralized applications and crypto transactions. It uses a unique consensus mechanism combining proof-of-stake with proof-of-history, enabling it to handle thousands of transactions per second. Launched in 2020, Solana has attracted a wide range of DeFi, NFT, and gaming projects. Despite occasional network outages, its scalability and low fees make it a popular alternative to Ethereum. SOL is the native token used for staking, transaction fees, and governance.
              </p>
            </div>
          )}
          
          {/* Wallet and Dashboard Content */}
          {showWalletContent && isConnected && (
            <div className="mt-8 space-y-8">
              {/* Dashboard Section */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h3>
                </div>
                <RetirementDashboard formData={form} averageYieldRate={averageYieldRate ?? undefined} />
              </div>

              {/* Wallet Section */}
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
            </div>
          )}
          
          {/*
          <div className="mt-4 flex gap-4 items-end">
            <button
              onClick={handleCustomAmount}
              disabled={isCreatingPlan}
              className="w-1/2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isCreatingPlan ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Earn interest on smaller amount'
              )}
            </button>
            
            <div className="w-1/2 space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Custom Amount (USD)
              </label>
              <input
                type="number"
                name="customAmount"
                value={customAmount}
                onChange={handleCustomAmountChange}
                min="1"
                className={inputClass}
                placeholder="Enter amount"
              />
            </div>
          </div>
          */}
          
        </div>
      )}
    </div>
  );
};

export default RetirementCalculator; 