import { ethers } from 'ethers';

// RetirementCalculator ABI - full ABI from artifacts
export const RETIREMENT_CALCULATOR_ABI = [
  {"inputs":[{"internalType":"address","name":"_ethUsdPriceFeed","type":"address"},{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},
  {"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalDeposited","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"targetAmount","type":"uint256"}],"name":"FundsDeposited","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"paymentsRemaining","type":"uint256"}],"name":"MonthlyPaymentSent","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalPaidOut","type":"uint256"}],"name":"PaymentsCompleted","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"blockNumber","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"ethPriceUSD","type":"uint256"}],"name":"PriceFeedUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"requiredInvestment","type":"uint256"}],"name":"RetirementPlanCreated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"newRequiredInvestment","type":"uint256"}],"name":"RetirementPlanUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetAmount","type":"uint256"}],"name":"TargetReached","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"yieldRate","type":"uint256"}],"name":"YieldRateUpdated","type":"event"},
  {"inputs":[],"name":"BASIS_POINTS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"createRetirementPlan","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"lifeExpectancyYears","type":"uint256"},{"internalType":"uint256","name":"monthlySpendingUSD","type":"uint256"},{"internalType":"uint256","name":"retirementAge","type":"uint256"},{"internalType":"uint256","name":"currentAge","type":"uint256"},{"internalType":"uint256","name":"yieldRate","type":"uint256"},{"internalType":"uint256","name":"inflationRate","type":"uint256"}],"name":"updateRetirementPlan","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"depositFunds","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"executeMonthlyPayment","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"deactivateRetirementPlan","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"withdrawFunds","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getRetirementPlan","outputs":[{"internalType":"uint256","name":"lifeExpectancyYears","type":"uint256"},{"internalType":"uint256","name":"monthlySpendingUSD","type":"uint256"},{"internalType":"uint256","name":"retirementAge","type":"uint256"},{"internalType":"uint256","name":"currentAge","type":"uint256"},{"internalType":"uint256","name":"expectedYieldRate","type":"uint256"},{"internalType":"uint256","name":"inflationRate","type":"uint256"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserSavings","outputs":[{"internalType":"uint256","name":"totalDeposited","type":"uint256"},{"internalType":"uint256","name":"targetAmount","type":"uint256"},{"internalType":"bool","name":"paymentsStarted","type":"bool"},{"internalType":"uint256","name":"lastPaymentTime","type":"uint256"},{"internalType":"uint256","name":"paymentsRemaining","type":"uint256"},{"internalType":"uint256","name":"totalPaidOut","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getRequiredInvestment","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"hasReachedTarget","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getRemainingAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getEthUsdPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"weiAmount","type":"uint256"}],"name":"weiToUsd","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"usdAmount","type":"uint256"}],"name":"usdToWei","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"investmentAmountUSD","type":"uint256"},{"internalType":"uint256","name":"lifeExpectancyYears","type":"uint256"},{"internalType":"uint256","name":"yieldRate","type":"uint256"},{"internalType":"uint256","name":"inflationRate","type":"uint256"}],"name":"calculateMonthlyPayment","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

export interface RetirementPlan {
  lifeExpectancyYears: number;
  monthlySpendingUSD: number;
  retirementAge: number;
  currentAge: number;
  expectedYieldRate: number;
  inflationRate: number;
  isActive: boolean;
}

export interface UserSavings {
  totalDeposited: number;
  targetAmount: number;
  paymentsStarted: boolean;
  lastPaymentTime: number;
  paymentsRemaining: number;
  totalPaidOut: number;
}

export interface DashboardData {
  currentSavings: number;
  targetAmount: number;
  monthlyPayment: number;
  nextPaymentDate: string | null;
  totalPaymentsReceived: number;
  progressPercentage: number;
  hasReachedTarget: boolean;
  paymentsStarted: boolean;
}

export class RetirementContract {
  private contract: ethers.Contract;
  private provider: ethers.providers.Web3Provider;

