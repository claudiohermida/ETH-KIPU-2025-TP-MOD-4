# ETH-KIPU-2025-TP-MOD-4
## Assigment for ETH KIPU 2025 Module 4:
## Basic front-end to interact with SimpleSwap smart contract

We use Scaffold-Eth 2 to provide a simple React/Next.js front-end to interact with the SimpleSwap contract (`contracts/SimpleSwap.sol`included in the repo, see 
<a href="https://github.com/claudiohermida/ETH-KIPU-2025-TP-MOD-3"> https://github.com/claudiohermida/ETH-KIPU-2025-TP-MOD-3 </a> for a detailed description of the contract's functionality).

## Test Coverage

The smart contracts have been tested (`test/SimpleSwapTest.js`) with the following coverage


File             |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------|----------|----------|----------|----------|----------------|
 contracts/      |      100 |    94.64 |      100 |      100 |                |
  SimpleSwap.sol |      100 |    94.44 |      100 |      100 |                |
  Token.sol      |      100 |      100 |      100 |      100 |                |
-----------------|----------|----------|----------|----------|----------------|
All files        |      100 |    94.64 |      100 |      100 |                |
-----------------|----------|----------|----------|----------|----------------|

## Deployments

The smart contracts have been deployed and verified in *Sepolia* testnet:

  **`SimpleSwap.sol`**:
  <a href="https://sepolia.etherscan.io/address/0xB6Ecdc825B509F4587DEaAE4539B61cedD5020dD">https://sepolia.etherscan.io/address/0xB6Ecdc825B509F4587DEaAE4539B61cedD5020dD</a>

__Test tokens__

Two deployments of **`Token.sol`**:
- Token A
  <a href="https://sepolia.etherscan.io/address/0xE03d7e486096ca58874b81f9CA854633f3769667#code">https://sepolia.etherscan.io/address/0xE03d7e486096ca58874b81f9CA854633f3769667>
- Token B
  <a href="https://sepolia.etherscan.io/address/0x48fE9b1E65477e8531406b25f114bA6762cC5F5C">https://sepolia.etherscan.io/address/0x48fE9b1E65477e8531406b25f114bA6762cC5F5C</a>