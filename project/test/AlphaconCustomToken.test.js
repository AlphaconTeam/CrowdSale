import moment from "moment";

import ether from "./helpers/ether";
import EVMThrow from "./helpers/EVMThrow";
import { capture, restore, Snapshot } from "./helpers/snapshot";
import expectEvent from "./helpers/expectEvent";
import sendTransaction from "./helpers/sendTransaction";

const BigNumber = web3.BigNumber;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const Token = artifacts.require("./AlphaconCustomToken.sol");

contract("AlphaconCustomToken", async (accounts) => {
  let token;

  const [
    owner,
    holder1,
    holder2,
  ] = accounts;

  const tokenAmount = ether(1);

  before(async () => {
    token = await Token.new();
  });

  describe("before finishMinting()", async () => {
    it("should mint tokens", async () => {
      await expectEvent.inTransaction(
        token.mint(holder1, tokenAmount),
        "Transfer",
      );
      await expectEvent.inTransaction(
        token.mint(holder2, tokenAmount),
        "Transfer",
      );
    });

    it("should not allow to call mintAfterSale()", async () => {
      await token.mintAfterSale().should.be.rejectedWith(EVMThrow);
    });

    it("should finish minting", async () => {
      await expectEvent.inTransaction(
        token.finishMinting(),
        "MintFinished",
      );
    });
  });

  describe("after finishMinting()", async () => {
    it("should call mintAfterSale()", async () => {
      const totalSupply = await token.totalSupply();
      const targetTotalSupply = await token.TARGET_TOTAL_SUPPLY();
      const mintedTokenAmount = targetTotalSupply.sub(totalSupply);

      targetTotalSupply.should.be.bignumber.gt(totalSupply);

      const ownerBalance = await token.balanceOf(owner);
      const expectedOwnerBalance = ownerBalance.add(mintedTokenAmount);

      await expectEvent.inTransaction(
        token.mintAfterSale(),
        "MintAfterSale",
      );

      (await token.totalSupply()).should.be.bignumber.equal(targetTotalSupply);
      (await token.balanceOf(owner)).should.be.bignumber.equal(expectedOwnerBalance);
    });

    it("should not allow to call mintAfterSale() again", async () => {
      await token.mintAfterSale().should.be.rejectedWith(EVMThrow);
    });
  });

  describe("#HasNoEther", async () => {
    it("cannot send ETh to token contract", async () => {
      await sendTransaction({ from: owner, to: token.address, value: 1e18 })
        .should.be.rejectedWith(EVMThrow);
    });
  });
});
