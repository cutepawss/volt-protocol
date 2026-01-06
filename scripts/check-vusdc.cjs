require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  const voltAddress = "0xBcB7fBe6CaEf1Dbc45a18ADcA7FD2394268f3BAD";
  
  const voltAbi = [
    "function vusdcTokenAddress() view returns (address)",
    "function owner() view returns (address)"
  ];
  
  const volt = new ethers.Contract(voltAddress, voltAbi, provider);
  
  console.log("=".repeat(60));
  console.log("Volt Contract:", voltAddress);
  console.log("=".repeat(60));
  
  const currentVusdcAddress = await volt.vusdcTokenAddress();
  console.log("Current vUSDC address:", currentVusdcAddress);
  console.log("Expected vUSDC address:", "0xe4987ACA7b7fAB6f4291b33E24873A79E721e9c2");
  console.log("Match:", currentVusdcAddress.toLowerCase() === "0xe4987aca7b7fab6f4291b33e24873a79e721e9c2" ? "YES ✅" : "NO ❌");
  
  const owner = await volt.owner();
  console.log("\nOwner:", owner);
  console.log("Your wallet:", "0x38BF3f875f24fF16b1EBFEdA50d6F80F4D18CB1C");
  console.log("Owner match:", owner.toLowerCase() === "0x38bf3f875f24ff16b1ebfeda50d6f80f4d18cb1c" ? "YES ✅" : "NO ❌");
}

main();