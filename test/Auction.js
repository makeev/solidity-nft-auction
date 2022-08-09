const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const ONE_GWEI = 1_000_000_000;

describe("Auction", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployDefaultAuction() {

    const startPrice = 5 * ONE_GWEI;
    const buyNowPrice = 100 * ONE_GWEI;
    const minBidIncrement = ONE_GWEI;

    const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

    // deploy TestNFT 
    const TestNFT = await ethers.getContractFactory("TestNFT");
    const nft = await TestNFT.connect(thirdAccount).deploy();
    // and award seller with 1 token, save tokenId for later
    let trx = await nft.connect(seller).awardItem('google.com');
    const nftId = trx.value;
    console.log('nftId', nftId);

    // check token is belong to seller
    const nftOwner = await nft.ownerOf(nftId);
    console.log('nftOwner', nftOwner);

    console.log('owner:', owner.address);
    console.log('seller:', seller.address);
    console.log('startPrice:', startPrice / ONE_GWEI, 'GWEI');
    console.log('buyNowPrice:', buyNowPrice / ONE_GWEI, 'GWEI');
    console.log('minBidIncrement:', minBidIncrement / ONE_GWEI, 'GWEI');

    // Contracts are deployed using the first signer/account by default
    const Auction = await ethers.getContractFactory("Auction");
    const auction = await Auction.connect(owner).deploy(seller.address, startPrice, buyNowPrice, minBidIncrement);

    // approve seller token to be used in contract
    await nft.connect(seller).approve(auction.address, nftId);

    return { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId };
  }

  describe("Deployment", function () {
    it("Should set the right initial params", async function () {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      expect(await auction.seller()).to.equal(seller.address);
      expect(await auction.startPrice()).to.equal(startPrice);
      expect(await auction.buyNowPrice()).to.equal(buyNowPrice);
      expect(await auction.minBidIncrement()).to.equal(minBidIncrement);
    });

    it("Should fail if placing bid before start", async function () {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      await expect(auction.connect(otherAccount).bid({ value: minBidIncrement + 100 })).to.be.revertedWith(
        "Auction not started yet"
      );
    });

    it("Should be not started, before start()", async function () {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      expect(await auction.isStarted()).to.equal(false);
      await auction.connect(seller).start(nft.address, nftId)
      expect(await auction.isStarted()).to.equal(true);
    });

    it("NFT should belongs to contract after start", async function () {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      expect(await nft.ownerOf(nftId)).to.equal(seller.address);
      await auction.connect(seller).start(nft.address, nftId);
      expect(await nft.ownerOf(nftId)).to.equal(auction.address);
    });

    it("Should not be finished before endAt", async function () {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      await auction.connect(seller).start(nft.address, nftId); // start set +1week endAt
      expect(await auction.isFinished()).to.equal(false);

      // wait for several days
      await time.increase(60 * 60 * 24 * 8);
      expect(await auction.isFinished()).to.equal(true);
    });

    it("Should be able to place a bid after start", async function () {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      // seller start auction
      await auction.connect(seller).start(nft.address, nftId);

      // another account place a bid
      auction.connect(otherAccount);
      await auction.bid({ value: minBidIncrement });
      let myBid = await auction.getMyBid();
      expect(myBid).to.be.equal(minBidIncrement);
    });

    it("Should be finished if bid is higher than price", async function() {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      await auction.connect(seller).start(nft.address, nftId);
      expect(await auction.isFinished()).to.equal(false);

      await auction.connect(otherAccount).bid({value: buyNowPrice + ONE_GWEI});
      expect(await auction.isFinished()).to.equal(true);
    });

    it("Higher bidder should be able to take the prize", async function() {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      await auction.connect(seller).start(nft.address, nftId);
      expect(await auction.isFinished()).to.equal(false);

      await auction.connect(otherAccount).bid({value: minBidIncrement + ONE_GWEI});
      expect(await auction.isFinished()).to.equal(false);

      // wait for several days
      await time.increase(60 * 60 * 24 * 8);
      expect(await auction.isFinished()).to.equal(true);
      expect(await auction.getTheWinner()).to.equal(otherAccount.address);

      // winner withdraw his reward
      await auction.connect(otherAccount).getReward();
      let newNftOwner = await nft.ownerOf(nftId);
      expect(newNftOwner).to.equal(otherAccount.address);
    });

    it("Anyone can withdraw funds after auction is finished", async function() {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      await auction.connect(seller).start(nft.address, nftId);

      // non-winner bid
      let smallBid = minBidIncrement + ONE_GWEI;
      await auction.connect(thirdAccount).bid({value: smallBid});

      // place bid +1 GWEI higher than buy now
      await auction.connect(otherAccount).bid({value: buyNowPrice + ONE_GWEI});
      // auction finished now
      expect(await auction.isFinished()).to.equal(true);

      // non winner trying to withdraw his funds
      var balanceBefore = await thirdAccount.getBalance();
      await auction.connect(thirdAccount).withdraw();
      var balanceAfter = await thirdAccount.getBalance();
      // expeting same balance minus GAS
      expect(Math.floor((balanceAfter - balanceBefore) / ONE_GWEI)).to.equal(smallBid / ONE_GWEI);
      // can't withdraw second time
      await expect(auction.connect(thirdAccount).withdraw()).to.be.revertedWith("Nothing to withdraw");

      // winner can withdraw reminder from bid which is higher than buy now
      balanceBefore = await otherAccount.getBalance();
      await auction.connect(otherAccount).withdraw();
      balanceAfter = await otherAccount.getBalance();
      // expeting +1 GWEI minus GAS
      expect(Math.round((balanceAfter - balanceBefore) / ONE_GWEI)).to.equal(1);

      // seller can withdraw his payment, but not higher than buy now price
      balanceBefore = await seller.getBalance();
      await auction.connect(seller).withdraw();
      balanceAfter = await seller.getBalance();
      // expeting buy now price minus GAS
      expect(Math.round((balanceAfter - balanceBefore) / ONE_GWEI)).to.equal(buyNowPrice / ONE_GWEI);
    });

    it("Anyone can withdraw funds after auction is cancelled", async function() {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      await auction.connect(seller).start(nft.address, nftId);
      // non-winner bid
      let smallBid = minBidIncrement + ONE_GWEI;
      await auction.connect(thirdAccount).bid({value: smallBid});
      // seller cancelling auction
      await auction.connect(seller).cancell();

      // non winner trying to withdraw his funds
      var balanceBefore = await thirdAccount.getBalance();
      await auction.connect(thirdAccount).withdraw();
      var balanceAfter = await thirdAccount.getBalance();
      // expeting same balance minus GAS
      expect(Math.round((balanceAfter - balanceBefore) / ONE_GWEI)).to.equal(smallBid / ONE_GWEI);
      // can't withdraw second time
      await expect(auction.connect(thirdAccount).withdraw()).to.be.revertedWith("Nothing to withdraw");
    });

    it("Seller can get his NFT back after auction is cancelled", async function() {
      const { auction, startPrice, buyNowPrice, minBidIncrement, nft, nftId } = await loadFixture(deployDefaultAuction);
      const [owner, seller, otherAccount, thirdAccount] = await ethers.getSigners();

      // start auction, nft transferred to contract address
      await auction.connect(seller).start(nft.address, nftId);
      expect(await nft.ownerOf(nftId)).to.equal(auction.address);
      // seller cancelling auction
      await auction.connect(seller).cancell();
      expect(await nft.ownerOf(nftId)).to.equal(seller.address);

    });
  });
});