pragma solidity^0.4.18;

import "./base/zeppelin/token/Mintable.sol";
import "./base/zeppelin/token/BurnableToken.sol";
import "./base/zeppelin/lifecycle/Pausable.sol";
  
contract AlphaconToken is Mintable, BurnableToken, Pausable { 
  string public name = "Alphacon Token";
  string public symbol = "ALP";
  uint8 public decimals = 18; 
}








