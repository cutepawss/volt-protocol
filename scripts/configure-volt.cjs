require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
  const PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
  
  if (!PRIVATE_KEY) {
    console.error("ERROR: OWNER_PRIVATE_KEY not found in .env file!");
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const voltAddress = "0xBcB7fBe6CaEf1Dbc45a18ADcA7FD2394268f3BAD";
  const vusdcAddress = "0xe4987ACA7b7fAB6f4291b33E24873A79E721e9c2";
  
  const voltAbi = [
    "function setVusdcTokenAddress(address _vusdcToken) external"
  ];
  
  const volt = new ethers.Contract(voltAddress, voltAbi, wallet);
  
  console.log("Setting vUSDC token address...");
  const tx = await volt.setVusdcTokenAddress(vusdcAddress);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("SUCCESS! vUSDC address configured!");
}

main().catch((error) => {
  console.error("ERROR:", error.message);
});