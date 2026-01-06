const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Reset Faucet Cooldown Script
 * 
 * Resets the cooldown for a user address on the blockchain
 * 
 * Usage:
 *   npx hardhat run scripts/reset-cooldown.cjs --network arc
 * 
 * Or with user address:
 *   USER_ADDRESS=0x... npx hardhat run scripts/reset-cooldown.cjs --network arc
 */

async function main() {
  const FAUCET_ADDRESS = process.env.VITE_FAUCET_ADDRESS || "0x9565d019F6b458E66D38d235573A0855B28D4150";
  const USER_ADDRESS = process.env.USER_ADDRESS;

  if (!USER_ADDRESS) {
    console.error("❌ Please provide USER_ADDRESS environment variable");
    console.log("Usage: USER_ADDRESS=0x... npx hardhat run scripts/reset-cooldown.cjs --network arc");
    process.exit(1);
  }

  console.log("🔄 Resetting cooldown for user:", USER_ADDRESS);
  console.log("📍 Faucet address:", FAUCET_ADDRESS);

  // Get signer (must be contract owner)
  const [signer] = await ethers.getSigners();
  console.log("👤 Signer (must be owner):", signer.address);

  // Get faucet contract
  const Faucet = await ethers.getContractFactory("vUSDCFaucet");
  const faucet = Faucet.attach(FAUCET_ADDRESS);

  // Check if signer is owner
  const owner = await faucet.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("❌ Error: Signer is not the contract owner!");
    console.log("   Owner:", owner);
    console.log("   Signer:", signer.address);
    process.exit(1);
  }

  // Check current cooldown status
  try {
    const lastRequest = await faucet.lastRequestTime(USER_ADDRESS);
    const lastRequestNum = Number(lastRequest);
    
    if (lastRequestNum === 0) {
      console.log("ℹ️  User has no cooldown (never requested tokens)");
    } else {
      const lastRequestDate = new Date(lastRequestNum * 1000);
      console.log("📅 Last request time:", lastRequestDate.toISOString());
      console.log("   Timestamp:", lastRequestNum);
    }
  } catch (err) {
    console.warn("⚠️  Could not check current cooldown:", err.message);
  }

  // Reset cooldown
  console.log("\n🔄 Resetting cooldown...");
  try {
    const tx = await faucet.resetCooldown(USER_ADDRESS);
    console.log("📝 Transaction hash:", tx.hash);
    
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Cooldown reset successful!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
  } catch (err) {
    console.error("❌ Error resetting cooldown:", err.message);
    
    if (err.message.includes("resetCooldown")) {
      console.error("\n💡 Tip: The contract might not have the resetCooldown function yet.");
      console.error("   You may need to redeploy the contract with the new function.");
    }
    process.exit(1);
  }

  // Verify reset
  console.log("\n🔍 Verifying reset...");
  const newLastRequest = await faucet.lastRequestTime(USER_ADDRESS);
  if (Number(newLastRequest) === 0) {
    console.log("✅ Cooldown successfully reset! User can now request tokens.");
  } else {
    console.warn("⚠️  Warning: Cooldown might not be fully reset. Last request:", newLastRequest.toString());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

