# Frontend Setup Guide

## Environment Configuration

Before running the frontend, you need to configure the smart contract addresses. Create a `.env` file in the frontend directory with the following variables:

```env
# Pension Calculator Smart Contract Address
# Replace with the actual deployed contract address
REACT_APP_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Chainlink ETH/USD Price Feed Address (Mainnet)
# Replace with the actual Chainlink price feed address for your network
REACT_APP_ETH_USD_PRICE_FEED=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
```

## Contract Addresses

### Mainnet
- **Chainlink ETH/USD Price Feed**: `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`

### Testnet (Goerli)
- **Chainlink ETH/USD Price Feed**: `0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e`

### Testnet (Sepolia)
- **Chainlink ETH/USD Price Feed**: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

## Deployment Steps

1. **Deploy the Smart Contract**:
   ```bash
   # Deploy PensionCalculator.sol with the Chainlink price feed address
   npx hardhat deploy --network mainnet
   ```

2. **Update Environment Variables**:
   - Copy the deployed contract address
   - Update `REACT_APP_CONTRACT_ADDRESS` in `.env`

3. **Start the Frontend**:
   ```bash
   npm start
   ```

## Features

The frontend now includes:

- **Real-time Dashboard**: Fetches actual data from the smart contract
- **Smart Contract Integration**: All calculations use the on-chain contract
- **USD/ETH Conversion**: Uses Chainlink price feeds for accurate conversions
- **Pension Plan Creation**: Users can create and manage pension plans
- **Progress Tracking**: Real-time tracking of savings progress
- **Payment Status**: Shows payment eligibility and status

## Wallet Requirements

Users need:
- MetaMask or compatible Web3 wallet
- ETH for gas fees
- Connection to the correct network (mainnet/testnet)

## Troubleshooting

### Common Issues

1. **"Contract not found"**: Check that `REACT_APP_CONTRACT_ADDRESS` is correct
2. **"Price feed error"**: Verify the Chainlink price feed address for your network
3. **"Transaction failed"**: Ensure user has sufficient ETH for gas fees
4. **"Network error"**: Make sure user is connected to the correct network

### Development

For local development, you can:
1. Deploy to a local Hardhat network
2. Use a testnet for testing
3. Mock the contract calls for UI development 