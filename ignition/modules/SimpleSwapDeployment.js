// This module deploys two ERC20 tokens and a SimpleSwap contract that allows swapping between them.

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SimpleSwapDeployment", (m) => {
  const tokenA = m.contract("Token", ["TokenA", "TKA"], { id: "TokenA" });

  // Deploy Token B with unique id
  const tokenB = m.contract("Token", ["TokenB", "TKB"], { id: "TokenB" });
  
  // Deploy SimpleSwap with addresses of TokenA and TokenB
  const simpleSwap = m.contract("SimpleSwap", [tokenA, tokenB]);

  return { tokenA, tokenB, simpleSwap };
});

