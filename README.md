# XeyaRetirement - DeFi Retirement Calculator

A Solidity smart contract that calculates the required investment amount for pension planning using Pendle Finance yield-bearing instruments. The contract takes into account life expectancy, monthly spending requirements, and various financial parameters to determine the optimal investment strategy. **Once the target savings amount is reached, the contract automatically schedules and executes monthly payments to the user's wallet.**

## Features

- **Retirement Plan Calculation**: Calculate required investment amount based on life expectancy and monthly spending
- **Inflation Adjustment**: Accounts for inflation to maintain purchasing power over time
- **Yield Rate Integration**: Integrates with Pendle Finance yield rates for accurate calculations
- **Real-time Updates**: Update pension plans as circumstances change
- **Present Value Calculations**: Uses time value of money principles for accurate financial planning
- **🆕 Automatic Monthly Payments**: Automatically schedules and executes monthly payments once target is reached
- **🆕 Fund Management**: Track deposits, target amounts, and payment status
- **🆕 Time-based Scheduling**: Enforces monthly payment intervals (30 days)
- **🆕 Multi-user Support**: Each user has independent pension plans and payment schedules
- **🆕 Modern Frontend**: Beautiful React application with TypeScript and Tailwind CSS

## Project Structure

```
xeyapension/
├── RetirementCalculator.sol          # Main smart contract
├── package.json                   # Backend dependencies and scripts
├── hardhat.config.js             # Hardhat configuration
├── scripts/
│   ├── deploy.js                 # Deployment script
│   └── example.js                # Usage examples
├── test/
│   └── RetirementCalculator.test.js # Test suite
├── frontend/                     # 🆕 React frontend application
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── types/               # TypeScript definitions
│   │   ├── utils/               # Contract utilities
│   │   └── App.tsx              # Main application
│   ├── package.json             # Frontend dependencies
│   ├── tailwind.config.js       # Tailwind configuration
│   └── README.md                # Frontend documentation
├── env.example                   # Environment variables template
└── .gitignore                    # Git ignore rules
```

## Quick Start

### Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Compile the contract**:
   ```bash
   npm run compile
   ```

4. **Deploy locally**:
   ```bash
   npx hardhat node
   npm run deploy
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update contract addresses**:
   Edit `src/utils/contract.ts` and update the contract addresses with your deployed contract.

4. **Start the frontend**:
   ```bash
   npm start
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## How It Works

The smart contract uses the following formula to calculate the required investment:

1. **Present Value Calculation**: Each future monthly payment is discounted to present value using the real yield rate (nominal yield - inflation)
2. **Inflation Adjustment**: Monthly spending amounts are adjusted for inflation over the retirement period
3. **Life Expectancy**: Total retirement period is calculated based on life expectancy after retirement
4. **Investment Requirement**: Sum of all present values gives the total required investment
5. **🆕 Automatic Payments**: Once the target amount is reached, monthly payments are automatically initiated and scheduled

### Payment Flow

1. **Create Retirement Plan**: User creates a retirement plan with their parameters
2. **Deposit Funds**: User deposits funds towards their target amount
3. **Target Reached**: When total deposits reach the calculated target, payments automatically start
4. **Monthly Payments**: Contract sends monthly payments to user's wallet every 30 days
5. **Payment Completion**: Payments continue until all scheduled payments are completed

### Key Parameters

- **Life Expectancy**: Years expected to live after retirement
- **Monthly Spending**: Required monthly income during retirement (in wei)
- **Retirement Age**: Age at which retirement begins
- **Current Age**: Current age of the person
- **Yield Rate**: Expected annual yield from Pendle Finance (in basis points, e.g., 500 = 5%)
- **Inflation Rate**: Expected annual inflation rate (in basis points, e.g., 200 = 2%)

## Smart Contract Functions

### Core Functions

#### `calculateRequiredInvestment()`
Calculates the required investment amount for a pension plan.

```solidity
function calculateRequiredInvestment(
    uint256 lifeExpectancyYears,
    uint256 monthlySpending,
    uint256 retirementAge,
    uint256 currentAge,
    uint256 yieldRate,
    uint256 inflationRate
) public pure returns (uint256 requiredInvestment)
```

#### `createRetirementPlan()`
Creates a new pension plan for the caller.

```solidity
function createRetirementPlan(
    uint256 lifeExpectancyYears,
    uint256 monthlySpending,
    uint256 retirementAge,
    uint256 currentAge,
    uint256 yieldRate,
    uint256 inflationRate
) external
```

#### `updateRetirementPlan()`
Updates an existing pension plan with new parameters.

#### `getRequiredInvestment()`
Gets the required investment amount for a user's pension plan.

#### `calculateMonthlyPayment()`
Calculates the monthly payment amount from a given investment.

### 🆕 New Payment Functions

#### `depositFunds()`
Deposit funds towards the pension target. Automatically starts payments when target is reached.

