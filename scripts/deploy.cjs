const { ethers } = require("hardhat");

/**
 * Deployment script for vUSDC Token and Faucet
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.js --network arc
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy vUSDC Token
  console.log("\n1. Deploying vUSDC Token...");
  const vUSDC = await ethers.getContractFactory("vUSDC");
  const vusdc = await vUSDC.deploy(deployer.address); // Deployer is the initial owner
  await vusdc.waitForDeployment();
  const vusdcAddress = await vusdc.getAddress();
  console.log("vUSDC Token deployed to:", vusdcAddress);
  console.log("Initial supply:", (await vusdc.totalSupply()).toString());

  // Deploy Faucet
  console.log("\n2. Deploying vUSDC Faucet...");
  const Faucet = await ethers.getContractFactory("vUSDCFaucet");
  const faucet = await Faucet.deploy(vusdcAddress, deployer.address);
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log("Faucet deployed to:", faucetAddress);

  // Transfer tokens to faucet (10 million vUSDC for faucet)
  console.log("\n3. Transferring tokens to faucet...");
  const faucetAmount = ethers.parseEther("10000000"); // 10 million vUSDC
  await vusdc.transfer(faucetAddress, faucetAmount);
  console.log("Transferred", ethers.formatEther(faucetAmount), "vUSDC to faucet");
  console.log("Faucet balance:", ethers.formatEther(await vusdc.balanceOf(faucetAddress)));

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("vUSDC Token:", vusdcAddress);
  console.log("Faucet:", faucetAddress);
  console.log("Deployer:", deployer.address);
  console.log("\n💾 Add these to your .env file:");
  console.log(`VITE_VUSDC_TOKEN_ADDRESS=${vusdcAddress}`);
  console.log(`VITE_FAUCET_ADDRESS=${faucetAddress}`);
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

