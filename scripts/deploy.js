// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const ONE_GWEI = 1_000_000_000;

async function main() {
  const [seller] = await ethers.getSigners();
  const Auction = await hre.ethers.getContractFactory("Auction");
  const startPrice = 5 * ONE_GWEI;
  const buyNowPrice = 100 * ONE_GWEI;
  const minBidIncrement = ONE_GWEI;
  const auction = await Auction.deploy(
    seller.address, startPrice, buyNowPrice, minBidIncrement
  );

  await auction.deployed();

  console.log("Auction deployed to:", auction.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
