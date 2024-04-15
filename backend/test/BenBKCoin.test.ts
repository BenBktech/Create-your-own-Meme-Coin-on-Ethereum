import {
  time,
  setBalance,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { BenBKCoin } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BenBKCoin Tests", function () {
  let accounts: SignerWithAddress[];
  let token: BenBKCoin;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  const hardcap = ethers.parseEther("285");

  async function deployContractFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const contractFactory = await ethers.getContractFactory("BenBKCoin");
    const openingTime = await time.latest() + 100;
    token = await contractFactory.deploy(await owner.getAddress(), openingTime);

    return { token, owner, user1, user2, user3 };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployContractFixture);
    token = fixture.token;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
    user3 = fixture.user3;
  });

  describe('Deployment', function() {
    it('should deploy the smart contract', async function() {
      const hardcapContract = await token.hardcap();
      const expectedHardcap = ethers.parseEther('285');
      const openingTimeContract = await token.openingTime();
      const expectedOpeningTime = await time.latest() + 100;
      const balanceOfOwner = await token.balanceOf(owner.address);
      const balanceOfContract = await token.balanceOf(token.target);
      const expectedBalanceOfOwnerAndContract = ethers.parseEther('500000000');
      assert(hardcapContract === expectedHardcap)
      assert(balanceOfOwner === expectedBalanceOfOwnerAndContract);
      assert(balanceOfContract === expectedBalanceOfOwnerAndContract);
    })

    it('should not deploy the smart contract if _openingTime is behind', async function() {
      const contractFactory = await ethers.getContractFactory("BenBKCoin");
      const openingTime = await time.latest() - 500;
      await expect(contractFactory.deploy(await owner.getAddress(), openingTime)).to.be.rejectedWith('ClosingTime need to be superior')
    })
  })

  describe("Contribute", function() {
    it("should revert if the sale has not started yet", async function () {
      const contributeAmount = ethers.parseEther("100");
      await setBalance(await user1.getAddress(), 100n ** 18n);
      await expect(token.connect(user1).contribute({ value: contributeAmount })).to.be.revertedWith('ICO is not opened');
    });

    it('should allow contributions within the hardcap', async function() {
      time.increase(200);
      const contributeAmount = ethers.parseEther("100");
      await setBalance(await user1.getAddress(), 100n ** 18n);
      await expect(token.connect(user1).contribute({ value: contributeAmount })).to.emit(
        token,
        "Contributed"
      ).withArgs(
        user1.address,
        contributeAmount
      )
      const contributionOfUser1 = await token.contributions(await user1.getAddress());
      const totalContributions = await token.totalContributions();
      assert(contributionOfUser1 === contributeAmount);
      assert(totalContributions === contributionOfUser1);
    })

    it('should allow contributions within the hardcap', async function() {
      time.increase(200);
      // USER1
      const contributeAmountUser1 = ethers.parseEther("100");
      await setBalance(await user1.getAddress(), 100n ** 18n);
      await token.connect(user1).contribute({ value: contributeAmountUser1 })

      // USER2
      const contributeAmountUser2 = ethers.parseEther("150");
      await setBalance(await user2.getAddress(), 150n ** 18n);
      await expect(token.connect(user2).contribute({ value: contributeAmountUser2 })).to.emit(
        token,
        "Contributed"
      ).withArgs(
        user2.address,
        contributeAmountUser2
      )
      const contributionOfUser2 = await token.contributions(await user2.getAddress());
      const totalContributions = await token.totalContributions();
      assert(contributionOfUser2 === contributeAmountUser2);
      assert(totalContributions === contributeAmountUser1 + contributionOfUser2);
    })

    // it('should NOT allow contributions if the hardcap is exceeded', async function() {
    //   time.increase(200);
    //   // USER1
    //   const contributeAmountUser1 = ethers.parseEther("100");
    //   await setBalance(await user1.getAddress(), 100n ** 18n);
    //   await token.connect(user1).contribute({ value: contributeAmountUser1 })

    //   // USER2
    //   const contributeAmountUser2 = ethers.parseEther("150");
    //   await setBalance(await user2.getAddress(), 150n ** 18n);
    //   await token.connect(user2).contribute({ value: contributeAmountUser2 })

    //   // USER 3
    //   const contributeAmountUser3 = ethers.parseEther("150");
    //   await setBalance(await user3.getAddress(), 150n ** 18n);
    //   await expect(token.connect(user3).contribute({ value: contributeAmountUser3 })).to.be.revertedWith('Exceeds hardcap');
    // })
  });

  describe("getClaimableAirdrop", function() {
    it('should get the claimable airdrop for a user', async function() {
      time.increase(200);
      // USER1
      const contributeAmountUser1 = ethers.parseEther("77.586568658");
      await setBalance(await user1.getAddress(), 78n ** 18n);
      await token.connect(user1).contribute({ value: contributeAmountUser1 })

      // USER2
      const contributeAmountUser2 = ethers.parseEther("88.88888");
      await setBalance(await user2.getAddress(), 90n ** 18n);
      await token.connect(user2).contribute({ value: contributeAmountUser2 })

      // USER3
      const contributeAmountUser3 = ethers.parseEther("0.00045");
      await setBalance(await user3.getAddress(), 100n ** 18n);
      await token.connect(user3).contribute({ value: contributeAmountUser3 })

      const claimableAirdropUser1 = await token.getClaimableAirdrop(user1.address);
      const claimableAirdropUser2 = await token.getClaimableAirdrop(user2.address);
      const claimableAirdropUser3 = await token.getClaimableAirdrop(user3.address);

      const total = claimableAirdropUser1[0] + claimableAirdropUser2[0] + claimableAirdropUser3[0];
      const totalExpected = ethers.parseEther('500000000')
      expect(total).to.be.at.most(totalExpected);
    })

    it('should get the claimable airdrop for a user EXTREME CASE', async function() {
      time.increase(200);
      // USER1
      const contributeAmountUser1 = ethers.parseEther("77.586568658");
      await setBalance(await user1.getAddress(), 78n ** 18n);
      await token.connect(user1).contribute({ value: contributeAmountUser1 })

      // USER2
      const contributeAmountUser2 = ethers.parseEther("0.000000000000000001");
      await setBalance(await user2.getAddress(), 90n ** 18n);
      await token.connect(user2).contribute({ value: contributeAmountUser2 })

      // USER3
      const contributeAmountUser3 = ethers.parseEther("0.00045");
      await setBalance(await user3.getAddress(), 100n ** 18n);
      await token.connect(user3).contribute({ value: contributeAmountUser3 })

      const claimableAirdropUser1 = await token.getClaimableAirdrop(user1.address);
      const claimableAirdropUser2 = await token.getClaimableAirdrop(user2.address);
      const claimableAirdropUser3 = await token.getClaimableAirdrop(user3.address);

      const total = claimableAirdropUser1[0] + claimableAirdropUser2[0] + claimableAirdropUser3[0];
      const totalExpected = ethers.parseEther('500000000')
      expect(total).to.be.at.most(totalExpected);
    })
  })

  describe('ClaimAirdrop', function() {
    it('should NOT claim airdrops if hardcap is not reached', async function() {
      time.increase(200);
      // USER1
      const contributeAmountUser1 = ethers.parseEther("200");
      await setBalance(await user1.getAddress(), 200n ** 18n);
      await token.connect(user1).contribute({ value: contributeAmountUser1 })

      await expect(token.connect(user1).claimAirdrop()).to.be.revertedWith('Hardcap not reached yet')
    })

    it('should claim airdrops', async function() {
      time.increase(200);
      // USER1
      const contributeAmountUser1 = ethers.parseEther("200");
      await setBalance(await user1.getAddress(), 200n ** 18n);
      await token.connect(user1).contribute({ value: contributeAmountUser1 })

      // USER2
      const contributeAmountUser2 = ethers.parseEther("84");
      await setBalance(await user2.getAddress(), 84n ** 18n);
      await token.connect(user2).contribute({ value: contributeAmountUser2 })

      // USER3
      const contributeAmountUser3 = ethers.parseEther("78.58585885");
      await setBalance(await user3.getAddress(), 80n ** 18n);
      await token.connect(user3).contribute({ value: contributeAmountUser3 })

      const claimableAirdropUser1 = await token.getClaimableAirdrop(user1.address);
      const claimableAirdropUser2 = await token.getClaimableAirdrop(user2.address);
      const claimableAirdropUser3 = await token.getClaimableAirdrop(user3.address);

      await token.connect(user1).claimAirdrop()
      await token.connect(user2).claimAirdrop()
      await expect(token.connect(user3).claimAirdrop()).to.emit(
        token,
        "TokensClaimed"
      ).withArgs(
        await user3.getAddress(),
        claimableAirdropUser3[0]
      )

      const balanceUser1 = await token.balanceOf(user1.address);
      const balanceUser2 = await token.balanceOf(user2.address);
      const balanceUser3 = await token.balanceOf(user3.address);

      assert(claimableAirdropUser1[0] === balanceUser1)
      assert(claimableAirdropUser2[0] === balanceUser2)
      assert(claimableAirdropUser3[0] === balanceUser3)

      const total = balanceUser1 + balanceUser2 + balanceUser3;
      const totalExpected = ethers.parseEther('500000000')
      expect(total).to.be.at.most(totalExpected);
    })

    it('should NOT claim airdrops if airdrop already claimed', async function() {
      time.increase(200);
      // USER1
      const contributeAmountUser1 = ethers.parseEther("200");
      await setBalance(await user1.getAddress(), 200n ** 18n);
      await token.connect(user1).contribute({ value: contributeAmountUser1 })

      // USER2
      const contributeAmountUser2 = ethers.parseEther("84");
      await setBalance(await user2.getAddress(), 84n ** 18n);
      await token.connect(user2).contribute({ value: contributeAmountUser2 })

      // USER3
      const contributeAmountUser3 = ethers.parseEther("78.58585885");
      await setBalance(await user3.getAddress(), 80n ** 18n);
      await token.connect(user3).contribute({ value: contributeAmountUser3 })

      const claimableAirdropUser1 = await token.getClaimableAirdrop(user1.address);
      const claimableAirdropUser2 = await token.getClaimableAirdrop(user2.address);
      const claimableAirdropUser3 = await token.getClaimableAirdrop(user3.address);

      await token.connect(user1).claimAirdrop()
      await token.connect(user2).claimAirdrop()
      await token.connect(user3).claimAirdrop()

      await expect(token.connect(user1).claimAirdrop()).to.be.revertedWith('Airdrop already claimed')
    })
  })
  
  describe('changeOpeningTime', function() {
    it('should change the changeOpeningTime', async function() {
      const timestamp = 1713185971n;
      await token.changeOpeningTime(timestamp);
      let contractOpeningTime = await token.openingTime();
      assert(timestamp === contractOpeningTime)
    })

    it('should NOT change the changeOpeningTime if NOT the owner', async function() {
      const timestamp = 1713185971n;
      await expect(token.connect(user1).changeOpeningTime(timestamp)).to.be.revertedWithCustomError(
        token,
        "OwnableUnauthorizedAccount"
      ).withArgs(
        user1.address
      )
    })
  })

  describe('changeHardcap', function() {
    it('should change the changeHardcap', async function() {
      const hardcap = ethers.parseEther('100');
      await token.changeHardcap(hardcap);
      let contractHardcap = await token.hardcap();
      assert(hardcap === contractHardcap)
    })

    it('should NOT change the changeHardcap if NOT the owner', async function() {
      const hardcap = ethers.parseEther('100');
      await expect(token.connect(user1).changeHardcap(hardcap)).to.be.revertedWithCustomError(
        token,
        "OwnableUnauthorizedAccount"
      ).withArgs(
        user1.address
      )
    })
  })

  describe("Withdraw Funds", function() {
    it("should allow only the owner to withdraw funds when hardcap is reached", async function() {
      time.increase(200);
      // USER1
      const contributeAmountUser1 = ethers.parseEther("200");
      await setBalance(await user1.getAddress(), 200n ** 18n);
      await token.connect(user1).contribute({ value: contributeAmountUser1 })

      // USER2
      const contributeAmountUser2 = ethers.parseEther("84");
      await setBalance(await user2.getAddress(), 84n ** 18n);
      await token.connect(user2).contribute({ value: contributeAmountUser2 })

      // USER3
      const contributeAmountUser3 = ethers.parseEther("78.58585885");
      await setBalance(await user3.getAddress(), 80n ** 18n);
      await token.connect(user3).contribute({ value: contributeAmountUser3 })

      const claimableAirdropUser1 = await token.getClaimableAirdrop(user1.address);
      const claimableAirdropUser2 = await token.getClaimableAirdrop(user2.address);
      const claimableAirdropUser3 = await token.getClaimableAirdrop(user3.address);

      await token.connect(user1).claimAirdrop()
      await token.connect(user2).claimAirdrop()
      await token.connect(user3).claimAirdrop()

      // WITHDRAW
      let balanceOfContract = await ethers.provider.getBalance(token.target);
      let balanceOfOwner = await ethers.provider.getBalance(owner.address);
      await token.withdrawFunds();
      let newBalanceOfContract = await ethers.provider.getBalance(token.target);
      let newBalanceOfOwner = await ethers.provider.getBalance(owner.address);
      assert(newBalanceOfOwner > balanceOfOwner);
      assert(newBalanceOfContract === ethers.parseEther('0'));
    });
  });

  describe('Create a liquidity Pool', function() {
    it('should create a liquidity Pool', async function() {
      time.increase(200);
      // USER1
      const contributeAmountUser1 = ethers.parseEther("200");
      await setBalance(await user1.getAddress(), 200n ** 18n);
      await token.connect(user1).contribute({ value: contributeAmountUser1 })

      // USER2
      const contributeAmountUser2 = ethers.parseEther("84");
      await setBalance(await user2.getAddress(), 84n ** 18n);
      await token.connect(user2).contribute({ value: contributeAmountUser2 })

      // USER3
      const contributeAmountUser3 = ethers.parseEther("78.58585885");
      await setBalance(await user3.getAddress(), 80n ** 18n);
      await token.connect(user3).contribute({ value: contributeAmountUser3 })

      // 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f 
    })
  })
});