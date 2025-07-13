// This module deploys two ERC20 tokens and a SimpleSwap contract that allows swapping between them.

/**
 * @param {import('hardhat/types').HardhatRuntimeEnvironment} hre
 */
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Deploy Token A
  // Note: The first argument is the "name" of the deployment, which is different from the contract name.
  // We specify the actual contract name in the `contract` property.
  await deploy("TokenA", {
    from: deployer,
    contract: "Token",
    args: ["TokenA", "TKA"],
    log: true,
  });

  // Deploy Token B with unique id
  await deploy("TokenB", {
    from: deployer,
    contract: "Token",
    args: ["TokenB", "TKB"],
    log: true,
  });

  // Get the deployed token contracts to pass their addresses to the SimpleSwap constructor
  const tokenA = await deployments.get("TokenA");
  const tokenB = await deployments.get("TokenB");

  // Deploy SimpleSwap with addresses of TokenA and TokenB
  await deploy("SimpleSwap", {
    from: deployer,
    args: [tokenA.address, tokenB.address],
    log: true,
  });
};

// Tags are useful for running specific deploy scripts.
module.exports.tags = ["SimpleSwapDeployment", "TokenA", "TokenB", "SimpleSwap"];
