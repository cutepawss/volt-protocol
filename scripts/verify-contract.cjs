const { ethers } = require('ethers');
require('dotenv').config();

async function verify() {
  const provider = new ethers.JsonRpcProvider(process.env.VITE_RPC_URL);
  const code = await provider.getCode(process.env.VITE_CONTRACT_ADDRESS);
  
  console.log('Contract address:', process.env.VITE_CONTRACT_ADDRESS);
  console.log('Has code:', code !== '0x');
  console.log('RPC URL:', process.env.VITE_RPC_URL);
  
  const balance = await provider.getBalance('0x38BF3f875f24fF16b1EBFEdA50d6F80F4D18CB1C');
  console.log('Wallet USDC balance:', ethers.formatUnits(balance, 6), 'USDC');
}

verify();