//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract BenBKCoin is ERC20, Ownable {
    IUniswapV2Router02 private immutable uniswapV2Router;
    address private immutable uniswapV2Pair;
    IERC20 internal token;

    mapping(address => uint256) public contributions;
    mapping(address => bool) public isClaimed;

    uint public maxSupply = (1000000000 * 10 ** decimals());
    uint public ownerSupply = (500000000 * 10 ** decimals());
    uint256 balanceToken = 500000000 * 10 ** decimals();

    uint256 public openingTime;
    uint256 public hardcap;
    uint256 public totalContributions;

    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event Contributed(address indexed contributor, uint256 amount);

    constructor(address initialOwner, uint256 _openingTime)
        ERC20("BenBKCoin", "BBK")
        Ownable(initialOwner) {
            require(block.timestamp < _openingTime, "ClosingTime need to be superior");
            token = IERC20(address(this));
            openingTime = _openingTime;
            hardcap = 285 ether;
            _mint(owner(), ownerSupply);
            _mint(address(this), ownerSupply);

            // Uniswap : Create pair 
            uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
            uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).createPair(
                address(this),
                uniswapV2Router.WETH()
            );

    }

    modifier roundIsOpened {
        require(block.timestamp >= openingTime, "ICO is not opened");
        _;
    }

    modifier afterHardcapIsReached() {
        require(totalContributions >= hardcap, "Hardcap not reached yet");
        _;
    }

    function contribute() external payable roundIsOpened {
        contributions[msg.sender] += msg.value;
        totalContributions += msg.value;
        emit Contributed(msg.sender, msg.value);
    }

    function claimAirdrop() external afterHardcapIsReached {
        require(!isClaimed[msg.sender], "Airdrop already claimed");
        uint256 airdropAmount = (contributions[msg.sender] * balanceToken) / totalContributions;
        isClaimed[msg.sender] = true;
        token.transfer(msg.sender, airdropAmount);
        emit TokensClaimed(msg.sender, airdropAmount);
    }
    
    function getClaimableAirdrop(address _beneficiary) public view returns(uint256, bool) {
        uint256 amountClaimable = (contributions[_beneficiary] * balanceToken) / totalContributions;
        return (amountClaimable, isClaimed[_beneficiary]);
    }

    function changeOpeningTime(uint256 _openingTime) public onlyOwner {
        openingTime = _openingTime;
    }

    function changeHardcap(uint256 _hardcap) public onlyOwner {
        hardcap = _hardcap;
    }

    function withdrawFunds() external onlyOwner {
        require(totalContributions >= hardcap, "Hardcap not reached yet");
        
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds to withdraw");

        (bool received,) = owner().call{value: contractBalance}("");
        require(received, "An error occured");
    }

}