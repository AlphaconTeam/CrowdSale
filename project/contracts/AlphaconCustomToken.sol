pragma solidity^0.4.24;

import "openzeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "openzeppelin-solidity/contracts/ownership/CanReclaimToken.sol";
import "./AlphaconToken.sol";

/**
  * @title  AlphaconCustomToken
  * @notice AlphaconCustomToken permits one more token generation after
  *         token sale finalized. The generated token _amount is limited
  *         up to 10% of total supply before the generation.
  */
contract AlphaconCustomToken is HasNoEther, CanReclaimToken, AlphaconToken {
  /* State */
  bool public tokenGenerated;
  uint256 public constant TARGET_TOTAL_SUPPLY = 25e27; // 25 Billion ALP

  /* Event */
  event MintAfterSale(address _to, uint _preSupply, uint _postSupply);

  /* External */
  /**
    * @notice After crowdsale finalized, mint additional tokens for ESC-LOCK.
    *         This generation only happens once.
    */
  function mintAfterSale() external onlyOwner returns (bool) {
    require(!tokenGenerated);

    // valid only after finishMinting is executed
    require(mintingFinished);

    // revert if total supply is more than TARGET_TOTAL_SUPPLY
    uint256 preSupply = totalSupply();
    require(preSupply < TARGET_TOTAL_SUPPLY);
    uint256 amount = TARGET_TOTAL_SUPPLY.sub(preSupply);

    // mint token internally
    totalSupply_ = TARGET_TOTAL_SUPPLY;
    balances[owner] = balances[owner].add(amount);
    emit Transfer(address(0), owner, amount);

    tokenGenerated = true;

    emit MintAfterSale(owner, preSupply, totalSupply());

    return true;
  }
}
