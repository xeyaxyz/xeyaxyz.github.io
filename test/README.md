# RetirementCalculator Test Suite

This comprehensive test suite covers all aspects of the RetirementCalculator smart contract, including functionality, security, gas optimization, and integration testing.

## Test Files Overview

### 1. `RetirementCalculator.test.js` - Core Functionality Tests
**Purpose**: Tests all basic contract functions and edge cases.

**Coverage**:
- ✅ Contract deployment and initialization
- ✅ Price feed integration (ETH/USD conversion)
- ✅ Retirement plan creation and management
- ✅ Fund deposits and withdrawals
- ✅ Monthly payment execution
- ✅ Plan updates and deactivation
- ✅ Utility functions and calculations
- ✅ Error handling and edge cases

**Key Test Scenarios**:
- Plan creation with various parameters
- Multiple deposits and target achievement
- Payment execution and completion
- Plan updates and state management
- Access control and permissions

### 2. `Integration.test.js` - End-to-End Integration Tests
**Purpose**: Tests complete user workflows and complex scenarios.

**Coverage**:
- ✅ Complete retirement cycle (plan → deposits → payments → completion)
- ✅ Multiple users with different plans
- ✅ Partial deposits and gradual target achievement
- ✅ Stress testing with rapid operations
- ✅ Price feed updates and extreme scenarios
- ✅ Contract state consistency
- ✅ Error recovery and resilience

**Key Test Scenarios**:
- Full retirement lifecycle simulation
- Multiple concurrent users
- Price volatility handling
- System stress testing
- Data integrity verification

### 3. `GasOptimization.test.js` - Gas Usage Analysis
**Purpose**: Measures and optimizes gas consumption for all operations.

**Coverage**:
- ✅ Gas measurement for all contract functions
- ✅ Batch operation efficiency
- ✅ Storage optimization analysis
- ✅ Price feed gas impact
- ✅ Event gas costs
- ✅ Optimization recommendations

**Key Metrics**:
- Plan creation: < 200k gas
- Deposits: < 150k gas
- Payments: < 100k gas
- View functions: < 50k gas
- Batch operations efficiency

### 4. `Security.test.js` - Security Vulnerability Tests
**Purpose**: Identifies and prevents common security vulnerabilities.

**Coverage**:
- ✅ Access control and permissions
- ✅ Input validation and sanitization
- ✅ Reentrancy attack prevention
- ✅ State consistency verification
- ✅ Price feed security
- ✅ Mathematical overflow/underflow protection
- ✅ Front-running protection
- ✅ DoS attack prevention

**Security Checks**:
- Only authorized users can modify their plans
- Input parameters are properly validated
- ReentrancyGuard protection is active
- State remains consistent after failed operations
- Price feed manipulation is handled gracefully

## Running the Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Files
```bash
# Core functionality tests
npx hardhat test test/RetirementCalculator.test.js

# Integration tests
npx hardhat test test/Integration.test.js

# Gas optimization tests
npx hardhat test test/GasOptimization.test.js

# Security tests
npx hardhat test test/Security.test.js
```

### Run Tests with Verbose Output
```bash
npx hardhat test --verbose
```

### Run Tests with Gas Reporting
```bash
npx hardhat test --gas
```

## Test Configuration

### Mock Contracts
- **MockPriceFeed.sol**: Simulates Chainlink price feed for testing
- Configurable ETH/USD price for different scenarios
- Implements AggregatorV3Interface

### Test Parameters
```javascript
const LIFE_EXPECTANCY_YEARS = 20;
const MONTHLY_SPENDING_USD = 5000;
const RETIREMENT_AGE = 65;
const CURRENT_AGE = 30;
const YIELD_RATE_BPS = 500; // 5%
const INFLATION_RATE_BPS = 200; // 2%
```

### Test Accounts
- `owner`: Contract owner with administrative privileges
- `user1`, `user2`, `user3`: Regular users for testing
- `attacker`: Malicious actor for security testing

## Interpreting Test Results

### ✅ Passing Tests
- All functionality works as expected
- Gas usage is within acceptable limits
- Security measures are effective
- Integration flows complete successfully

### ❌ Failing Tests
- **Functionality Failures**: Contract logic issues
- **Gas Limit Exceeded**: Operations too expensive
- **Security Vulnerabilities**: Potential attack vectors
- **Integration Issues**: Workflow problems

### Performance Metrics
- **Gas Usage**: Should be under specified limits
- **Execution Time**: Tests should complete quickly
- **Memory Usage**: Should not cause out-of-memory errors

## Test Categories

### Unit Tests
- Individual function testing
- Parameter validation
- Return value verification
- Error condition handling

### Integration Tests
- Multi-step workflows
- User interaction scenarios
- System state verification
- Cross-function dependencies

### Security Tests
- Access control verification
- Input validation testing
- Attack vector simulation
- State consistency checks

### Performance Tests
- Gas usage measurement
- Execution time analysis
- Storage efficiency testing
- Optimization validation

## Common Test Patterns

### Setup Pattern
```javascript
beforeEach(async function () {
  [owner, user1, user2] = await ethers.getSigners();
  // Deploy contracts
  // Set up initial state
});
```

### Assertion Pattern
```javascript
// Functionality assertions
expect(result).to.equal(expectedValue);

// Gas usage assertions
expect(receipt.gasUsed).to.be.lt(maxGas);

// Security assertions
await expect(maliciousCall).to.be.revertedWith("Error message");
```

### Event Testing
```javascript
const receipt = await tx.wait();
const event = receipt.events.find(e => e.event === 'EventName');
expect(event.args.parameter).to.equal(expectedValue);
```

## Troubleshooting

### Common Issues

1. **Test Timeout**
   - Increase timeout in hardhat config
   - Check for infinite loops in contract logic

2. **Gas Limit Exceeded**
   - Optimize contract functions
   - Reduce test data size
   - Check for inefficient loops

3. **Inconsistent State**
   - Verify proper state management
   - Check for race conditions
   - Ensure proper cleanup

4. **Mock Contract Issues**
   - Verify mock contract implementation
   - Check interface compatibility
   - Ensure proper deployment

### Debugging Tips

1. **Use console.log for debugging**
   ```javascript
   console.log("Debug value:", value);
   ```

2. **Check transaction receipts**
   ```javascript
   const receipt = await tx.wait();
   console.log("Gas used:", receipt.gasUsed.toString());
   ```

3. **Verify contract state**
   ```javascript
   const state = await contract.getState();
   console.log("Contract state:", state);
   ```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test"
    }
  }
}
```

## Coverage Reports

### Generate Coverage Report
```bash
npx hardhat coverage
```

### Coverage Targets
- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 95%
- **Lines**: > 90%

## Best Practices

1. **Test Organization**
   - Group related tests in describe blocks
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)

2. **Test Data**
   - Use realistic test parameters
   - Test edge cases and boundary conditions
   - Include both positive and negative test cases

3. **Gas Optimization**
   - Monitor gas usage in tests
   - Optimize expensive operations
   - Use efficient data structures

4. **Security Testing**
   - Test all access control mechanisms
   - Verify input validation
   - Simulate common attack vectors

5. **Maintenance**
   - Keep tests up to date with contract changes
   - Refactor tests for better maintainability
   - Document complex test scenarios

## Contributing

When adding new tests:

1. **Follow existing patterns**
2. **Add comprehensive coverage**
3. **Include edge cases**
4. **Document complex scenarios**
5. **Update this README if needed**

## Support

For test-related issues:
1. Check the troubleshooting section
2. Review existing test patterns
3. Consult the contract documentation
4. Open an issue with detailed information 