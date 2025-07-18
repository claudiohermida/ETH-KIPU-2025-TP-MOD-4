# ETH-KIPU-2025-TP-MOD-4
## Assigment for ETH KIPU 2025 Module 4:
## Basic front-end to interact with SimpleSwap smart contract

We use Scaffold-Eth 2 <a href=”https://docs.scaffoldeth.io/”>https://docs.scaffoldeth.io</a> to provide a simple React/Next.js front-end to interact with the SimpleSwap contract (`packages/hardhat/contracts/SimpleSwap.sol`included in the repo, see 
<a href="https://github.com/claudiohermida/ETH-KIPU-2025-TP-MOD-3"> https://github.com/claudiohermida/ETH-KIPU-2025-TP-MOD-3 </a> for a detailed description of the contract's functionality).

## Test Coverage

The smart contracts have been tested (`packages/hardhat/test/SimpleSwapTest.js`) with the following **complete coverage**



File             |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------|----------|----------|----------|----------|----------------|
 contracts/      |      100 |      100 |      100 |      100 |                |
  SimpleSwap.sol |      100 |      100 |      100 |      100 |                |
  Token.sol      |      100 |      100 |      100 |      100 |                |
-----------------|----------|----------|----------|----------|----------------|
All files        |      100 |      100 |      100 |      100 |                |
-----------------|----------|----------|----------|----------|----------------|
## Deployments

The smart contracts have been deployed and verified in ***Sepolia*** testnet:

  **`SimpleSwap.sol`**:
  <a href="https://sepolia.etherscan.io/address/0x00310D009428678e8E7Bf829BF4447F86B6f768B">https://sepolia.etherscan.io/address/0x00310D009428678e8E7Bf829BF4447F86B6f768B</a>

__Test tokens__

Two deployments of **`Token.sol`**:
- Token A
  <a href="https://sepolia.etherscan.io/address/0xF357f5b73C5FB76D3630b96b8f4dC0c5460F926c">https://sepolia.etherscan.io/address/0xF357f5b73C5FB76D3630b96b8f4dC0c5460F926c</a>
- Token B
  <a href="https://sepolia.etherscan.io/address/0xBb4a49dcac65C4bAFa4cb9313A2796E19360A4D3">https://sepolia.etherscan.io/address/0xBb4a49dcac65C4bAFa4cb9313A2796E19360A4D3</a>

## Frontend

### Vercel app
<a href="https://ethkipu2025tp4swap-claudiohermidas-projects.vercel.app/">https://ethkipu2025tp4swap-claudiohermidas-projects.vercel.app/</a>






- To interact with the contract, it is required to have a funded Sepolia account to pay for transaction fees.
  
- In the `Home` tab/page, the swap GUI allows any account holding token A to perform a swap. 
  
- When CONFIRMING a swap, the frontend checks whether the `simpleSwap` contract has enough `allowance` to perform the relevant `transfer`. If not, it will ask the user to `approve` the needed amount of tokens before proceeding with the Swap. 
  
- The top right corner displays the current token A `balance` of the connected wallet. 
  
- The bottom left corner displays the current price of token A in terms of token B. 



### Demo Video with Scaffold-eth 2 frontend

<a href="https://ipfs.io/ipfs/QmUL2tLskAombh3xkSaVB9d4dvjETwpmA5xAD1xQ2xToMU">https://ipfs.io/ipfs/QmUL2tLskAombh3xkSaVB9d4dvjETwpmA5xAD1xQ2xToMU</a>
