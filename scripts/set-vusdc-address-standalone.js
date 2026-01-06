/**
 * Standalone script to set vUSDC token address in VoltProtocol contract
 * 
 * This script uses ethers.js directly and can be run with Node.js.
 * 
 * Usage:
 *   node scripts/set-vusdc-address-standalone.js
 * 
 * Required environment variables:
 *   - PRIVATE_KEY: Private key of the contract owner
 *   - RPC_URL: RPC endpoint URL (default: https://rpc.testnet.arc.network)
 *   - CONTRACT_ADDRESS: VoltProtocol contract address
 *   - VUSDC_TOKEN_ADDRESS: vUSDC token address to set
 */

const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("=".repeat(60));
  console.log("Setting vUSDC Token Address in VoltProtocol Contract");
  console.log("=".repeat(60));
  
  // Get configuration from environment
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.RPC_URL || process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS || "0xBcB7fBe6CaEf1Dbc45a18ADcA7FD2394268f3BAD";
  const VUSDC_TOKEN_ADDRESS = process.env.VUSDC_ADDRESS || process.env.VITE_VUSDC_TOKEN_ADDRESS || "0xe4987ACA7b7fAB6f4291b33E24873A79E721e9c2";
  
  if (!PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY environment variable is required!");
  }
  
  console.log("\nConfiguration:");
  console.log("  RPC URL:", RPC_URL);
  console.log("  Contract address:", CONTRACT_ADDRESS);
  console.log("  vUSDC token address:", VUSDC_TOKEN_ADDRESS);
  
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("\nOwner address:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Owner balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("❌ Owner wallet has no balance! Please fund the wallet first.");
  }
  
  // Contract ABI
  const VoltProtocolABI = [
    "function vusdcTokenAddress() view returns (address)",
    "function setVusdcTokenAddress(address _vusdcTokenAddress) external",
    "function owner() view returns (address)"
  ];
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, VoltProtocolABI, wallet);
  
  // Check current owner
  console.log("\n1. Checking contract owner...");
  try {
    const contractOwner = await contract.owner();
    console.log("   Contract owner:", contractOwner);
    
    if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(
        `❌ ERROR: You are not the contract owner!\n` +
        `   Contract owner: ${contractOwner}\n` +
        `   Your address: ${wallet.address}\n` +
        `   Please use the owner wallet to run this script.`
      );
    }
    console.log("   ✓ You are the contract owner");
  } catch (error) {
    console.error("   ❌ Error checking owner:", error.message);
    throw error;
  }
  
  // Check current vUSDC address
  console.log("\n2. Checking current vUSDC token address...");
  try {
    const currentAddress = await contract.vusdcTokenAddress();
    console.log("   Current vUSDC address:", currentAddress);
    
    if (currentAddress.toLowerCase() === VUSDC_TOKEN_ADDRESS.toLowerCase()) {
      console.log("   ✓ vUSDC token address is already set correctly!");
      console.log("\n" + "=".repeat(60));
      console.log("✅ No action needed - address is already correct");
      console.log("=".repeat(60));
      return;
    }
    
    if (currentAddress === "0x0000000000000000000000000000000000000000") {
      console.log("   ⚠️  vUSDC token address is not set (address(0))");
    } else {
      console.log("   ⚠️  vUSDC token address is different from expected");
    }
  } catch (error) {
    console.log("   ⚠️  Could not read current address (might not be set):", error.message);
  }
  
  // Set vUSDC token address
  console.log("\n3. Setting vUSDC token address...");
  try {
    console.log("   Calling setVusdcTokenAddress(", VUSDC_TOKEN_ADDRESS, ")...");
    const tx = await contract.setVusdcTokenAddress(VUSDC_TOKEN_ADDRESS);
    console.log("   Transaction sent:", tx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("   ✓ Transaction confirmed in block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    
    // Verify the address was set
    console.log("\n4. Verifying vUSDC token address was set...");
    const newAddress = await contract.vusdcTokenAddress();
    console.log("   New vUSDC address:", newAddress);
    
    if (newAddress.toLowerCase() === VUSDC_TOKEN_ADDRESS.toLowerCase()) {
      console.log("   ✓ vUSDC token address successfully set!");
    } else {
      throw new Error("Address mismatch after setting!");
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUCCESS! vUSDC token address has been set");
    console.log("=".repeat(60));
    console.log("\nContract:", CONTRACT_ADDRESS);
    console.log("vUSDC Token:", VUSDC_TOKEN_ADDRESS);
    console.log("Transaction:", tx.hash);
    console.log("\n✅ Users can now create streams with vUSDC tokens!");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ ERROR setting vUSDC token address:", error.message);
    
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.error("\n   This error means you are not the contract owner.");
      console.error("   Please use the owner wallet to run this script.");
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

