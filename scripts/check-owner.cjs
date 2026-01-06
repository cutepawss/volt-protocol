require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  const voltAddress = "0xBcB7fBe6CaEf1Dbc45a18ADcA7FD2394268f3BAD";
  
  const voltAbi = ["function owner() view returns (address)"];
  const volt = new ethers.Contract(voltAddress, voltAbi, provider);
  
  const owner = await volt.owner();
  console.log("Contract owner:", owner);
  
  const PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
  if (PRIVATE_KEY) {
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    console.log("Your wallet:", wallet.address);
    console.log("Match:", owner.toLowerCase() === wallet.address.toLowerCase() ? "YES ✅" : "NO ❌");
  }
}

main();