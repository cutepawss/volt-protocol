const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script to set vUSDC token address in VoltProtocol contract
 * 
 * This script must be run by the contract owner.
 * 
 * Usage:
 *   npx hardhat run scripts/set-vusdc-address.cjs --network arc
 * 
 * Or with custom addresses:
 *   CONTRACT_ADDRESS=0x... VUSDC_ADDRESS=0x... npx hardhat run scripts/set-vusdc-address.cjs --network arc
 */

async function main() {
  const [owner] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("Setting vUSDC Token Address in VoltProtocol Contract");
  console.log("=".repeat(60));
  console.log("\nOwner address:", owner.address);
  console.log("Owner balance:", ethers.formatEther(await ethers.provider.getBalance(owner.address)), "ETH");
  
  // Get addresses from environment or use defaults
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS || "0xBcB7fBe6CaEf1Dbc45a18ADcA7FD2394268f3BAD";
  const VUSDC_TOKEN_ADDRESS = process.env.VUSDC_ADDRESS || process.env.VITE_VUSDC_TOKEN_ADDRESS || "0xe4987ACA7b7fAB6f4291b33E24873A79E721e9c2";
  
  console.log("\nContract address:", CONTRACT_ADDRESS);
  console.log("vUSDC token address:", VUSDC_TOKEN_ADDRESS);
  
  // Load VoltProtocol contract
  console.log("\n1. Loading VoltProtocol contract...");
  const VoltProtocolABI = [
    "function vusdcTokenAddress() view returns (address)",
    "function setVusdcTokenAddress(address _vusdcTokenAddress) external",
    "function owner() view returns (address)"
  ];
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, VoltProtocolABI, owner);
  
  // Check current owner
  console.log("\n2. Checking contract owner...");
  try {
    const contractOwner = await contract.owner();
    console.log("   Contract owner:", contractOwner);
    
    if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(
        `❌ ERROR: You are not the contract owner!\n` +
        `   Contract owner: ${contractOwner}\n` +
        `   Your address: ${owner.address}\n` +
        `   Please use the owner wallet to run this script.`
      );
    }
    console.log("   ✓ You are the contract owner");
  } catch (error) {
    console.error("   ❌ Error checking owner:", error.message);
    throw error;
  }
  
  // Check current vUSDC address
  console.log("\n3. Checking current vUSDC token address...");
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
  console.log("\n4. Setting vUSDC token address...");
  try {
    console.log("   Calling setVusdcTokenAddress(", VUSDC_TOKEN_ADDRESS, ")...");
    const tx = await contract.setVusdcTokenAddress(VUSDC_TOKEN_ADDRESS);
    console.log("   Transaction sent:", tx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("   ✓ Transaction confirmed in block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    
    // Verify the address was set
    console.log("\n5. Verifying vUSDC token address was set...");
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

