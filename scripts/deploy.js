const hre = require("hardhat");

async function main() {
  // Chainlink ETH/USD price feed address for Sepolia
  const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  const [deployer] = await hre.ethers.getSigners();

  const RetirementCalculator = await hre.ethers.getContractFactory("RetirementCalculator");
  const contract = await RetirementCalculator.deploy(priceFeedAddress, deployer.address);

  await contract.deployed();

  console.log("RetirementCalculator deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 