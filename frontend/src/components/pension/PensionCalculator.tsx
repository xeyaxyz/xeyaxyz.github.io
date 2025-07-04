import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { useWallet } from '../../context/WalletContext';
import { CONTRACT_ADDRESS } from '../../utils/contract';
import { createPortal } from 'react-dom';
import { BlockMath, InlineMath } from 'react-katex';

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

interface PensionForm {
  lifeExpectancyYears: number;
  monthlySpending: number;
  retirementAge: number;
  currentAge: number;
}

const defaultForm: PensionForm = {
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
  return 5.2; // Example: 5.2% annual yield
}

const FIXED_INFLATION_RATE = 2.54; // 2.54% average inflation



// New calculation function based on the specified formula
function calculateInvestmentWithNewFormula(form: PensionForm, averageYieldRate: number, inflationRate: number): number {
  const { lifeExpectancyYears, monthlySpending, retirementAge, currentAge } = form;
  const yearsUntilRetirement = retirementAge - currentAge;
  
  // Convert percentages to decimals
  const aaroi = averageYieldRate / 100;
  const aacpi = inflationRate / 100;
  
  // Calculate the ratio (1 + AACPI) / (1 + AAROI)
  const ratio = (1 + aacpi) / (1 + aaroi);
  
  let requiredInvestment: number;
  
  if (Math.abs(aacpi - aaroi) < 0.0001) {
    // If AACPI = AAROI, use the simplified formula
    requiredInvestment = 12 * monthlySpending * Math.pow(ratio, yearsUntilRetirement) * lifeExpectancyYears;
  } else {
    // If AACPI ≠ AAROI, use the geometric series formula
    const numerator = 1 - Math.pow(ratio, lifeExpectancyYears);
    const denominator = 1 - ratio;
    requiredInvestment = 12 * monthlySpending * Math.pow(ratio, yearsUntilRetirement) * (numerator / denominator);
  }
  
  return Math.round(requiredInvestment);
}

