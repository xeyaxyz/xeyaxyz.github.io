// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AggregatorV3Interface
 * @dev Chainlink price feed interface
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title IPendleYieldToken
 * @dev Interface for Pendle Finance yield-bearing tokens
 */
interface IPendleYieldToken {
    function exchangeRate() external view returns (uint256);
    function underlyingAsset() external view returns (address);
    function expiry() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title IPendleMarket
 * @dev Interface for Pendle Finance markets
 */
interface IPendleMarket {
    function getPt() external view returns (address);
    function getYt() external view returns (address);
    function getSy() external view returns (address);
    function getRewardTokens() external view returns (address[] memory);
    function getMarketState() external view returns (
        uint256 totalPt,
        uint256 totalYt,
        uint256 totalSy,
        uint256 totalRewardTokens
    );
}

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
        uint256 monthlySpendingUSD;      // Required monthly spending in USD (scaled by 10^8)
        uint256 retirementAge;           // Age at retirement
        uint256 currentAge;              // Current age
        uint256 expectedYieldRate;       // Expected annual yield rate (in basis points, e.g., 500 = 5%)
        uint256 inflationRate;           // Expected annual inflation rate (in basis points)
        bool isActive;                   // Whether the plan is active
    }

    // Struct to track user savings and payment status
    struct UserSavings {
        uint256 totalDeposited;          // Total amount deposited by user (in wei)
        uint256 targetAmount;            // Target amount needed for retirement (in wei)
        bool paymentsStarted;            // Whether monthly payments have started
        uint256 lastPaymentTime;         // Timestamp of last payment
        uint256 paymentsRemaining;       // Number of payments remaining
        uint256 totalPaidOut;            // Total amount paid out so far (in wei)
    }

    // Mapping from user address to their pension plan
    mapping(address => PensionPlan) public pensionPlans;
    
    // Mapping from user address to their savings info
    mapping(address => UserSavings) public userSavings;
    
    // Mapping to store historical yield rates from Pendle Finance
    mapping(uint256 => uint256) public historicalYields; // timestamp => yield rate
    
    // Pendle Finance integration
    mapping(address => bool) public supportedPendleTokens; // Supported Pendle yield tokens
    address[] public pendleTokens; // Array of supported Pendle tokens
    
    // Chainlink price feed integration
    AggregatorV3Interface public ethUsdPriceFeed;
    uint256 public lastPriceUpdateBlock;
    uint256 public constant PRICE_UPDATE_INTERVAL = 7200; // Update every 7200 blocks (~1 day)
    uint256 public constant USD_SCALE = 1e8; // Scale for USD values (8 decimals)
    uint256 public constant ETH_DECIMALS = 18; // ETH has 18 decimals
    
    // Events
    event PensionPlanCreated(address indexed user, uint256 requiredInvestment);
    event PensionPlanUpdated(address indexed user, uint256 newRequiredInvestment);
    event YieldRateUpdated(uint256 timestamp, uint256 yieldRate);
    event FundsDeposited(address indexed user, uint256 amount, uint256 totalDeposited, uint256 targetAmount);
    event TargetReached(address indexed user, uint256 targetAmount);
    event MonthlyPaymentSent(address indexed user, uint256 amount, uint256 paymentsRemaining);
    event PaymentsCompleted(address indexed user, uint256 totalPaidOut);
    event PendleTokenAdded(address indexed token);
    event PendleTokenRemoved(address indexed token);
    event PriceFeedUpdated(uint256 blockNumber, uint256 ethPriceUSD);
    
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
    
    constructor(address _ethUsdPriceFeed) {
        require(_ethUsdPriceFeed != address(0), "Invalid price feed address");
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        lastPriceUpdateBlock = block.number;
        
        // Initialize with current timestamp
        historicalYields[block.timestamp] = defaultYieldRate;
    }

    /**
     * @dev Get current ETH/USD price from Chainlink
     * @return price ETH price in USD (scaled by 10^8)
     */
    function getEthUsdPrice() public view returns (uint256 price) {
        (, int256 answer, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
        require(answer > 0, "Invalid price feed answer");
        require(updatedAt > 0, "Price feed not updated");
        
        // Convert to uint256 and scale appropriately
        price = uint256(answer);
    }

    /**
     * @dev Convert USD amount to wei
     * @param usdAmount Amount in USD (scaled by 10^8)
     * @return weiAmount Amount in wei
     */
    function usdToWei(uint256 usdAmount) public view returns (uint256 weiAmount) {
        uint256 ethPrice = getEthUsdPrice();
        // usdAmount is scaled by 10^8, ethPrice is also scaled by 10^8
        // We need to convert to wei (18 decimals)
        weiAmount = usdAmount.mul(10**ETH_DECIMALS).div(ethPrice);
    }

    /**
     * @dev Convert wei amount to USD
     * @param weiAmount Amount in wei
     * @return usdAmount Amount in USD (scaled by 10^8)
     */
    function weiToUsd(uint256 weiAmount) public view returns (uint256 usdAmount) {
        uint256 ethPrice = getEthUsdPrice();
        // Convert wei to USD (scaled by 10^8)
        usdAmount = weiAmount.mul(ethPrice).div(10**ETH_DECIMALS);
    }

    /**
     * @dev Update price feed if enough blocks have passed
     */
    function updatePriceFeed() public {
        require(
            block.number >= lastPriceUpdateBlock.add(PRICE_UPDATE_INTERVAL),
            "Too early to update price feed"
        );
        
        uint256 ethPrice = getEthUsdPrice();
        lastPriceUpdateBlock = block.number;
        
        emit PriceFeedUpdated(block.number, ethPrice);
    }

    /**
     * @dev Add a supported Pendle Finance yield token
     * @param token Address of the Pendle yield token
     */
    function addPendleToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedPendleTokens[token], "Token already supported");
        
        supportedPendleTokens[token] = true;
        pendleTokens.push(token);
        
        emit PendleTokenAdded(token);
    }

    /**
     * @dev Remove a supported Pendle Finance yield token
     * @param token Address of the Pendle yield token
     */
    function removePendleToken(address token) external onlyOwner {
        require(supportedPendleTokens[token], "Token not supported");
        
        supportedPendleTokens[token] = false;
        
        // Remove from array
        for (uint256 i = 0; i < pendleTokens.length; i++) {
            if (pendleTokens[i] == token) {
                pendleTokens[i] = pendleTokens[pendleTokens.length - 1];
                pendleTokens.pop();
                break;
            }
        }
        
        emit PendleTokenRemoved(token);
    }

    /**
     * @dev Get yield rate from a specific Pendle yield token
     * @param token Address of the Pendle yield token
     * @return yieldRate Annual yield rate in basis points
     */
    function getPendleYieldRate(address token) public view returns (uint256 yieldRate) {
        require(supportedPendleTokens[token], "Token not supported");
        
        try IPendleYieldToken(token).exchangeRate() returns (uint256 exchangeRate) {
            // Calculate annual yield rate from exchange rate
            // This is a simplified calculation - in practice, you'd need more complex logic
            // based on Pendle's specific yield calculation methods
            
            if (exchangeRate > BASIS_POINTS) {
                // Calculate yield as percentage increase
                yieldRate = exchangeRate.sub(BASIS_POINTS);
            } else {
                yieldRate = 0;
            }
        } catch {
            // If call fails, return default rate
            yieldRate = defaultYieldRate;
        }
    }

    /**
     * @dev Get the latest yield rate from Pendle Finance
     * @return yieldRate The latest yield rate in basis points
     */
    function getLatestYieldRate() external view returns (uint256 yieldRate) {
        if (pendleTokens.length == 0) {
            return defaultYieldRate;
        }
        
        uint256 totalYield = 0;
        uint256 validTokens = 0;
        
        // Calculate average yield rate from all supported tokens
        for (uint256 i = 0; i < pendleTokens.length; i++) {
            address token = pendleTokens[i];
            if (supportedPendleTokens[token]) {
                uint256 tokenYield = getPendleYieldRate(token);
                if (tokenYield > 0) {
                    totalYield = totalYield.add(tokenYield);
                    validTokens = validTokens.add(1);
                }
            }
        }
        
        if (validTokens > 0) {
            yieldRate = totalYield.div(validTokens);
        } else {
            yieldRate = defaultYieldRate;
        }
        
        // Store in historical data
        historicalYields[block.timestamp] = yieldRate;
    }

    /**
     * @dev Get yield rates from all supported Pendle tokens
     * @return tokens Array of token addresses
     * @return rates Array of corresponding yield rates
     */
    function getAllPendleYieldRates() external view returns (address[] memory tokens, uint256[] memory rates) {
        tokens = new address[](pendleTokens.length);
        rates = new uint256[](pendleTokens.length);
        
        for (uint256 i = 0; i < pendleTokens.length; i++) {
            tokens[i] = pendleTokens[i];
            rates[i] = getPendleYieldRate(pendleTokens[i]);
        }
    }

    /**
     * @dev Calculate the required investment amount for a pension plan (USD input)
     * @param lifeExpectancyYears Life expectancy after retirement in years
     * @param monthlySpendingUSD Required monthly spending in USD (scaled by 10^8)
     * @param retirementAge Age at retirement
     * @param currentAge Current age
     * @param yieldRate Expected annual yield rate (in basis points)
     * @param inflationRate Expected annual inflation rate (in basis points)
     * @return requiredInvestment The required investment amount in wei
     */
    function calculateRequiredInvestment(
        uint256 lifeExpectancyYears,
        uint256 monthlySpendingUSD,
        uint256 retirementAge,
        uint256 currentAge,
        uint256 yieldRate,
        uint256 inflationRate
    ) public view returns (uint256 requiredInvestment) {
        require(lifeExpectancyYears > 0, "Life expectancy must be greater than 0");
        require(monthlySpendingUSD > 0, "Monthly spending must be greater than 0");
        require(retirementAge > currentAge, "Retirement age must be greater than current age");
        require(yieldRate <= BASIS_POINTS, "Yield rate cannot exceed 100%");
        require(inflationRate <= BASIS_POINTS, "Inflation rate cannot exceed 100%");
        
        // Convert monthly spending from USD to wei
        uint256 monthlySpendingWei = usdToWei(monthlySpendingUSD);
        
        // Calculate years until retirement
        uint256 yearsUntilRetirement = retirementAge.sub(currentAge);
        
        // Calculate the ratio (1 + AACPI) / (1 + AAROI) in basis points
        // (1 + inflationRate/10000) / (1 + yieldRate/10000) = (10000 + inflationRate) / (10000 + yieldRate)
        uint256 numerator = BASIS_POINTS.add(inflationRate);
        uint256 denominator = BASIS_POINTS.add(yieldRate);
        uint256 ratio = numerator.mul(BASIS_POINTS).div(denominator);
        
        uint256 requiredInvestmentWei;
        
        if (inflationRate == yieldRate) {
            // If AACPI = AAROI, use the simplified formula
            // 12 * DMSAR * ratio^(DRA-CA) * LEAR
            uint256 ratioToPower = calculatePower(ratio, yearsUntilRetirement);
            requiredInvestmentWei = monthlySpendingWei
                .mul(12)
                .mul(ratioToPower)
                .mul(lifeExpectancyYears)
                .div(BASIS_POINTS);
        } else {
            // If AACPI ≠ AAROI, use the geometric series formula
            // 12 * DMSAR * ratio^(DRA-CA) * (1 - ratio^LEAR) / (1 - ratio)
            uint256 ratioToPower = calculatePower(ratio, yearsUntilRetirement);
            uint256 ratioToLEAR = calculatePower(ratio, lifeExpectancyYears);
            
            uint256 seriesNumerator = BASIS_POINTS.sub(ratioToLEAR);
            uint256 seriesDenominator = BASIS_POINTS.sub(ratio);
            
            uint256 seriesResult = seriesNumerator.mul(BASIS_POINTS).div(seriesDenominator);
            
            requiredInvestmentWei = monthlySpendingWei
                .mul(12)
                .mul(ratioToPower)
                .mul(seriesResult)
                .div(BASIS_POINTS)
                .div(BASIS_POINTS);
        }
        
        return requiredInvestmentWei;
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
     * @dev Calculate power of a number (base^exponent) in basis points
     * @param base Base number in basis points
     * @param exponent Exponent (must be small to avoid overflow)
     * @return result The result in basis points
     */
    function calculatePower(uint256 base, uint256 exponent) 
        public pure returns (uint256 result) {
        if (exponent == 0) {
            return BASIS_POINTS;
        }
        if (exponent == 1) {
            return base;
        }
        
        result = BASIS_POINTS;
        for (uint256 i = 0; i < exponent; i++) {
            result = result.mul(base).div(BASIS_POINTS);
        }
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
     * @dev Create a new pension plan for the caller (USD input)
     * @param lifeExpectancyYears Life expectancy after retirement in years
     * @param monthlySpendingUSD Required monthly spending in USD (scaled by 10^8)
     * @param retirementAge Age at retirement
     * @param currentAge Current age
     * @param yieldRate Expected annual yield rate (in basis points)
     * @param inflationRate Expected annual inflation rate (in basis points)
     */
    function createPensionPlan(
        uint256 lifeExpectancyYears,
        uint256 monthlySpendingUSD,
        uint256 retirementAge,
        uint256 currentAge,
        uint256 yieldRate,
        uint256 inflationRate
    ) external {
        uint256 requiredInvestment = calculateRequiredInvestment(
            lifeExpectancyYears,
            monthlySpendingUSD,
            retirementAge,
            currentAge,
            yieldRate,
            inflationRate
        );
        
        pensionPlans[msg.sender] = PensionPlan({
            lifeExpectancyYears: lifeExpectancyYears,
            monthlySpendingUSD: monthlySpendingUSD,
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
     * @dev Update an existing pension plan (USD input)
     * @param lifeExpectancyYears New life expectancy after retirement in years
     * @param monthlySpendingUSD New required monthly spending in USD (scaled by 10^8)
     * @param retirementAge New age at retirement
     * @param currentAge New current age
     * @param yieldRate New expected annual yield rate (in basis points)
     * @param inflationRate New expected annual inflation rate (in basis points)
     */
    function updatePensionPlan(
        uint256 lifeExpectancyYears,
        uint256 monthlySpendingUSD,
        uint256 retirementAge,
        uint256 currentAge,
        uint256 yieldRate,
        uint256 inflationRate
    ) external {
        require(pensionPlans[msg.sender].isActive, "No active pension plan found");
        require(!userSavings[msg.sender].paymentsStarted, "Cannot update plan after payments started");
        
        uint256 requiredInvestment = calculateRequiredInvestment(
            lifeExpectancyYears,
            monthlySpendingUSD,
            retirementAge,
            currentAge,
            yieldRate,
            inflationRate
        );
        
        pensionPlans[msg.sender] = PensionPlan({
            lifeExpectancyYears: lifeExpectancyYears,
            monthlySpendingUSD: monthlySpendingUSD,
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
        
        // Convert monthly spending from USD to wei for payment
        uint256 paymentAmount = usdToWei(plan.monthlySpendingUSD);
        
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
            plan.monthlySpendingUSD,
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
     * @dev Calculate monthly payment from a given investment amount (USD input)
     * @param investmentAmountUSD Total investment amount in USD (scaled by 10^8)
     * @param lifeExpectancyYears Life expectancy after retirement in years
     * @param yieldRate Expected annual yield rate (in basis points)
     * @param inflationRate Expected annual inflation rate (in basis points)
     * @return monthlyPaymentUSD The monthly payment amount in USD (scaled by 10^8)
     */
    function calculateMonthlyPayment(
        uint256 investmentAmountUSD,
        uint256 lifeExpectancyYears,
        uint256 yieldRate,
        uint256 inflationRate
    ) external view returns (uint256 monthlyPaymentUSD) {
        require(investmentAmountUSD > 0, "Investment amount must be greater than 0");
        require(lifeExpectancyYears > 0, "Life expectancy must be greater than 0");
        require(yieldRate <= BASIS_POINTS, "Yield rate cannot exceed 100%");
        require(inflationRate <= BASIS_POINTS, "Inflation rate cannot exceed 100%");
        
        // Convert investment amount from USD to wei
        uint256 investmentAmountWei = usdToWei(investmentAmountUSD);
        
        uint256 totalRetirementMonths = lifeExpectancyYears.mul(MONTHS_PER_YEAR);
        uint256 realYieldRate = yieldRate > inflationRate ? yieldRate.sub(inflationRate) : 0;
        
        if (realYieldRate == 0) {
            // If no real yield, just divide investment by months
            uint256 monthlyPaymentWei = investmentAmountWei.div(totalRetirementMonths);
            return weiToUsd(monthlyPaymentWei);
        }
        
        uint256 monthlyRate = realYieldRate.div(MONTHS_PER_YEAR);
        uint256 annuityFactor = calculateAnnuityFactor(monthlyRate, totalRetirementMonths);
        
        uint256 monthlyPaymentWei = investmentAmountWei.mul(monthlyRate).div(annuityFactor);
        return weiToUsd(monthlyPaymentWei);
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
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow the contract to receive ETH
    }
} 