```solidity
function depositFunds() external payable
```

#### `executeMonthlyPayment()`
Execute the next monthly payment for a user (can be called by anyone).

```solidity
function executeMonthlyPayment(address user) external
```

#### `getUserSavings()`
Get the savings and payment status for a user.

```solidity
function getUserSavings(address user) external view returns (UserSavings memory)
```

#### `hasReachedTarget()`
Check if a user has reached their target amount.

```solidity
function hasReachedTarget(address user) external view returns (bool)
```

#### `getRemainingAmount()`
Get the remaining amount needed to reach the target.

```solidity
function getRemainingAmount(address user) external view returns (uint256)
```

## Frontend Features

### 🆕 Modern User Interface
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Live calculation updates as you change parameters
- **Progress Tracking**: Visual progress bars and status indicators
- **Wallet Integration**: Seamless MetaMask connection
- **Transaction Management**: Easy deposit and payment execution

### 🆕 Key Components
- **RetirementCalculator**: Form for creating and calculating retirement plans
- **RetirementDashboard**: Dashboard for monitoring savings and payments
- **WalletConnect**: MetaMask wallet connection component
- **Header**: Navigation and branding

### 🆕 User Experience
- **Intuitive Forms**: Easy-to-use input forms with validation
- **Visual Feedback**: Progress bars, status indicators, and notifications
- **Error Handling**: Clear error messages and recovery options
- **Loading States**: Smooth loading animations and feedback

## Example Usage

### Smart Contract
```javascript
// Example: Calculate required investment for a 30-year-old planning to retire at 65
// with 20 years life expectancy, $5000 monthly spending, 5% yield, 2% inflation

const requiredInvestment = await retirementCalculator.calculateRequiredInvestment(
    20,                    // Life expectancy years
    ethers.parseEther("5000"), // Monthly spending
    65,                    // Retirement age
    30,                    // Current age
    500,                   // 5% yield rate
    200                    // 2% inflation rate
);
```

### Frontend
```typescript
// Complete pension planning workflow
const data = {
  lifeExpectancyYears: 20,
  monthlySpending: 5000,
  retirementAge: 65,
  currentAge: 30,
  yieldRate: 5.0,
  inflationRate: 2.0
};

// Calculate and create plan
const amount = await calculateInvestment(data);
await createRetirementPlan(data);

// Deposit funds
await depositFunds(parseFloat(amount));
```

## Integration with Pendle Finance

The contract is designed to integrate with Pendle Finance yield-bearing instruments. Key integration points:

1. **Yield Rate Updates**: The contract owner can update yield rates from Pendle Finance
2. **Historical Data**: Stores historical yield rates for analysis
3. **Real-time Calculations**: Uses current yield rates for accurate calculations

### Pendle Finance Integration

To integrate with actual Pendle Finance data:

1. Implement an oracle or API call to fetch current Pendle Finance yield rates
2. Update the `getLatestYieldRate()` function to fetch real-time data
3. Set up automated yield rate updates using Chainlink or similar oracle

## Testing

### Backend Testing
```bash
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## Security Considerations

- **Access Control**: Only the contract owner can update yield rates
- **Input Validation**: All inputs are validated to prevent invalid calculations
- **Safe Math**: Uses OpenZeppelin's SafeMath library to prevent overflow/underflow
- **Basis Points**: Uses basis points (1/100th of a percent) for precise rate calculations
- **🆕 Reentrancy Protection**: Uses ReentrancyGuard to prevent reentrancy attacks
- **🆕 Payment Scheduling**: Enforces time-based payment intervals to prevent abuse
- **🆕 Fund Safety**: Emergency withdrawal function for owner in critical situations

## Events

The contract emits the following events for tracking:

- `RetirementPlanCreated`: When a new retirement plan is created
- `RetirementPlanUpdated`: When a retirement plan is updated
- `YieldRateUpdated`: When yield rate is updated
- `🆕 FundsDeposited`: When funds are deposited
- `🆕 TargetReached`: When target amount is reached and payments start
- `🆕 MonthlyPaymentSent`: When a monthly payment is sent
- `🆕 PaymentsCompleted`: When all payments are completed

## Deployment

### Local Development
```bash
# Start local blockchain
npx hardhat node

# Deploy contract
npm run deploy

# Start frontend
cd frontend
npm start
```

### Testnet Deployment
```bash
# Deploy to testnet
npm run deploy:testnet

# Update frontend contract addresses
# Edit frontend/src/utils/contract.ts
```

### Mainnet Deployment
```bash
# Deploy to mainnet
npm run deploy:mainnet

# Update frontend contract addresses
# Edit frontend/src/utils/contract.ts
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Disclaimer

This smart contract is for educational and demonstration purposes. Always consult with financial advisors before making investment decisions. The calculations are based on assumptions and may not reflect actual market conditions or individual circumstances. 