const PensionCalculator: React.FC = () => {
  const { isConnected, contract, account } = useWallet();
  const [form, setForm] = useState<PensionForm>(defaultForm);
  const [requiredInvestment, setRequiredInvestment] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [averageYieldRate, setAverageYieldRate] = useState<number | null>(null);

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
      console.error('Error calculating investment:', err);
      
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

  const createPensionPlan = async () => {
    // Check if MetaMask is installed
    if (!(window as any).ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to create a retirement plan.');
      return;
    }

    // Check if wallet is connected
    if (!isConnected || !contract || !account) {
      setError('Please connect your wallet to create a retirement plan.');
      return;
    }

    if (requiredInvestment === null) {
      setError('Please calculate the required investment first.');
      return;
    }

    // Check if contract is deployed
    if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setError('Smart contract is not deployed. Please deploy the PensionCalculator contract first to create retirement plans.');
      return;
    }

    setIsCreatingPlan(true);
    setError(null);
    
    try {
      const { lifeExpectancyYears, monthlySpending, retirementAge, currentAge } = form;
      
      // Create the pension plan
      const yieldRateBps = Math.round((averageYieldRate ?? 0) * 100);
      const inflationRateBps = Math.round(FIXED_INFLATION_RATE * 100);
      const tx = await contract.createPensionPlan(
        lifeExpectancyYears,
        monthlySpending,
        retirementAge,
        currentAge,
        yieldRateBps,
        inflationRateBps
      );
      
      // Wait for transaction confirmation
      await tx.wait();
      
      setSuccess('Retirement plan created successfully! You can now deposit funds to reach your target.');
      setRequiredInvestment(null); // Clear the result to encourage new calculations
    } catch (err: any) {
      console.error('Error creating retirement plan:', err);
      
      // Provide specific error messages
      if (err.message?.includes('user rejected')) {
        setError('Transaction was cancelled by user.');
      } else if (err.message?.includes('insufficient funds')) {
        setError('Insufficient ETH for gas fees. Please add more ETH to your wallet.');
      } else if (err.message?.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(`Failed to create retirement plan: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsCreatingPlan(false);
    }
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
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
            Required Amount
          </h3>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            ${requiredInvestment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 text-sm text-gray-700 dark:text-gray-200">
            <strong>Calculation details:</strong><br />
            Life expectancy after retirement (LEAR): <b>{form.lifeExpectancyYears}</b> years<br />
            Desired monthly spending after retirement (DMSAR): <b>${form.monthlySpending.toLocaleString()}</b><br />
            Desired retirement age (DRA): <b>{form.retirementAge}</b><br />
            Current age (CA): <b>{form.currentAge}</b><br />
            Years until retirement (DRA-CA): <b>{form.retirementAge - form.currentAge}</b><br />
            Average annual interest on yield farming (AAROI): <b>{averageYieldRate?.toFixed(2)}%</b> (based on average across last 5 years)<br />
            Average annual consumer price index (AACPI): <b>{FIXED_INFLATION_RATE}%</b> (based on average across last 30 years)<br /><br />
            The amount of money you want to spend during your retirement:
            <BlockMath math={String.raw`\sum_{k=0}^{\text{LEAR}-1} 12 \times \text{DMSAR} \times (1+0.01\,\text{AACPI})^{\text{DRA}-\text{CA}+k}`} />
            Taking into account that you earn interest both before and after retirement, the amount of money you need to stake now is
            <BlockMath math={String.raw`\sum_{k=0}^{\text{LEAR}-1} 12 \times \text{DMSAR} \times \left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AAROI}}\right)^{\text{DRA}-\text{CA}+k}`} />
            <span className="block mt-2">According to the geometric series sum formula, if AACPI &ne; AAROI, this sum is equal to</span>
            <BlockMath math={String.raw`12 \times \text{DMSAR} \times \left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AAROI}}\right)^{\text{DRA}-\text{CA}} \times \frac{1-\left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AAROI}}\right)^{\text{LEAR}}}{1-\left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AAROI}}\right)}`}/>
            <span className="block mt-2">If AACPI = AAROI, then this sum is equal to</span>
            <BlockMath math={String.raw`12 \times \text{DMSAR} \times \left(\frac{1+0.01\,\text{AACPI}}{1+0.01\,\text{AAROI}}\right)^{\text{DRA}-\text{CA}} \times \text{LEAR}`}/>

            {/* Substitution with user values, only show the relevant formula and numeric evaluation */}
            <span className="block mt-6 font-semibold">With your values:</span>
            {(() => {
              const DMSAR = form.monthlySpending;
              const LEAR = form.lifeExpectancyYears;
              const DRA = form.retirementAge;
              const CA = form.currentAge;
              const AACPI = FIXED_INFLATION_RATE;
              const AAROI = Number(averageYieldRate) || 0;
              const yearsUntilRetirement = DRA - CA;
              const ratio = (1 + 0.01 * AACPI) / (1 + 0.01 * AAROI);
              const ratioPow = Math.pow(ratio, yearsUntilRetirement);
              const ratioPowRounded = Number(ratioPow.toFixed(3));
              const ratioStr = ratioPowRounded.toLocaleString(undefined, { maximumFractionDigits: 3 });
              if (Math.abs(AACPI - AAROI) < 0.0001) {
                const approx = 12 * DMSAR * ratioPow * LEAR;
                const approxTrunc = Math.trunc(approx);
                return (
                  <>
                    <div className="whitespace-nowrap mt-2 text-center">
                      <InlineMath math={
                        String.raw`12 \times ${DMSAR} \times \left(\frac{1+0.01\times${AACPI}}{1+0.01\times${AAROI}}\right)^{${DRA}-${CA}} \times ${LEAR} \approx 12 \times ${DMSAR} \times ${ratioStr} \times ${LEAR} \approx ${approxTrunc.toString()}`
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
                        String.raw`12 \times ${DMSAR} \times \left(\frac{1+0.01\times${AACPI}}{1+0.01\times${AAROI}}\right)^{${DRA}-${CA}} \times \frac{1-\left(\frac{1+0.01\times${AACPI}}{1+0.01\times${AAROI}}\right)^{${LEAR}}}{1-\left(\frac{1+0.01\times${AACPI}}{1+0.01\times${AAROI}}\right)} \approx 12 \times ${DMSAR} \times ${ratioStr} \times ${seriesRounded} \approx ${approxTrunc.toString()}`
                      }/>
                    </div>
                  </>
                );
              }
            })()}
          </div>
          
          <div className="mt-8">
            <button
              onClick={createPensionPlan}
              disabled={isCreatingPlan}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isCreatingPlan ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Retirement Plan...</span>
                </div>
              ) : (
                'Earn interest'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PensionCalculator; 