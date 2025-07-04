import { ethers } from 'ethers';

// PensionCalculator ABI - only the functions we need for the frontend
export const PENSION_CALCULATOR_ABI = [
  // View functions
  "function getPensionPlan(address user) external view returns (tuple(uint256 lifeExpectancyYears, uint256 monthlySpendingUSD, uint256 retirementAge, uint256 currentAge, uint256 expectedYieldRate, uint256 inflationRate, bool isActive))",
  "function getUserSavings(address user) external view returns (tuple(uint256 totalDeposited, uint256 targetAmount, bool paymentsStarted, uint256 lastPaymentTime, uint256 paymentsRemaining, uint256 totalPaidOut))",
  "function getRequiredInvestment(address user) external view returns (uint256)",
  "function hasReachedTarget(address user) external view returns (bool)",
  "function getRemainingAmount(address user) external view returns (uint256)",
  "function getEthUsdPrice() external view returns (uint256)",
  "function weiToUsd(uint256 weiAmount) external view returns (uint256)",
  "function usdToWei(uint256 usdAmount) external view returns (uint256)",
  "function calculateMonthlyPayment(uint256 investmentAmountUSD, uint256 lifeExpectancyYears, uint256 yieldRate, uint256 inflationRate) external view returns (uint256)",
  
  // State changing functions
  "function createPensionPlan(uint256 lifeExpectancyYears, uint256 monthlySpendingUSD, uint256 retirementAge, uint256 currentAge, uint256 yieldRate, uint256 inflationRate) external",
  "function updatePensionPlan(uint256 lifeExpectancyYears, uint256 monthlySpendingUSD, uint256 retirementAge, uint256 currentAge, uint256 yieldRate, uint256 inflationRate) external",
  "function depositFunds() external payable",
  "function executeMonthlyPayment(address user) external",
  "function deactivatePensionPlan() external",
  "function withdrawFunds() external",
  
  // Events
  "event PensionPlanCreated(address indexed user, uint256 requiredInvestment)",
  "event PensionPlanUpdated(address indexed user, uint256 newRequiredInvestment)",
  "event FundsDeposited(address indexed user, uint256 amount, uint256 totalDeposited, uint256 targetAmount)",
  "event TargetReached(address indexed user, uint256 targetAmount)",
  "event MonthlyPaymentSent(address indexed user, uint256 amount, uint256 paymentsRemaining)",
  "event PaymentsCompleted(address indexed user, uint256 totalPaidOut)"
];

export interface PensionPlan {
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

export class PensionContract {
  private contract: ethers.Contract;
  private provider: ethers.providers.Web3Provider;

  constructor(contractAddress: string, provider: ethers.providers.Web3Provider) {
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, PENSION_CALCULATOR_ABI, provider);
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

  // Get pension plan for a user
  async getPensionPlan(userAddress: string): Promise<PensionPlan | null> {
    try {
      const plan = await this.contract.getPensionPlan(userAddress);
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
      console.error('Error fetching pension plan:', error);
      return null;
    }
  }

  // Get user savings
  async getUserSavings(userAddress: string): Promise<UserSavings | null> {
    try {
      const savings = await this.contract.getUserSavings(userAddress);
      
      return {
        totalDeposited: this.weiToUsdScaled(savings.totalDeposited.toNumber()),
        targetAmount: this.weiToUsdScaled(savings.targetAmount.toNumber()),
        paymentsStarted: savings.paymentsStarted,
        lastPaymentTime: savings.lastPaymentTime.toNumber(),
        paymentsRemaining: savings.paymentsRemaining.toNumber(),
        totalPaidOut: this.weiToUsdScaled(savings.totalPaidOut.toNumber())
      };
    } catch (error) {
      console.error('Error fetching user savings:', error);
      return null;
    }
  }

  // Get dashboard data
  async getDashboardData(userAddress: string): Promise<DashboardData | null> {
    try {
      const [pensionPlan, userSavings, hasReachedTarget] = await Promise.all([
        this.getPensionPlan(userAddress),
        this.getUserSavings(userAddress),
        this.contract.hasReachedTarget(userAddress)
      ]);

      if (!pensionPlan || !userSavings) {
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
        monthlyPayment: pensionPlan.monthlySpendingUSD,
        nextPaymentDate,
        totalPaymentsReceived: pensionPlan.lifeExpectancyYears * 12 - userSavings.paymentsRemaining,
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
      const requiredInvestmentWei = await this.contract.calculateRequiredInvestment(
        lifeExpectancyYears,
        monthlySpendingScaled,
        retirementAge,
        currentAge,
        yieldRateBps,
        inflationRateBps
      );
      
      // Convert wei to USD
      return this.weiToUsdScaled(requiredInvestmentWei.toNumber());
    } catch (error) {
      console.error('Error calculating required investment:', error);
      throw error;
    }
  }

  // Create pension plan
  async createPensionPlan(
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
    
    return contract.createPensionPlan(
      lifeExpectancyYears,
      monthlySpendingScaled,
      retirementAge,
      currentAge,
      yieldRate,
      inflationRate
    );
  }

  // Deposit funds
  async depositFunds(amountInEth: number): Promise<ethers.ContractTransaction> {
    const signer = this.getSigner();
    const contract = this.contract.connect(signer);
    
    const amountInWei = ethers.utils.parseEther(amountInEth.toString());
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
}

// Contract address - this should be updated with the actual deployed contract address
export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// Create contract instance
export const createPensionContract = (provider: ethers.providers.Web3Provider): PensionContract => {
  return new PensionContract(CONTRACT_ADDRESS, provider);
}; 