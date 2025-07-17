const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RetirementCalculator Integration Tests", function () {
  let RetirementCalculator;
  let retirementCalculator;
  let mockPriceFeed;
  let MockPriceFeed;
  let owner;
  let user1;
  let user2;
  let user3;

  // Test parameters
  const LIFE_EXPECTANCY_YEARS = 20;
  const MONTHLY_SPENDING_USD = 5000;
  const RETIREMENT_AGE = 65;
  const CURRENT_AGE = 30;
  const YIELD_RATE_BPS = 500; // 5%
  const INFLATION_RATE_BPS = 200; // 2%
  const MONTHLY_SPENDING_SCALED = MONTHLY_SPENDING_USD * 1e8;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock price feed
    MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy();
    await mockPriceFeed.deployed();

    // Set ETH price to $3000
    await mockPriceFeed.setPrice(3000 * 1e8);

    // Deploy RetirementCalculator
    RetirementCalculator = await ethers.getContractFactory("RetirementCalculator");
    retirementCalculator = await RetirementCalculator.deploy(mockPriceFeed.address, owner.address);
    await retirementCalculator.deployed();
  });

  describe("Complete Retirement Flow", function () {
    it("Should complete full retirement cycle: plan creation -> deposits -> payments -> completion", async function () {
      // Step 1: Create retirement plan
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Step 2: Calculate required investment
      const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Step 3: Deposit funds in multiple transactions
      const deposit1 = requiredInvestment.div(3);
      const deposit2 = requiredInvestment.div(3);
      const deposit3 = requiredInvestment.sub(deposit1).sub(deposit2);

      await retirementCalculator.connect(user1).depositFunds({ value: deposit1 });
      await retirementCalculator.connect(user1).depositFunds({ value: deposit2 });
      await retirementCalculator.connect(user1).depositFunds({ value: deposit3 });

      // Step 4: Verify payments started
      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.paymentsStarted).to.be.true;
      expect(savings.paymentsRemaining).to.equal(LIFE_EXPECTANCY_YEARS * 12);

      // Step 5: Execute all monthly payments
      const totalPayments = LIFE_EXPECTANCY_YEARS * 12;
      let totalPaidOut = ethers.BigNumber.from(0);

      for (let i = 0; i < totalPayments; i++) {
        const balanceBefore = await user1.getBalance();
        await retirementCalculator.connect(user2).executeMonthlyPayment(user1.address);
        const balanceAfter = await user1.getBalance();
        
        totalPaidOut = totalPaidOut.add(balanceAfter.sub(balanceBefore));
      }

      // Step 6: Verify completion
      const finalSavings = await retirementCalculator.getUserSavings(user1.address);
      expect(finalSavings.paymentsRemaining).to.equal(0);
      expect(finalSavings.totalPaidOut).to.equal(totalPaidOut);
    });

    it("Should handle multiple users with different plans", async function () {
      // User 1: Conservative plan
      await retirementCalculator.connect(user1).createRetirementPlan(
        15, // 15 years life expectancy
        3000 * 1e8, // $3000 monthly spending
        65, // retirement age
        35, // current age
        400, // 4% yield
        150  // 1.5% inflation
      );

      // User 2: Aggressive plan
      await retirementCalculator.connect(user2).createRetirementPlan(
        25, // 25 years life expectancy
        8000 * 1e8, // $8000 monthly spending
        60, // retirement age
        30, // current age
        600, // 6% yield
        250  // 2.5% inflation
      );

      // Calculate required investments
      const required1 = await retirementCalculator.calculateRequiredInvestment(
        15, 3000 * 1e8, 65, 35, 400, 150
      );
      const required2 = await retirementCalculator.calculateRequiredInvestment(
        25, 8000 * 1e8, 60, 30, 600, 250
      );

      // Deposit funds
      await retirementCalculator.connect(user1).depositFunds({ value: required1 });
      await retirementCalculator.connect(user2).depositFunds({ value: required2 });

      // Verify both users have payments started
      const savings1 = await retirementCalculator.getUserSavings(user1.address);
      const savings2 = await retirementCalculator.getUserSavings(user2.address);

      expect(savings1.paymentsStarted).to.be.true;
      expect(savings2.paymentsStarted).to.be.true;
      expect(savings1.paymentsRemaining).to.equal(15 * 12);
      expect(savings2.paymentsRemaining).to.equal(25 * 12);
    });

    it("Should handle partial deposits and gradual target achievement", async function () {
      // Create plan
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

      // Deposit 50% first
      const halfDeposit = requiredInvestment.div(2);
      await retirementCalculator.connect(user1).depositFunds({ value: halfDeposit });

      let savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.paymentsStarted).to.be.false;
      expect(savings.totalDeposited).to.equal(halfDeposit);

      // Deposit remaining 50%
      await retirementCalculator.connect(user1).depositFunds({ value: halfDeposit });

      savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.paymentsStarted).to.be.true;
      expect(savings.totalDeposited).to.equal(requiredInvestment);
    });
  });

  describe("Edge Cases and Stress Tests", function () {
    it("Should handle very small deposits", async function () {
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const smallDeposit = ethers.utils.parseEther("0.001"); // 0.001 ETH
      await retirementCalculator.connect(user1).depositFunds({ value: smallDeposit });

      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.totalDeposited).to.equal(smallDeposit);
    });

    it("Should handle very large deposits", async function () {
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const largeDeposit = ethers.utils.parseEther("1000"); // 1000 ETH
      await retirementCalculator.connect(user1).depositFunds({ value: largeDeposit });

      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.totalDeposited).to.equal(largeDeposit);
      expect(savings.paymentsStarted).to.be.true;
    });

    it("Should handle rapid successive deposits", async function () {
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

      // Make 10 small deposits rapidly
      const depositSize = requiredInvestment.div(10);
      for (let i = 0; i < 10; i++) {
        await retirementCalculator.connect(user1).depositFunds({ value: depositSize });
      }

      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.totalDeposited).to.equal(requiredInvestment);
      expect(savings.paymentsStarted).to.be.true;
    });

    it("Should handle rapid successive payments", async function () {
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

      // Execute 5 payments rapidly
      for (let i = 0; i < 5; i++) {
        await retirementCalculator.connect(user2).executeMonthlyPayment(user1.address);
      }

      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.paymentsRemaining).to.equal(LIFE_EXPECTANCY_YEARS * 12 - 5);
    });
  });

  describe("Price Feed Integration Tests", function () {
    it("Should handle price feed updates", async function () {
      // Set initial price
      await mockPriceFeed.setPrice(3000 * 1e8); // $3000

      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const requiredInvestment1 = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Change price
      await mockPriceFeed.setPrice(4000 * 1e8); // $4000

      const requiredInvestment2 = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Higher ETH price should mean lower ETH requirement for same USD amount
      expect(requiredInvestment2).to.be.lt(requiredInvestment1);
    });

    it("Should handle extreme price scenarios", async function () {
      // Very high ETH price
      await mockPriceFeed.setPrice(10000 * 1e8); // $10,000

      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const requiredInvestmentHigh = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Very low ETH price
      await mockPriceFeed.setPrice(100 * 1e8); // $100

      const requiredInvestmentLow = await retirementCalculator.calculateRequiredInvestment(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      expect(requiredInvestmentHigh).to.be.lt(requiredInvestmentLow);
    });
  });

  describe("Contract State Consistency", function () {
    it("Should maintain consistent state across multiple operations", async function () {
      // Create multiple plans
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

      // Verify total funds under management
      expect(await retirementCalculator.totalFundsUnderManagement()).to.equal(deposit1.add(deposit2));

      // Verify individual user savings
      const savings1 = await retirementCalculator.getUserSavings(user1.address);
      const savings2 = await retirementCalculator.getUserSavings(user2.address);

      expect(savings1.totalDeposited).to.equal(deposit1);
      expect(savings2.totalDeposited).to.equal(deposit2);
    });

    it("Should handle plan updates correctly", async function () {
      // Create initial plan
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const initialPlan = await retirementCalculator.getRetirementPlan(user1.address);
      expect(initialPlan.monthlySpendingUSD).to.equal(MONTHLY_SPENDING_SCALED);

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

      const updatedPlan = await retirementCalculator.getRetirementPlan(user1.address);
      expect(updatedPlan.monthlySpendingUSD).to.equal(newMonthlySpending);
      expect(updatedPlan.isActive).to.be.true;
    });
  });

  describe("Error Recovery and Resilience", function () {
    it("Should handle failed transactions gracefully", async function () {
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Try to deposit with insufficient funds (should fail)
      const largeAmount = ethers.utils.parseEther("1000000"); // Very large amount
      
      // This should fail due to insufficient balance, but shouldn't break the contract
      await expect(
        retirementCalculator.connect(user1).depositFunds({ value: largeAmount })
      ).to.be.reverted;

      // Contract should still be in a valid state
      const plan = await retirementCalculator.getRetirementPlan(user1.address);
      expect(plan.isActive).to.be.true;
    });

    it("Should maintain data integrity after failed operations", async function () {
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Make a successful deposit
      const deposit = ethers.utils.parseEther("1");
      await retirementCalculator.connect(user1).depositFunds({ value: deposit });

      // Try to execute payment before target is reached (should fail)
      await expect(
        retirementCalculator.connect(user2).executeMonthlyPayment(user1.address)
      ).to.be.revertedWith("Payments not started");

      // User savings should remain unchanged
      const savings = await retirementCalculator.getUserSavings(user1.address);
      expect(savings.totalDeposited).to.equal(deposit);
      expect(savings.paymentsStarted).to.be.false;
    });
  });
}); 