pragma solidity^0.4.18;

import "openzeppelin-solidity/contracts/ownership/CanReclaimToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
  
contract AlphaconToken is CanReclaimToken, MintableToken, BurnableToken, PausableToken { 
  string public name = "Alphacon Token";
  string public symbol = "ALP";
  uint8 public decimals = 18; 
}








