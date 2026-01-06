const { ethers } = require('ethers');
require('dotenv').config();

// Contract ABI - sadece ihtiyacımız olan fonksiyon
const VOLT_ABI = [
  "function setVusdcTokenAddress(address _vusdcTokenAddress) external",
  "function vusdcTokenAddress() external view returns (address)",
  "function owner() external view returns (address)"
];

async function fixVusdcAddress() {
  try {
    console.log('🔧 Starting vUSDC address configuration...\n');

    // Environment variables
    const RPC_URL = process.env.VITE_RPC_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS;
    const VUSDC_ADDRESS = process.env.VITE_VUSDC_TOKEN_ADDRESS;

    // Validation
    if (!RPC_URL) throw new Error('VITE_RPC_URL not found in .env');
    if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not found in .env');
    if (!CONTRACT_ADDRESS) throw new Error('VITE_CONTRACT_ADDRESS not found in .env');
    if (!VUSDC_ADDRESS) throw new Error('VITE_VUSDC_TOKEN_ADDRESS not found in .env');

    console.log('📋 Configuration:');
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   vUSDC Token: ${VUSDC_ADDRESS}\n`);

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`👤 Using wallet: ${wallet.address}\n`);

    // Connect to contract
    const voltContract = new ethers.Contract(CONTRACT_ADDRESS, VOLT_ABI, wallet);

    // Verify ownership
    console.log('🔍 Verifying ownership...');
    const owner = await voltContract.owner();
    console.log(`   Contract owner: ${owner}`);
    console.log(`   Your wallet: ${wallet.address}`);
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error('You are not the contract owner!');
    }
    console.log('   ✅ Ownership verified\n');

    // Check current vUSDC address
    console.log('🔍 Checking current vUSDC address...');
    try {
      const currentAddress = await voltContract.vusdcTokenAddress();
      console.log(`   Current: ${currentAddress}`);
      
      if (currentAddress.toLowerCase() === VUSDC_ADDRESS.toLowerCase()) {
        console.log('\n✅ vUSDC address is already correctly set!');
        return;
      }
    } catch (error) {
      console.log('   Current address not readable (might be zero address)');
    }

    // Set vUSDC address with manual gas settings
    console.log('\n📝 Setting vUSDC address...');
    console.log('   Preparing transaction with manual gas settings...');
    
    const tx = await voltContract.setVusdcTokenAddress(VUSDC_ADDRESS, {
      gasLimit: 100000 // Manuel gas limit
    });
    
    console.log(`   Transaction hash: ${tx.hash}`);
    console.log('   Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    // Verify
    console.log('\n🔍 Verifying configuration...');
    const newAddress = await voltContract.vusdcTokenAddress();
    console.log(`   New vUSDC address: ${newAddress}`);

    if (newAddress.toLowerCase() === VUSDC_ADDRESS.toLowerCase()) {
      console.log('\n🎉 SUCCESS! vUSDC address configured correctly!');
      console.log('\n✅ You can now create streams with vUSDC.');
    } else {
      console.log('\n❌ ERROR: Address mismatch after setting!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.reason) console.error('Reason:', error.reason);
    if (error.error) console.error('Inner error:', error.error);
    if (error.code) console.error('Error code:', error.code);
    process.exit(1);
  }
}

fixVusdcAddress();