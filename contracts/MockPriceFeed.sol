// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPriceFeed
 * @dev Mock implementation of Chainlink AggregatorV3Interface for testing
 */
contract MockPriceFeed is Ownable {
    int256 private _price;
    uint8 private _decimals = 8;
    string private _description = "ETH / USD";
    uint256 private _version = 1;

    constructor() Ownable(msg.sender) {
        _price = 3000 * 10**8; // Default $3000 USD
    }

    function setPrice(int256 price) external onlyOwner {
        _price = price;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external view returns (string memory) {
        return _description;
    }

    function version() external view returns (uint256) {
        return _version;
    }

    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (_roundId, _price, block.timestamp, block.timestamp, _roundId);
    }

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (1, _price, block.timestamp, block.timestamp, 1);
    }
} 