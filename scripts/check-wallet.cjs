const { ethers } = require("ethers");

/**
 * Check wallet balance and network connection
 */

async function checkWallet() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.ARC_RPC_URL || "https://rpc.arc.network";
  const chainId = parseInt(process.env.ARC_CHAIN_ID || "12345");

  if (!privateKey) {
    console.log("❌ PRIVATE_KEY environment variable is not set");
    console.log("\nUsage:");
    console.log("  PRIVATE_KEY=your_key node scripts/check-wallet.js");
    return;
  }

  try {
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("🔍 Checking wallet...");
    console.log("=".repeat(50));
    console.log("Wallet Address:", wallet.address);
    console.log("Network:", rpcUrl);
    console.log("Chain ID:", chainId);

    // Check network
    const network = await provider.getNetwork();
    console.log("Connected Chain ID:", network.chainId.toString());

    if (network.chainId.toString() !== chainId.toString()) {
      console.log("⚠️  Warning: Chain ID mismatch!");
      console.log("   Expected:", chainId);
      console.log("   Got:", network.chainId.toString());
    }

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log("Balance:", balanceEth, "ETH (or native token)");

    if (balance === 0n) {
      console.log("\n❌ Wallet has no balance!");
      console.log("   You need native tokens for gas fees.");
      console.log("   Please fund your wallet first.");
    } else {
      console.log("\n✅ Wallet is ready for deployment!");
      console.log("   Estimated gas cost: ~0.001-0.01 ETH (varies)");
    }

    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("invalid private key")) {
      console.log("\n💡 Make sure your private key:");
      console.log("   - Does NOT include '0x' prefix");
      console.log("   - Is 64 characters long (hex)");
    } else if (error.message.includes("network")) {
      console.log("\n💡 Check your RPC URL and network connection");
    }
  }
}

checkWallet();

