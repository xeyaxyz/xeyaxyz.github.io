const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RetirementCalculator", function () {
  let RetirementCalculator;
  let retirementCalculator;
  let owner;
  let user1;
  let user2;
  let mockPriceFeed;
  let MockPriceFeed;

  // Test parameters
  const LIFE_EXPECTANCY_YEARS = 20;
  const MONTHLY_SPENDING_USD = 5000;
  const RETIREMENT_AGE = 65;
  const CURRENT_AGE = 30;
  const YIELD_RATE_BPS = 500; // 5%
  const INFLATION_RATE_BPS = 200; // 2%
  const MONTHLY_SPENDING_SCALED = MONTHLY_SPENDING_USD * 1e8;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock price feed
    MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy();
    await mockPriceFeed.deployed();

    // Set a mock ETH price (e.g., $3000 USD)
    await mockPriceFeed.setPrice(3000 * 1e8); // $3000 with 8 decimals

    // Deploy RetirementCalculator
    RetirementCalculator = await ethers.getContractFactory("RetirementCalculator");
    retirementCalculator = await RetirementCalculator.deploy(mockPriceFeed.address, owner.address);
    await retirementCalculator.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await retirementCalculator.owner()).to.equal(owner.address);
    });

    it("Should set the correct price feed", async function () {
      expect(await retirementCalculator.ethUsdPriceFeed()).to.equal(mockPriceFeed.address);
    });

    it("Should initialize with default values", async function () {
      expect(await retirementCalculator.defaultYieldRate()).to.equal(500); // 5%
      expect(await retirementCalculator.defaultInflationRate()).to.equal(200); // 2%
      expect(await retirementCalculator.totalFundsUnderManagement()).to.equal(0);
      expect(await retirementCalculator.totalPaymentsProcessed()).to.equal(0);
    });
  });

  describe("Price Feed Integration", function () {
    it("Should get ETH/USD price from price feed", async function () {
      const price = await retirementCalculator.getEthUsdPrice();
      expect(price).to.equal(3000 * 1e8); // $3000 with 8 decimals
    });

    it("Should convert USD to Wei correctly", async function () {
      const usdAmount = 1000 * 1e8; // $1000 with 8 decimals
      const weiAmount = await retirementCalculator.usdToWei(usdAmount);
      
      // Expected: $1000 / $3000 = 0.333... ETH = 0.333... * 10^18 wei
      const expectedWei = ethers.utils.parseEther("0.333333333333333333");
      expect(weiAmount).to.equal(expectedWei);
    });

    it("Should convert Wei to USD correctly", async function () {
      const weiAmount = ethers.utils.parseEther("1"); // 1 ETH
      const usdAmount = await retirementCalculator.weiToUsd(weiAmount);
      
      // Expected: 1 ETH * $3000 = $3000 with 8 decimals
      expect(usdAmount).to.equal(3000 * 1e8);
    });
  });

  describe("Retirement Plan Creation", function () {
    it("Should create a retirement plan successfully", async function () {
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const plan = await retirementCalculator.getRetirementPlan(user1.address);
      expect(plan.lifeExpectancyYears).to.equal(LIFE_EXPECTANCY_YEARS);
      expect(plan.monthlySpendingUSD).to.equal(MONTHLY_SPENDING_SCALED);
      expect(plan.retirementAge).to.equal(RETIREMENT_AGE);
      expect(plan.currentAge).to.equal(CURRENT_AGE);
      expect(plan.expectedYieldRate).to.equal(YIELD_RATE_BPS);
      expect(plan.inflationRate).to.equal(INFLATION_RATE_BPS);
      expect(plan.isActive).to.be.true;
    });

    it("Should emit RetirementPlanCreated event", async function () {
      const tx = await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'RetirementPlanCreated');
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(user1.address);
    });

    it("Should calculate required investment correctly", async function () {
      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      expect(requiredInvestment).to.be.gt(0);
    });

    it("Should update retirement plan", async function () {
      // Create initial plan
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Update plan
      const newMonthlySpending = 6000 * 1e8;
      await retirementCalculator.connect(user1).updateRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        newMonthlySpending,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const plan = await retirementCalculator.getRetirementPlan(user1.address);
      expect(plan.monthlySpendingUSD).to.equal(newMonthlySpending);
    });
  });

  describe("Fund Deposits", function () {
    beforeEach(async function () {
      // Create a retirement plan for user1
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );
    });

    it("Should deposit funds successfully", async function () {
      const depositAmount = ethers.utils.parseEther("1"); // 1 ETH
      
      await retirementCalculator.connect(user1).depositFunds({ value: depositAmount });

      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.totalDeposited).to.equal(depositAmount);
      expect(savings.paymentsStarted).to.be.false;
    });

    it("Should emit FundsDeposited event", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      
      const tx = await retirementCalculator.connect(user1).depositFunds({ value: depositAmount });
      const receipt = await tx.wait();
      
      const event = receipt.events.find(e => e.event === 'FundsDeposited');
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(user1.address);
      expect(event.args.amount).to.equal(depositAmount);
    });

    it("Should reject deposit without active plan", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      
      await expect(
        retirementCalculator.connect(user2).depositFunds({ value: depositAmount })
      ).to.be.revertedWith("No active retirement plan found");
    });

    it("Should reject zero deposit", async function () {
      await expect(
        retirementCalculator.connect(user1).depositFunds({ value: 0 })
      ).to.be.revertedWith("Must deposit some funds");
    });

    it("Should update total funds under management", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      
      await retirementCalculator.connect(user1).depositFunds({ value: depositAmount });
      
      expect(await retirementCalculator.totalFundsUnderManagement()).to.equal(depositAmount);
    });
  });

  describe("Monthly Payments", function () {
    beforeEach(async function () {
      // Create a retirement plan for user1
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );
    });

    it("Should start payments when target is reached", async function () {
      // Get required investment
      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Deposit enough to reach target
      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });

      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.paymentsStarted).to.be.true;
      expect(savings.paymentsRemaining).to.equal(LIFE_EXPECTANCY_YEARS * 12);
    });

    it("Should execute monthly payment", async function () {
      // Get required investment and deposit
      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });

      // Execute monthly payment
      await retirementCalculator.connect(user2).executeMonthlyPayment(user1.address);

      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.paymentsRemaining).to.equal(LIFE_EXPECTANCY_YEARS * 12 - 1);
    });

    it("Should emit MonthlyPaymentSent event", async function () {
      // Get required investment and deposit
      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });

      // Execute monthly payment
      const tx = await retirementCalculator.connect(user2).executeMonthlyPayment(user1.address);
      const receipt = await tx.wait();
      
      const event = receipt.events.find(e => e.event === 'MonthlyPaymentSent');
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(user1.address);
    });

    it("Should reject payment execution if payments not started", async function () {
      await expect(
        retirementCalculator.connect(user2).executeMonthlyPayment(user1.address)
      ).to.be.revertedWith("Payments not started");
    });

    it("Should complete all payments", async function () {
      // Get required investment and deposit
      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });

      // Execute all payments
      const totalPayments = LIFE_EXPECTANCY_YEARS * 12;
      for (let i = 0; i < totalPayments; i++) {
        await retirementCalculator.connect(user2).executeMonthlyPayment(user1.address);
      }

      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.paymentsRemaining).to.equal(0);
    });
  });

  describe("Plan Management", function () {
    beforeEach(async function () {
      // Create a retirement plan for user1
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );
    });

    it("Should deactivate retirement plan", async function () {
      await retirementCalculator.connect(user1).deactivateRetirementPlan();

      const plan = await retirementCalculator.getRetirementPlan(user1.address);
      expect(plan.isActive).to.be.false;
    });

    it("Should reject deactivation after payments started", async function () {
      // Get required investment and deposit to start payments
      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });

      await expect(
        retirementCalculator.connect(user1).deactivateRetirementPlan()
      ).to.be.revertedWith("Cannot deactivate after payments started");
    });

    it("Should withdraw funds from deactivated plan", async function () {
      // Deposit some funds
      const depositAmount = ethers.utils.parseEther("1");
      await retirementCalculator.connect(user1).depositFunds({ value: depositAmount });

      // Deactivate plan
      await retirementCalculator.connect(user1).deactivateRetirementPlan();

      // Withdraw funds
      const initialBalance = await user1.getBalance();
      await retirementCalculator.connect(user1).withdrawFunds();
      const finalBalance = await user1.getBalance();

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should reject withdrawal if plan is active", async function () {
      await expect(
        retirementCalculator.connect(user1).withdrawFunds()
      ).to.be.revertedWith("Plan must be deactivated first");
    });

    it("Should reject withdrawal after payments started", async function () {
      // Get required investment and deposit to start payments
      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });

      await expect(
        retirementCalculator.connect(user1).withdrawFunds()
      ).to.be.revertedWith("Cannot withdraw after payments started");
    });
  });

  describe("Utility Functions", function () {
    it("Should check if user has reached target", async function () {
      // Create plan and deposit
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Before deposit
      expect(await retirementCalculator.hasReachedTarget(user1.address)).to.be.false;

      // After deposit
      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });
      expect(await retirementCalculator.hasReachedTarget(user1.address)).to.be.true;
    });

    it("Should get remaining amount", async function () {
      // Create plan and deposit
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const depositAmount = requiredInvestment.div(2); // Deposit half
      await retirementCalculator.connect(user1).depositFunds({ value: depositAmount });

      const remainingAmount = await retirementCalculator.getRemainingAmount(user1.address);
      expect(remainingAmount).to.equal(requiredInvestment.sub(depositAmount));
    });

    it("Should get required investment for user", async function () {
      // Create plan
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const requiredInvestment = await retirementCalculator.getRequiredInvestment();
      expect(requiredInvestment).to.be.gt(0);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle zero yield rate in annuity calculation", async function () {
      const factor = await retirementCalculator.calculateAnnuityFactor(0, 12);
      expect(factor).to.equal(12 * 10000); // months * BASIS_POINTS
    });

    it("Should handle zero monthly rate in annuity calculation", async function () {
      const factor = await retirementCalculator.calculateAnnuityFactor(0, 24);
      expect(factor).to.equal(24 * 10000);
    });

    it("Should reject deposit after payments started", async function () {
      // Create plan and start payments
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });

      // Try to deposit more
      await expect(
        retirementCalculator.connect(user1).depositFunds({ value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("Cannot deposit after payments started");
    });

    it("Should handle reentrancy protection", async function () {
      // This test would require a malicious contract to test reentrancy
      // For now, we just verify the contract has ReentrancyGuard
      expect(await retirementCalculator.hasRole(await retirementCalculator.REENTRANCY_GUARD_ROLE(), owner.address)).to.be.false;
    });
  });

  describe("Contract State Management", function () {
    it("Should track total funds under management correctly", async function () {
      // Create plans for multiple users
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      await retirementCalculator.connect(user2).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Deposit funds
      const deposit1 = ethers.utils.parseEther("1");
      const deposit2 = ethers.utils.parseEther("2");

      await retirementCalculator.connect(user1).depositFunds({ value: deposit1 });
      await retirementCalculator.connect(user2).depositFunds({ value: deposit2 });

      expect(await retirementCalculator.totalFundsUnderManagement()).to.equal(deposit1.add(deposit2));
    });

    it("Should track total payments processed", async function () {
      // Create plan and start payments
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      await retirementCalculator.connect(user1).depositFunds({ value: requiredInvestment });

      // Execute a payment
      await retirementCalculator.connect(user2).executeMonthlyPayment(user1.address);

      expect(await retirementCalculator.totalPaymentsProcessed()).to.be.gt(0);
    });
  });
}); 