  constructor(contractAddress: string, provider: ethers.providers.Web3Provider) {
    console.log('RetirementContract instantiated with address:', contractAddress);
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, RETIREMENT_CALCULATOR_ABI, provider);
  }

  // Get signer for transactions
  private getSigner() {
    return this.provider.getSigner();
  }

  // Convert wei to USD (scaled by 10^8)
  private weiToUsdScaled(weiAmount: number): number {
    return weiAmount / 1e10; // Convert wei to USD (wei has 18 decimals, USD has 8 decimals)
  }

  // Convert USD (scaled by 10^8) to regular USD
  private usdScaledToRegular(usdScaled: number): number {
    return usdScaled / 1e8;
  }

  // Get retirement plan for a user
  async getRetirementPlan(userAddress: string): Promise<RetirementPlan | null> {
    try {
      const plan = await this.contract.getRetirementPlan(userAddress);
      if (!plan.isActive) return null;
      
      return {
        lifeExpectancyYears: plan.lifeExpectancyYears.toNumber(),
        monthlySpendingUSD: this.usdScaledToRegular(plan.monthlySpendingUSD.toNumber()),
        retirementAge: plan.retirementAge.toNumber(),
        currentAge: plan.currentAge.toNumber(),
        expectedYieldRate: plan.expectedYieldRate.toNumber(),
        inflationRate: plan.inflationRate.toNumber(),
        isActive: plan.isActive
      };
    } catch (error) {
      console.error('Error fetching retirement plan:', error);
      return null;
    }
  }

  // Get user savings
  async getUserSavings(userAddress: string): Promise<UserSavings | null> {
    try {
      const savings = await this.contract.getUserSavings(userAddress);
      
      return {
        totalDeposited: this.weiToUsdScaled(Number(savings.totalDeposited.toString())),
        targetAmount: this.weiToUsdScaled(Number(savings.targetAmount.toString())),
        paymentsStarted: savings.paymentsStarted,
        lastPaymentTime: Number(savings.lastPaymentTime.toString()),
        paymentsRemaining: Number(savings.paymentsRemaining.toString()),
        totalPaidOut: this.weiToUsdScaled(Number(savings.totalPaidOut.toString()))
      };
    } catch (error) {
      console.error('Error fetching user savings:', error);
      return null;
    }
  }

  // Get dashboard data
  async getDashboardData(userAddress: string): Promise<DashboardData | null> {
    try {
      const [retirementPlan, userSavings, hasReachedTarget] = await Promise.all([
        this.getRetirementPlan(userAddress),
        this.getUserSavings(userAddress),
        this.contract.hasReachedTarget(userAddress)
      ]);

      if (!retirementPlan || !userSavings) {
        return null;
      }

      const progressPercentage = (userSavings.totalDeposited / userSavings.targetAmount) * 100;
      
      // Calculate next payment date if payments have started
      let nextPaymentDate: string | null = null;
      if (userSavings.paymentsStarted && userSavings.paymentsRemaining > 0) {
        const lastPaymentTime = userSavings.lastPaymentTime * 1000; // Convert to milliseconds
        const nextPaymentTime = lastPaymentTime + (30 * 24 * 60 * 60 * 1000); // Add 30 days
        nextPaymentDate = new Date(nextPaymentTime).toISOString().split('T')[0];
      }

      return {
        currentSavings: userSavings.totalDeposited,
        targetAmount: userSavings.targetAmount,
        monthlyPayment: retirementPlan.monthlySpendingUSD,
        nextPaymentDate,
        totalPaymentsReceived: retirementPlan.lifeExpectancyYears * 12 - userSavings.paymentsRemaining,
        progressPercentage,
        hasReachedTarget,
        paymentsStarted: userSavings.paymentsStarted
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }
  }

  // Calculate required investment using smart contract
  async calculateRequiredInvestment(
    lifeExpectancyYears: number,
    monthlySpendingUSD: number,
    retirementAge: number,
    currentAge: number,
    yieldRateBps: number,
    inflationRateBps: number
  ): Promise<number> {
    try {
      // Convert monthly spending to scaled USD (multiply by 10^8)
      const monthlySpendingScaled = Math.floor(monthlySpendingUSD * 1e8);
      // Call the smart contract to calculate required investment
      const result = await this.contract.callStatic.calculateRequiredInvestment(
        lifeExpectancyYears,
        monthlySpendingScaled,
        retirementAge,
        currentAge,
        yieldRateBps,
        inflationRateBps
      );
      // result is a BigNumber
      return this.weiToUsdScaled(Number(result.toString()));
    } catch (error) {
      console.error('Error calculating required investment:', error);
      throw error;
    }
  }

  // Create retirement plan
  async createRetirementPlan(
    lifeExpectancyYears: number,
    monthlySpendingUSD: number,
    retirementAge: number,
    currentAge: number,
    yieldRate: number,
    inflationRate: number
  ): Promise<ethers.ContractTransaction> {
    const signer = this.getSigner();
    const contract = this.contract.connect(signer);
    
    // Convert monthly spending to scaled USD (multiply by 10^8)
    const monthlySpendingScaled = Math.floor(monthlySpendingUSD * 1e8);
    
    return contract.createRetirementPlan(
      lifeExpectancyYears,
      monthlySpendingScaled,
      retirementAge,
      currentAge,
      yieldRate,
      inflationRate
    );
  }

  // Deposit funds
  async depositFunds(amountInWei: string): Promise<ethers.ContractTransaction> {
    const signer = this.getSigner();
    const contract = this.contract.connect(signer);
    return contract.depositFunds({ value: amountInWei });
  }

  // Execute monthly payment
  async executeMonthlyPayment(userAddress: string): Promise<ethers.ContractTransaction> {
    const signer = this.getSigner();
    const contract = this.contract.connect(signer);
    
    return contract.executeMonthlyPayment(userAddress);
  }

  // Get ETH/USD price
  async getEthUsdPrice(): Promise<number> {
    try {
      const price = await this.contract.getEthUsdPrice();
      return this.usdScaledToRegular(price.toNumber());
    } catch (error) {
      console.error('Error fetching ETH/USD price:', error);
      return 0;
    }
  }

  // Convert USD (scaled by 1e8) to Wei using the contract's usdToWei function
  async usdToWei(usdAmountScaled: number): Promise<string> {
    try {
      const weiAmount = await this.contract.usdToWei(usdAmountScaled);
      return weiAmount.toString();
    } catch (error) {
      console.error('Error converting USD to Wei:', error);
      throw error;
    }
  }

  // Public getter for provider (for debugging)
  public getProvider() {
    return this.provider;
  }
}

// Contract address - this should be updated with the actual deployed contract address
export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// Create contract instance
export const createRetirementContract = (provider: ethers.providers.Web3Provider): RetirementContract => {
  return new RetirementContract(CONTRACT_ADDRESS, provider);
}; 