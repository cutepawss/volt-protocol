const { ethers } = require("hardhat");

/**
 * Local deployment script for testing
 * Deploys to Hardhat local network
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy vUSDC Token
  console.log("\n1. Deploying vUSDC Token...");
  const vUSDC = await ethers.getContractFactory("vUSDC");
  const vusdc = await vUSDC.deploy(deployer.address);
  await vusdc.waitForDeployment();
  const vusdcAddress = await vusdc.getAddress();
  console.log("✅ vUSDC Token deployed to:", vusdcAddress);
  
  const totalSupply = await vusdc.totalSupply();
  console.log("✅ Initial supply:", ethers.formatEther(totalSupply), "vUSDC");

  // Deploy Faucet
  console.log("\n2. Deploying vUSDC Faucet...");
  const Faucet = await ethers.getContractFactory("vUSDCFaucet");
  const faucet = await Faucet.deploy(vusdcAddress, deployer.address);
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log("✅ Faucet deployed to:", faucetAddress);

  // Transfer tokens to faucet (10 million vUSDC for faucet)
  console.log("\n3. Transferring tokens to faucet...");
  const faucetAmount = ethers.parseEther("10000000"); // 10 million vUSDC
  const transferTx = await vusdc.transfer(faucetAddress, faucetAmount);
  await transferTx.wait();
  console.log("✅ Transferred", ethers.formatEther(faucetAmount), "vUSDC to faucet");
  
  const faucetBalance = await vusdc.balanceOf(faucetAddress);
  console.log("✅ Faucet balance:", ethers.formatEther(faucetBalance), "vUSDC");

  // Test faucet request
  console.log("\n4. Testing faucet...");
  const testUser = (await ethers.getSigners())[1];
  console.log("Test user:", testUser.address);
  
  const faucetContract = await ethers.getContractAt("vUSDCFaucet", faucetAddress, testUser);
  const requestTx = await faucetContract.requestTokens();
  await requestTx.wait();
  console.log("✅ Test user requested tokens successfully");
  
  const userBalance = await vusdc.balanceOf(testUser.address);
  console.log("✅ Test user balance:", ethers.formatEther(userBalance), "vUSDC");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(50));
  console.log("\n📋 Contract Addresses:");
  console.log("vUSDC Token:", vusdcAddress);
  console.log("Faucet:", faucetAddress);
  console.log("\n💡 For Arc Network deployment:");
  console.log("1. Add your PRIVATE_KEY to .env file");
  console.log("2. Run: npm run deploy:arc");
  console.log("3. Copy the addresses to your .env file:");
  console.log(`   VITE_VUSDC_TOKEN_ADDRESS=${vusdcAddress}`);
  console.log(`   VITE_FAUCET_ADDRESS=${faucetAddress}`);
  console.log("\n" + "=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

