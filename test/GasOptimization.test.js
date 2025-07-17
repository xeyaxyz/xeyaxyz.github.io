const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RetirementCalculator Gas Optimization", function () {
  let RetirementCalculator;
  let retirementCalculator;
  let mockPriceFeed;
  let MockPriceFeed;
  let owner;
  let user1;
  let user2;

  // Test parameters
  const LIFE_EXPECTANCY_YEARS = 20;
  const MONTHLY_SPENDING_USD = 5000;
  const RETIREMENT_AGE = 65;
  const CURRENT_AGE = 30;
  const YIELD_RATE_BPS = 500; // 5%
  const INFLATION_RATE_BPS = 200; // 2%
  const MONTHLY_SPENDING_SCALED = MONTHLY_SPENDING_USD * 1e8;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

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

  describe("Gas Usage Measurement", function () {
    it("Should measure gas for retirement plan creation", async function () {
      const tx = await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const receipt = await tx.wait();
      console.log(`Gas used for plan creation: ${receipt.gasUsed.toString()}`);
      
      // Gas should be reasonable (typically under 200k for plan creation)
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should measure gas for fund deposits", async function () {
      // Create plan first
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const depositAmount = ethers.utils.parseEther("1");
      const tx = await retirementCalculator.connect(user1).depositFunds({ value: depositAmount });

      const receipt = await tx.wait();
      console.log(`Gas used for deposit: ${receipt.gasUsed.toString()}`);
      
      // Gas should be reasonable (typically under 150k for deposits)
      expect(receipt.gasUsed).to.be.lt(150000);
    });

    it("Should measure gas for monthly payment execution", async function () {
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

      const tx = await retirementCalculator.connect(user2).executeMonthlyPayment(user1.address);
      const receipt = await tx.wait();
      console.log(`Gas used for monthly payment: ${receipt.gasUsed.toString()}`);
      
      // Gas should be reasonable (typically under 100k for payments)
      expect(receipt.gasUsed).to.be.lt(100000);
    });

    it("Should measure gas for plan updates", async function () {
      // Create initial plan
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const newMonthlySpending = 6000 * 1e8;
      const tx = await retirementCalculator.connect(user1).updateRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        newMonthlySpending,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const receipt = await tx.wait();
      console.log(`Gas used for plan update: ${receipt.gasUsed.toString()}`);
      
      // Gas should be reasonable (typically under 100k for updates)
      expect(receipt.gasUsed).to.be.lt(100000);
    });

    it("Should measure gas for view functions", async function () {
      // Create plan first
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Measure gas for various view functions
      const planGas = await retirementCalculator.connect(user1).getRetirementPlan.estimateGas(user1.address);
      const savingsGas = await retirementCalculator.connect(user1).getUserSavings.estimateGas(user1.address);
      const requiredGas = await retirementCalculator.connect(user1).calculateRequiredInvestment.estimateGas(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      console.log(`Gas for getRetirementPlan: ${planGas.toString()}`);
      console.log(`Gas for getUserSavings: ${savingsGas.toString()}`);
      console.log(`Gas for calculateRequiredInvestment: ${requiredGas.toString()}`);
      
      // View functions should use minimal gas
      expect(planGas).to.be.lt(50000);
      expect(savingsGas).to.be.lt(50000);
      expect(requiredGas).to.be.lt(100000);
    });
  });

  describe("Batch Operations Gas Efficiency", function () {
    it("Should measure gas for multiple deposits", async function () {
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

      // Make 5 deposits
      const depositSize = requiredInvestment.div(5);
      let totalGas = ethers.BigNumber.from(0);

      for (let i = 0; i < 5; i++) {
        const tx = await retirementCalculator.connect(user1).depositFunds({ value: depositSize });
        const receipt = await tx.wait();
        totalGas = totalGas.add(receipt.gasUsed);
      }

      console.log(`Total gas for 5 deposits: ${totalGas.toString()}`);
      console.log(`Average gas per deposit: ${totalGas.div(5).toString()}`);
      
      // Average should be reasonable
      expect(totalGas.div(5)).to.be.lt(150000);
    });

    it("Should measure gas for multiple payments", async function () {
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

      // Execute 10 payments
      let totalGas = ethers.BigNumber.from(0);

      for (let i = 0; i < 10; i++) {
        const tx = await retirementCalculator.connect(user2).executeMonthlyPayment(user1.address);
        const receipt = await tx.wait();
        totalGas = totalGas.add(receipt.gasUsed);
      }

      console.log(`Total gas for 10 payments: ${totalGas.toString()}`);
      console.log(`Average gas per payment: ${totalGas.div(10).toString()}`);
      
      // Average should be reasonable
      expect(totalGas.div(10)).to.be.lt(100000);
    });
  });

  describe("Storage Optimization", function () {
    it("Should optimize storage for multiple users", async function () {
      const users = [user1, user2];
      let totalGas = ethers.BigNumber.from(0);

      for (let i = 0; i < users.length; i++) {
        const tx = await retirementCalculator.connect(users[i]).createRetirementPlan(
          LIFE_EXPECTANCY_YEARS,
          MONTHLY_SPENDING_SCALED,
          RETIREMENT_AGE,
          CURRENT_AGE,
          YIELD_RATE_BPS,
          INFLATION_RATE_BPS
        );

        const receipt = await tx.wait();
        totalGas = totalGas.add(receipt.gasUsed);
      }

      console.log(`Total gas for ${users.length} users: ${totalGas.toString()}`);
      console.log(`Average gas per user: ${totalGas.div(users.length).toString()}`);
      
      // Should be efficient for multiple users
      expect(totalGas.div(users.length)).to.be.lt(200000);
    });

    it("Should measure storage costs for different plan sizes", async function () {
      const smallPlan = await retirementCalculator.connect(user1).createRetirementPlan(
        10, // 10 years
        1000 * 1e8, // $1000 monthly
        60, // retirement age
        50, // current age
        300, // 3% yield
        100  // 1% inflation
      );

      const largePlan = await retirementCalculator.connect(user2).createRetirementPlan(
        30, // 30 years
        10000 * 1e8, // $10000 monthly
        70, // retirement age
        25, // current age
        700, // 7% yield
        300  // 3% inflation
      );

      const smallReceipt = await smallPlan.wait();
      const largeReceipt = await largePlan.wait();

      console.log(`Gas for small plan: ${smallReceipt.gasUsed.toString()}`);
      console.log(`Gas for large plan: ${largeReceipt.gasUsed.toString()}`);
      
      // Both should be reasonable
      expect(smallReceipt.gasUsed).to.be.lt(200000);
      expect(largeReceipt.gasUsed).to.be.lt(200000);
    });
  });

  describe("Price Feed Gas Impact", function () {
    it("Should measure gas impact of price feed calls", async function () {
      const priceGas = await retirementCalculator.getEthUsdPrice.estimateGas();
      const usdToWeiGas = await retirementCalculator.usdToWei.estimateGas(1000 * 1e8);
      const weiToUsdGas = await retirementCalculator.weiToUsd.estimateGas(ethers.utils.parseEther("1"));

      console.log(`Gas for getEthUsdPrice: ${priceGas.toString()}`);
      console.log(`Gas for usdToWei: ${usdToWeiGas.toString()}`);
      console.log(`Gas for weiToUsd: ${weiToUsdGas.toString()}`);
      
      // Price feed operations should be efficient
      expect(priceGas).to.be.lt(50000);
      expect(usdToWeiGas).to.be.lt(50000);
      expect(weiToUsdGas).to.be.lt(50000);
    });

    it("Should measure gas for calculations with different price scenarios", async function () {
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      // Test with different prices
      const prices = [1000 * 1e8, 3000 * 1e8, 10000 * 1e8]; // $1000, $3000, $10000
      
      for (const price of prices) {
        await mockPriceFeed.setPrice(price);
        
        const gas = await retirementCalculator.connect(user1).calculateRequiredInvestment.estimateGas(
          LIFE_EXPECTANCY_YEARS,
          MONTHLY_SPENDING_SCALED,
          RETIREMENT_AGE,
          CURRENT_AGE,
          YIELD_RATE_BPS,
          INFLATION_RATE_BPS
        );

        console.log(`Gas for calculation at $${price / 1e8}: ${gas.toString()}`);
        expect(gas).to.be.lt(100000);
      }
    });
  });

  describe("Event Gas Costs", function () {
    it("Should measure gas cost of events", async function () {
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
      
      console.log(`Gas used for plan creation with event: ${receipt.gasUsed.toString()}`);
      console.log(`Event topics: ${event.topics.length}`);
      
      // Events should add minimal gas overhead
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should measure gas for deposit events", async function () {
      await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );

      const depositAmount = ethers.utils.parseEther("1");
      const tx = await retirementCalculator.connect(user1).depositFunds({ value: depositAmount });

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'FundsDeposited');
      
      console.log(`Gas used for deposit with event: ${receipt.gasUsed.toString()}`);
      console.log(`Event topics: ${event.topics.length}`);
      
      // Events should add minimal gas overhead
      expect(receipt.gasUsed).to.be.lt(150000);
    });
  });

  describe("Gas Optimization Recommendations", function () {
    it("Should provide gas usage summary", async function () {
      console.log("\n=== Gas Usage Summary ===");
      
      // Plan creation
      const planTx = await retirementCalculator.connect(user1).createRetirementPlan(
        LIFE_EXPECTANCY_YEARS,
        MONTHLY_SPENDING_SCALED,
        RETIREMENT_AGE,
        CURRENT_AGE,
        YIELD_RATE_BPS,
        INFLATION_RATE_BPS
      );
      const planReceipt = await planTx.wait();
      console.log(`Plan Creation: ${planReceipt.gasUsed.toString()} gas`);

      // Deposit
      const depositTx = await retirementCalculator.connect(user1).depositFunds({ 
        value: ethers.utils.parseEther("1") 
      });
      const depositReceipt = await depositTx.wait();
      console.log(`Deposit: ${depositReceipt.gasUsed.toString()} gas`);

      // View functions
      const planGas = await retirementCalculator.getRetirementPlan.estimateGas(user1.address);
      const savingsGas = await retirementCalculator.getUserSavings.estimateGas(user1.address);
      console.log(`View Functions: ${planGas.add(savingsGas).toString()} gas total`);

      // Summary
      const totalGas = planReceipt.gasUsed.add(depositReceipt.gasUsed).add(planGas).add(savingsGas);
      console.log(`Total Gas Used: ${totalGas.toString()}`);
      console.log("=== End Summary ===\n");
      
      // All operations should be gas efficient
      expect(totalGas).to.be.lt(400000);
    });
  });
}); 