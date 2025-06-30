// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PensionCalculator
 * @dev Smart contract for calculating required investment amount for pension planning
 * using Pendle Finance yield-bearing instruments with automatic monthly payments
 */
contract PensionCalculator is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Struct to store pension plan parameters
    struct PensionPlan {
        uint256 lifeExpectancyYears;     // Life expectancy after retirement in years
        uint256 monthlySpending;         // Required monthly spending in wei
        uint256 retirementAge;           // Age at retirement
        uint256 currentAge;              // Current age
        uint256 expectedYieldRate;       // Expected annual yield rate (in basis points, e.g., 500 = 5%)
        uint256 inflationRate;           // Expected annual inflation rate (in basis points)
        bool isActive;                   // Whether the plan is active
    }

    // Struct to track user savings and payment status
    struct UserSavings {
        uint256 totalDeposited;          // Total amount deposited by user
        uint256 targetAmount;            // Target amount needed for retirement
        bool paymentsStarted;            // Whether monthly payments have started
        uint256 lastPaymentTime;         // Timestamp of last payment
        uint256 paymentsRemaining;       // Number of payments remaining
        uint256 totalPaidOut;            // Total amount paid out so far
    }

    // Mapping from user address to their pension plan
    mapping(address => PensionPlan) public pensionPlans;
    
    // Mapping from user address to their savings info
    mapping(address => UserSavings) public userSavings;
    
    // Mapping to store historical yield rates from Pendle Finance
    mapping(uint256 => uint256) public historicalYields; // timestamp => yield rate
    
    // Events
    event PensionPlanCreated(address indexed user, uint256 requiredInvestment);
    event PensionPlanUpdated(address indexed user, uint256 newRequiredInvestment);
    event YieldRateUpdated(uint256 timestamp, uint256 yieldRate);
    event FundsDeposited(address indexed user, uint256 amount, uint256 totalDeposited, uint256 targetAmount);
    event TargetReached(address indexed user, uint256 targetAmount);
    event MonthlyPaymentSent(address indexed user, uint256 amount, uint256 paymentsRemaining);
    event PaymentsCompleted(address indexed user, uint256 totalPaidOut);
    
    // Constants
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public constant MONTHS_PER_YEAR = 12;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant SECONDS_PER_MONTH = 30 days; // Approximate
    
    // Default parameters
    uint256 public defaultYieldRate = 500; // 5% default annual yield
    uint256 public defaultInflationRate = 200; // 2% default annual inflation
    
    // Contract state
    uint256 public totalFundsUnderManagement;
    uint256 public totalPaymentsProcessed;
    
    constructor() {
        // Initialize with current timestamp
        historicalYields[block.timestamp] = defaultYieldRate;
    }

    /**
     * @dev Calculate the required investment amount for a pension plan
     * @param lifeExpectancyYears Life expectancy after retirement in years
     * @param monthlySpending Required monthly spending in wei
     * @param retirementAge Age at retirement
     * @param currentAge Current age
     * @param yieldRate Expected annual yield rate (in basis points)
     * @param inflationRate Expected annual inflation rate (in basis points)
     * @return requiredInvestment The required investment amount in wei
     */
    function calculateRequiredInvestment(
        uint256 lifeExpectancyYears,
        uint256 monthlySpending,
        uint256 retirementAge,
        uint256 currentAge,
        uint256 yieldRate,
        uint256 inflationRate
    ) public pure returns (uint256 requiredInvestment) {
        require(lifeExpectancyYears > 0, "Life expectancy must be greater than 0");
        require(monthlySpending > 0, "Monthly spending must be greater than 0");
        require(retirementAge > currentAge, "Retirement age must be greater than current age");
        require(yieldRate <= BASIS_POINTS, "Yield rate cannot exceed 100%");
        require(inflationRate <= BASIS_POINTS, "Inflation rate cannot exceed 100%");
        
        // Calculate years until retirement
        uint256 yearsUntilRetirement = retirementAge.sub(currentAge);
        
        // Calculate total months of retirement
        uint256 totalRetirementMonths = lifeExpectancyYears.mul(MONTHS_PER_YEAR);
        
        // Calculate the real yield rate (nominal yield - inflation)
        uint256 realYieldRate;
        if (yieldRate > inflationRate) {
            realYieldRate = yieldRate.sub(inflationRate);
        } else {
            realYieldRate = 0; // If inflation is higher than yield, we can't maintain purchasing power
        }
        
        // Calculate the present value of all future monthly payments
        uint256 totalRequiredAmount = 0;
        
        for (uint256 month = 0; month < totalRetirementMonths; month++) {
            // Calculate the future value of monthly spending adjusted for inflation
            uint256 futureMonthlySpending = monthlySpending;
            if (inflationRate > 0) {
                uint256 inflationMultiplier = calculateInflationMultiplier(inflationRate, month);
                futureMonthlySpending = monthlySpending.mul(inflationMultiplier).div(BASIS_POINTS);
            }
            
            // Calculate the present value of this future payment
            uint256 presentValue = calculatePresentValue(
                futureMonthlySpending,
                realYieldRate,
                yearsUntilRetirement.mul(MONTHS_PER_YEAR).add(month)
            );
            
            totalRequiredAmount = totalRequiredAmount.add(presentValue);
        }
        
        return totalRequiredAmount;
    }

    /**
     * @dev Calculate inflation multiplier for a given number of months
     * @param inflationRate Annual inflation rate in basis points
     * @param months Number of months
     * @return multiplier The inflation multiplier
     */
    function calculateInflationMultiplier(uint256 inflationRate, uint256 months) 
        public pure returns (uint256 multiplier) {
        uint256 monthlyInflationRate = inflationRate.mul(months).div(MONTHS_PER_YEAR);
        multiplier = BASIS_POINTS.add(monthlyInflationRate);
    }

    /**
     * @dev Calculate present value of a future payment
     * @param futureValue Future payment amount
     * @param annualRate Annual discount rate in basis points
     * @param months Number of months in the future
     * @return presentValue The present value
     */
    function calculatePresentValue(uint256 futureValue, uint256 annualRate, uint256 months) 
        public pure returns (uint256 presentValue) {
        if (annualRate == 0) {
            return futureValue;
        }
        
        uint256 monthlyRate = annualRate.div(MONTHS_PER_YEAR);
        uint256 discountFactor = BASIS_POINTS;
        
        for (uint256 i = 0; i < months; i++) {
            discountFactor = discountFactor.mul(BASIS_POINTS).div(BASIS_POINTS.add(monthlyRate));
        }
        
        presentValue = futureValue.mul(discountFactor).div(BASIS_POINTS);
    }

    /**
     * @dev Create a new pension plan for the caller
     * @param lifeExpectancyYears Life expectancy after retirement in years
     * @param monthlySpending Required monthly spending in wei
     * @param retirementAge Age at retirement
     * @param currentAge Current age
     * @param yieldRate Expected annual yield rate (in basis points)
     * @param inflationRate Expected annual inflation rate (in basis points)
     */
    function createPensionPlan(
        uint256 lifeExpectancyYears,
        uint256 monthlySpending,
        uint256 retirementAge,
        uint256 currentAge,
        uint256 yieldRate,
        uint256 inflationRate
    ) external {
        uint256 requiredInvestment = calculateRequiredInvestment(
            lifeExpectancyYears,
            monthlySpending,
            retirementAge,
            currentAge,
            yieldRate,
            inflationRate
        );
        
        pensionPlans[msg.sender] = PensionPlan({
            lifeExpectancyYears: lifeExpectancyYears,
            monthlySpending: monthlySpending,
            retirementAge: retirementAge,
            currentAge: currentAge,
            expectedYieldRate: yieldRate,
            inflationRate: inflationRate,
            isActive: true
        });

        // Initialize user savings tracking
        userSavings[msg.sender] = UserSavings({
            totalDeposited: 0,
            targetAmount: requiredInvestment,
            paymentsStarted: false,
            lastPaymentTime: 0,
            paymentsRemaining: lifeExpectancyYears.mul(MONTHS_PER_YEAR),
            totalPaidOut: 0
        });
        
        emit PensionPlanCreated(msg.sender, requiredInvestment);
    }

    /**
     * @dev Update an existing pension plan
     * @param lifeExpectancyYears New life expectancy after retirement in years
     * @param monthlySpending New required monthly spending in wei
     * @param retirementAge New age at retirement
     * @param currentAge New current age
     * @param yieldRate New expected annual yield rate (in basis points)
     * @param inflationRate New expected annual inflation rate (in basis points)
     */
    function updatePensionPlan(
        uint256 lifeExpectancyYears,
        uint256 monthlySpending,
        uint256 retirementAge,
        uint256 currentAge,
        uint256 yieldRate,
        uint256 inflationRate
    ) external {
        require(pensionPlans[msg.sender].isActive, "No active pension plan found");
        require(!userSavings[msg.sender].paymentsStarted, "Cannot update plan after payments started");
        
        uint256 requiredInvestment = calculateRequiredInvestment(
            lifeExpectancyYears,
            monthlySpending,
            retirementAge,
            currentAge,
            yieldRate,
            inflationRate
        );
        
        pensionPlans[msg.sender] = PensionPlan({
            lifeExpectancyYears: lifeExpectancyYears,
            monthlySpending: monthlySpending,
            retirementAge: retirementAge,
            currentAge: currentAge,
            expectedYieldRate: yieldRate,
            inflationRate: inflationRate,
            isActive: true
        });

        // Update target amount
        userSavings[msg.sender].targetAmount = requiredInvestment;
        userSavings[msg.sender].paymentsRemaining = lifeExpectancyYears.mul(MONTHS_PER_YEAR);
        
        emit PensionPlanUpdated(msg.sender, requiredInvestment);
    }

    /**
     * @dev Deposit funds towards pension target
     */
    function depositFunds() external payable nonReentrant {
        require(pensionPlans[msg.sender].isActive, "No active pension plan found");
        require(msg.value > 0, "Must deposit some funds");
        require(!userSavings[msg.sender].paymentsStarted, "Cannot deposit after payments started");
        
        UserSavings storage savings = userSavings[msg.sender];
        savings.totalDeposited = savings.totalDeposited.add(msg.value);
        totalFundsUnderManagement = totalFundsUnderManagement.add(msg.value);
        
        emit FundsDeposited(msg.sender, msg.value, savings.totalDeposited, savings.targetAmount);
        
        // Check if target has been reached
        if (savings.totalDeposited >= savings.targetAmount && !savings.paymentsStarted) {
            _startMonthlyPayments(msg.sender);
        }
    }

    /**
     * @dev Start monthly payments for a user who has reached their target
     * @param user Address of the user
     */
    function _startMonthlyPayments(address user) internal {
        UserSavings storage savings = userSavings[user];
        PensionPlan memory plan = pensionPlans[user];
        
        savings.paymentsStarted = true;
        savings.lastPaymentTime = block.timestamp;
        
        emit TargetReached(user, savings.targetAmount);
        
        // Send first payment immediately
        _processMonthlyPayment(user);
    }

    /**
     * @dev Process monthly payment for a user
     * @param user Address of the user
     */
    function _processMonthlyPayment(address user) internal {
        UserSavings storage savings = userSavings[user];
        PensionPlan memory plan = pensionPlans[user];
        
        require(savings.paymentsStarted, "Payments not started");
        require(savings.paymentsRemaining > 0, "No payments remaining");
        
        uint256 paymentAmount = plan.monthlySpending;
        
        // Ensure we don't pay more than what's available
        if (paymentAmount > savings.totalDeposited.sub(savings.totalPaidOut)) {
            paymentAmount = savings.totalDeposited.sub(savings.totalPaidOut);
        }
        
        require(paymentAmount > 0, "No funds available for payment");
        
        // Update tracking
        savings.totalPaidOut = savings.totalPaidOut.add(paymentAmount);
        savings.paymentsRemaining = savings.paymentsRemaining.sub(1);
        savings.lastPaymentTime = block.timestamp;
        
        totalPaymentsProcessed = totalPaymentsProcessed.add(paymentAmount);
        
        // Transfer payment to user
        (bool success, ) = user.call{value: paymentAmount}("");
        require(success, "Payment transfer failed");
        
        emit MonthlyPaymentSent(user, paymentAmount, savings.paymentsRemaining);
        
        // Check if all payments are completed
        if (savings.paymentsRemaining == 0) {
            emit PaymentsCompleted(user, savings.totalPaidOut);
        }
    }

    /**
     * @dev Execute monthly payment for a user (can be called by anyone)
     * @param user Address of the user
     */
    function executeMonthlyPayment(address user) external nonReentrant {
        UserSavings storage savings = userSavings[user];
        require(savings.paymentsStarted, "Payments not started");
        require(savings.paymentsRemaining > 0, "No payments remaining");
        
        // Check if enough time has passed since last payment (approximately 30 days)
        require(
            block.timestamp >= savings.lastPaymentTime.add(SECONDS_PER_MONTH),
            "Too early for next payment"
        );
        
        _processMonthlyPayment(user);
    }

    /**
     * @dev Get the current pension plan for a user
     * @param user Address of the user
     * @return plan The pension plan struct
     */
    function getPensionPlan(address user) external view returns (PensionPlan memory plan) {
        return pensionPlans[user];
    }

    /**
     * @dev Get the savings info for a user
     * @param user Address of the user
     * @return savings The user savings struct
     */
    function getUserSavings(address user) external view returns (UserSavings memory savings) {
        return userSavings[user];
    }

    /**
     * @dev Get the required investment for a user's pension plan
     * @param user Address of the user
     * @return requiredInvestment The required investment amount in wei
     */
    function getRequiredInvestment(address user) external view returns (uint256 requiredInvestment) {
        PensionPlan memory plan = pensionPlans[user];
        require(plan.isActive, "No active pension plan found");
        
        return calculateRequiredInvestment(
            plan.lifeExpectancyYears,
            plan.monthlySpending,
            plan.retirementAge,
            plan.currentAge,
            plan.expectedYieldRate,
            plan.inflationRate
        );
    }

    /**
     * @dev Check if user has reached their target amount
     * @param user Address of the user
     * @return reached Whether the target has been reached
     */
    function hasReachedTarget(address user) external view returns (bool reached) {
        UserSavings memory savings = userSavings[user];
        return savings.totalDeposited >= savings.targetAmount;
    }

    /**
     * @dev Get remaining amount needed to reach target
     * @param user Address of the user
     * @return remaining Amount still needed
     */
    function getRemainingAmount(address user) external view returns (uint256 remaining) {
        UserSavings memory savings = userSavings[user];
        if (savings.totalDeposited >= savings.targetAmount) {
            return 0;
        }
        return savings.targetAmount.sub(savings.totalDeposited);
    }

    /**
     * @dev Update the yield rate from Pendle Finance (only owner)
     * @param yieldRate New yield rate in basis points
     */
    function updateYieldRate(uint256 yieldRate) external onlyOwner {
        require(yieldRate <= BASIS_POINTS, "Yield rate cannot exceed 100%");
        historicalYields[block.timestamp] = yieldRate;
        emit YieldRateUpdated(block.timestamp, yieldRate);
    }

    /**
     * @dev Get the latest yield rate
     * @return yieldRate The latest yield rate in basis points
     */
    function getLatestYieldRate() external view returns (uint256 yieldRate) {
        // This would typically fetch from Pendle Finance API
        // For now, return the default rate
        return defaultYieldRate;
    }

    /**
     * @dev Calculate monthly payment from a given investment amount
     * @param investmentAmount Total investment amount in wei
     * @param lifeExpectancyYears Life expectancy after retirement in years
     * @param yieldRate Expected annual yield rate (in basis points)
     * @param inflationRate Expected annual inflation rate (in basis points)
     * @return monthlyPayment The monthly payment amount in wei
     */
    function calculateMonthlyPayment(
        uint256 investmentAmount,
        uint256 lifeExpectancyYears,
        uint256 yieldRate,
        uint256 inflationRate
    ) external pure returns (uint256 monthlyPayment) {
        require(investmentAmount > 0, "Investment amount must be greater than 0");
        require(lifeExpectancyYears > 0, "Life expectancy must be greater than 0");
        require(yieldRate <= BASIS_POINTS, "Yield rate cannot exceed 100%");
        require(inflationRate <= BASIS_POINTS, "Inflation rate cannot exceed 100%");
        
        uint256 totalRetirementMonths = lifeExpectancyYears.mul(MONTHS_PER_YEAR);
        uint256 realYieldRate = yieldRate > inflationRate ? yieldRate.sub(inflationRate) : 0;
        
        if (realYieldRate == 0) {
            // If no real yield, just divide investment by months
            return investmentAmount.div(totalRetirementMonths);
        }
        
        uint256 monthlyRate = realYieldRate.div(MONTHS_PER_YEAR);
        uint256 annuityFactor = calculateAnnuityFactor(monthlyRate, totalRetirementMonths);
        
        monthlyPayment = investmentAmount.mul(monthlyRate).div(annuityFactor);
    }

    /**
     * @dev Calculate annuity factor for monthly payments
     * @param monthlyRate Monthly interest rate in basis points
     * @param months Number of months
     * @return factor The annuity factor
     */
    function calculateAnnuityFactor(uint256 monthlyRate, uint256 months) 
        public pure returns (uint256 factor) {
        if (monthlyRate == 0) {
            return months.mul(BASIS_POINTS);
        }
        
        uint256 ratePlusOne = BASIS_POINTS.add(monthlyRate);
        uint256 ratePlusOneToMonths = ratePlusOne;
        
        for (uint256 i = 1; i < months; i++) {
            ratePlusOneToMonths = ratePlusOneToMonths.mul(ratePlusOne).div(BASIS_POINTS);
        }
        
        factor = ratePlusOneToMonths.sub(BASIS_POINTS).mul(BASIS_POINTS).div(monthlyRate);
    }

    /**
     * @dev Deactivate a pension plan
     */
    function deactivatePensionPlan() external {
        require(pensionPlans[msg.sender].isActive, "No active pension plan found");
        require(!userSavings[msg.sender].paymentsStarted, "Cannot deactivate after payments started");
        pensionPlans[msg.sender].isActive = false;
    }

    /**
     * @dev Withdraw remaining funds if plan is deactivated (only if payments haven't started)
     */
    function withdrawFunds() external nonReentrant {
        require(pensionPlans[msg.sender].isActive == false, "Plan must be deactivated first");
        require(!userSavings[msg.sender].paymentsStarted, "Cannot withdraw after payments started");
        
        UserSavings storage savings = userSavings[msg.sender];
        require(savings.totalDeposited > 0, "No funds to withdraw");
        
        uint256 amountToWithdraw = savings.totalDeposited;
        savings.totalDeposited = 0;
        totalFundsUnderManagement = totalFundsUnderManagement.sub(amountToWithdraw);
        
        (bool success, ) = msg.sender.call{value: amountToWithdraw}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Emergency withdrawal function for owner (only in emergency situations)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow the contract to receive ETH
    }
} 