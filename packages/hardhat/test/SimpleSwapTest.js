const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");


describe("SimpleSwap", function () {
  // Initial supply of tokens A and B for deployment
  const initialSupply = ethers.parseEther("10000");
  // Initial supply of tokens A and B in the pool
  const initialASupply = ethers.parseEther("10");
  const initialBSupply = ethers.parseEther("1000");

  const initialLiquidity = ethers.parseEther("100");
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  async function deployFixture() {
    const [deployer, addr1] = await ethers.getSigners();
    console.log("deployer address:", deployer.address);
    // Deploy the token contracts
    const Token = await ethers.getContractFactory("Token");
    const tokenA = await Token.deploy("TokenA", "A");
    const tokenB = await Token.deploy("TokenB", "B");
      
    // const TokenA = await ethers.getContractFactory("TokenA");
    // const TokenB = await ethers.getContractFactory("TokenB");
    // const tokenA = await TokenA.deploy();
    // const tokenB = await TokenB.deploy();
      
    // Wait for the tokens to be deployed
    // await tokenA.deploymentTransaction().wait(1);
    // await tokenB.deploymentTransaction().wait(1);
    console.log("Token A deployed at:", tokenA.target);
    console.log("Token B deployed at:", tokenB.target);
      
    // Deploy the SimpleSwap contract  
    const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    const simpleSwap = await SimpleSwap.deploy(tokenA.target, tokenB.target);
    console.log("SimpleSwap deployed at:", simpleSwap.target);
    
    
    // Set up initial balances for the tokens in the pool
    
    await tokenA.mint(deployer.address, initialSupply);
    await tokenB.mint(deployer.address, initialSupply);

    console.log("deployer's Token A balance:", await tokenA.balanceOf(deployer.address));
    console.log("deployer's Token B balance:", await tokenB.balanceOf(deployer.address));
    
    
    // Set up initial allowance of tokens A and B in the SimpleSwap contract
    await tokenA.approve(simpleSwap.target, initialSupply);
    await tokenB.approve(simpleSwap.target, initialSupply);


    return { tokenA, tokenB, simpleSwap, deployer, addr1 };
  }

  async function deployFixtureWithInitialLiquidity() {
    
    const [deployer] = await ethers.getSigners();
    console.log("deployer address:", deployer.address);
    // Deploy the token contracts
    const Token = await ethers.getContractFactory("Token");
    const tokenA = await Token.deploy("TokenA", "A");
    const tokenB = await Token.deploy("TokenB", "B");
      
    // const TokenA = await ethers.getContractFactory("TokenA");
    // const TokenB = await ethers.getContractFactory("TokenB");
    // const tokenA = await TokenA.deploy();
    // const tokenB = await TokenB.deploy();
      
    // Wait for the tokens to be deployed
    // await tokenA.deploymentTransaction().wait(1);
    // await tokenB.deploymentTransaction().wait(1);
    console.log("Token A deployed at:", tokenA.target);
    console.log("Token B deployed at:", tokenB.target);
      
    // Deploy the SimpleSwap contract  
    const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    const simpleSwap = await SimpleSwap.deploy(tokenA.target, tokenB.target);
    console.log("SimpleSwap deployed at:", simpleSwap.target);
    
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    currentTimestamp = block.timestamp;

    // Set up initial balances for the tokens in the pool
    await tokenA.mint(deployer.address, initialSupply); // Add some extra tokens for liquidity
    await tokenB.mint(deployer.address, initialSupply);

    // Set up approvals for liquidity provision
    await tokenA.approve(simpleSwap.target, initialSupply); // Allow SimpleSwap to spend tokens A
    await tokenB.approve(simpleSwap.target, initialSupply);
    
    await simpleSwap.connect(deployer).addLiquidity(
      tokenA.target,
      tokenB.target,
      initialASupply,
      initialBSupply,
      initialASupply,
      initialBSupply,
      deployer.address,
      block.timestamp + 60 // Set deadline to past timestamp
    );

    console.log("Pool Token A balance:", await tokenA.balanceOf(simpleSwap.target));
    console.log("Pool Token B balance:", await tokenB.balanceOf(simpleSwap.target));
    console.log("Pool LP balance:", await simpleSwap.balanceOf(deployer.address));
    


    return { tokenA, tokenB, simpleSwap, deployer };
  }
  describe("Deployment", function () {
    it("should deploy the contracts and assign initial balances", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixture);
      expect(tokenA.target).to.properAddress;
      expect(tokenB.target).to.properAddress;
      expect(simpleSwap.target).to.properAddress;
      // Check proper assignment of initial state variables
      // expect(await simpleSwap._tokenA()).to.equal(tokenA.target);
      // expect(await simpleSwap._tokenB()).to.equal(tokenB.target);
      expect(await tokenA.owner()).to.equal(deployer.address);
      expect(await tokenB.owner()).to.equal(deployer.address);
      // Check initial balances
      expect(await tokenA.balanceOf(deployer.address)).to.equal(initialSupply);
      expect(await tokenB.balanceOf(deployer.address)).to.equal(initialSupply);
      // Check allowances
      expect(await tokenA.allowance(deployer.address, simpleSwap.target)).to.equal(initialSupply);
      expect(await tokenB.allowance(deployer.address, simpleSwap.target)).to.equal(initialSupply);
    });

    it("should revert if not-owner attempting to mint tokens ", async function () {
      const { tokenA, tokenB, simpleSwap, deployer, addr1 } = await loadFixture(deployFixture);
      await expect(tokenA.connect(addr1).mint(deployer.address, initialSupply
        )).to.be.revertedWithCustomError(tokenA, "OwnableUnauthorizedAccount").withArgs(addr1.address);
      await expect(tokenB.connect(addr1).mint(deployer.address, initialSupply
        )).to.be.revertedWithCustomError(tokenB, "OwnableUnauthorizedAccount").withArgs(addr1.address);
    });

  });

  describe("Liquidity Provision", function () {
    // Simulate adding liquidity
    const amountA = ethers.parseEther("1000");
    const amountB = ethers.parseEther("1000");

    // set up a suitable timeout for the test
    let currentTimestamp;
    let newTimestamp;

    beforeEach(async function () {
      // Get current block timestamp
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      currentTimestamp = block.timestamp;

      console.log("Current blockchain timestamp:", currentTimestamp);

      // Add 60 seconds
      newTimestamp = currentTimestamp + 60;
      console.log("New timestamp (+60s):", newTimestamp);
    });

    it("should revert if deadline expired", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixture);
      
      // Attempt to add liquidity with a past deadline
      await expect(simpleSwap.connect(deployer).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        deployer.address,
        currentTimestamp - 1 // Set deadline to past timestamp
      )).to.be.revertedWithCustomError(simpleSwap, "DEADLINE_EXPIRED");
    });

    it("should revert if target address is invalid", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixture);
      // Attempt to add liquidity with a past deadline
      await expect(simpleSwap.connect(deployer).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        ZERO_ADDRESS,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TO");
    });

    it("should revert if token addresses are invalid", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixture);
      
      
      
      await expect(simpleSwap.connect(deployer).addLiquidity(
        simpleSwap.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB,
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TOKEN");
  
      await expect(simpleSwap.connect(deployer).addLiquidity(
        tokenA.target,
        simpleSwap.target,
        amountA,
        amountB,
        amountA,
        amountB,
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TOKEN");
      
    });

    it("should revert if liquidity provision is unbalanced", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixture);
        
        
        
      await expect(simpleSwap.connect(deployer).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA + 100n,
        amountB, // Unbalanced amount
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "UNBALANCED_LIQUIDITY_PROVISION");
    
      await expect(simpleSwap.connect(deployer).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountA,
        amountB,
        amountA,
        amountB + 100n,
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "UNBALANCED_LIQUIDITY_PROVISION");
        
    });
    
    

    it("should add initial liquidity, emit event and mint the correct amount of LP tokens", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixture);
        
      const amountADesired = ethers.parseEther("10");
      const amountBDesired = ethers.parseEther("1000");
      const expectedLiquidity = ethers.parseEther("100"); // sqrt(10 * 1000) = 100
      // Check initial balances before adding liquidity
      const deployerInitialBalanceA = await tokenA.balanceOf(deployer.address);
      const deployerInitialBalanceB = await tokenB.balanceOf(deployer.address);
      // Add liquidity
      await expect(simpleSwap.connect(deployer).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountADesired,
        amountBDesired,
        amountADesired,
        amountBDesired,
        deployer.address,
        newTimestamp
      )).to.emit(simpleSwap, "LiquidityAdded")
        .withArgs(deployer.address, deployer.address, amountADesired, amountBDesired, expectedLiquidity);
      // Check balances after adding liquidity: deployer's balance should decrease.
      expect(await tokenA.balanceOf(deployer.address)).to.equal(deployerInitialBalanceA - amountADesired);
      expect(await tokenB.balanceOf(deployer.address)).to.equal(deployerInitialBalanceB - amountBDesired);
      expect(await simpleSwap.balanceOf(deployer.address)).to.equal(expectedLiquidity);
    });
    
    it("should add liquidity when optimal amount does not meet minimum required, emit event and mint the correct amount of LP tokens", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
      // reserveA = 10, reserveB = 1000  
      
      const amountADesired = ethers.parseEther("2");
      const amountBDesired = ethers.parseEther("150");
      const expectedADeposit = ethers.parseEther("1.5");
      const expectedLiquidityAdded = ethers.parseEther("15"); 
      // Check initial balances before adding liquidity
      const deployerInitialBalanceA = await tokenA.balanceOf(deployer.address);
      const deployerInitialBalanceB = await tokenB.balanceOf(deployer.address);
      const initialLiquidity = await simpleSwap.balanceOf(deployer.address);
      // Add liquidity
      await expect(simpleSwap.connect(deployer).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountADesired,
        amountBDesired,
        expectedADeposit,
        amountBDesired,
        deployer.address,
        newTimestamp
      )).to.emit(simpleSwap, "LiquidityAdded")
        .withArgs(deployer.address, deployer.address, expectedADeposit, amountBDesired, expectedLiquidityAdded);
      // Check balances after adding liquidity: deployer's balance should decrease.
      expect(await tokenA.balanceOf(deployer.address)).to.equal(deployerInitialBalanceA - expectedADeposit);
      expect(await tokenB.balanceOf(deployer.address)).to.equal(deployerInitialBalanceB - amountBDesired);
      expect(await simpleSwap.balanceOf(deployer.address)).to.equal(initialLiquidity + expectedLiquidityAdded);
    });

    it("should add liquidity when optimal amount meets minimum required, emit event and mint the correct amount of LP tokens", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
      // reserveA = 10, reserveB = 1000  
      
      const amountADesired = ethers.parseEther("2");
      const amountBDesired = ethers.parseEther("250");
      const expectedADeposit = ethers.parseEther("2");
      const expectedBDeposit = ethers.parseEther("200");
      const expectedLiquidityAdded = ethers.parseEther("20"); 
      // Check initial balances before adding liquidity
      const deployerInitialBalanceA = await tokenA.balanceOf(deployer.address);
      const deployerInitialBalanceB = await tokenB.balanceOf(deployer.address);
      const initialLiquidity = await simpleSwap.balanceOf(deployer.address);
      // Add liquidity
      await expect(simpleSwap.connect(deployer).addLiquidity(
        tokenA.target,
        tokenB.target,
        amountADesired,
        amountBDesired,
        expectedADeposit,
        expectedBDeposit,
        deployer.address,
        newTimestamp
      )).to.emit(simpleSwap, "LiquidityAdded")
        .withArgs(deployer.address, deployer.address, expectedADeposit, expectedBDeposit, expectedLiquidityAdded);
      // Check balances after adding liquidity: deployer's balance should decrease.
      expect(await tokenA.balanceOf(deployer.address)).to.equal(deployerInitialBalanceA - expectedADeposit);
      expect(await tokenB.balanceOf(deployer.address)).to.equal(deployerInitialBalanceB - expectedBDeposit);
      expect(await simpleSwap.balanceOf(deployer.address)).to.equal(initialLiquidity + expectedLiquidityAdded);
    });
  });
  
  describe("Liquidity Removal", function () {
    // We stipulate already having some liquidity in the pool
    // uint reserveA = IERC20(tokenA).balanceOf(address(this));
    //     uint reserveB = IERC20(tokenB).balanceOf(address(this));
    //     uint totalLP = totalSupply();
    


    // set up a suitable timeout for the test
    let currentTimestamp;
    let newTimestamp;

    beforeEach(async function () {
      // Get current block timestamp
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      currentTimestamp = block.timestamp;

      console.log("Current blockchain timestamp:", currentTimestamp);

      // Add 60 seconds
      newTimestamp = currentTimestamp + 60;
      console.log("New timestamp (+60s):", newTimestamp);
    });

    it("should revert if deadline expired", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
      
      // Attempt to remove liquidity with a past deadline
      await expect(simpleSwap.connect(deployer).removeLiquidity(
        tokenA.target,
        tokenB.target,
        initialLiquidity,
        initialASupply,
        initialBSupply,
        deployer.address,
        currentTimestamp - 1 // Set deadline to past timestamp
      )).to.be.revertedWithCustomError(simpleSwap, "DEADLINE_EXPIRED");
    });

    it("should revert if target address is invalid", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
      // Attempt to remove liquidity with an invalid target address
      await expect(simpleSwap.connect(deployer).removeLiquidity(
        tokenA.target,
        tokenB.target,
        initialLiquidity,
        initialASupply,
        initialBSupply,
        ZERO_ADDRESS,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TO");
    });

    it("should revert if token addresses are invalid", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
      
      
      
      await expect(simpleSwap.connect(deployer).removeLiquidity(
        simpleSwap.target,
        tokenB.target,
        initialLiquidity,
        initialASupply,
        initialBSupply,
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TOKEN");
  
      await expect(simpleSwap.connect(deployer).removeLiquidity(
        tokenA.target,
        simpleSwap.target,
        initialLiquidity,
        initialASupply,
        initialBSupply,
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TOKEN");
      
    });

    it("should revert if there is insufficient liquidity to meet minimun amounts", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
        
        
        
      await expect(simpleSwap.connect(deployer).removeLiquidity(
        tokenA.target,
        tokenB.target,
        initialLiquidity,
        initialASupply + 100n,
        initialBSupply, // Unbalanced amount
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INSUFFICIENT_LIQUIDITY");
    
      await expect(simpleSwap.connect(deployer).removeLiquidity(
        tokenA.target,
        tokenB.target,
        initialLiquidity,
        initialASupply,
        initialBSupply + 100n, // Unbalanced amount
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INSUFFICIENT_LIQUIDITY");
        
    });
    
    it("should remove initial liquidity, emit event, burn LP tokens and transfer pool tokens", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
        
        
      // Check initial balances before adding liquidity
      const deployerInitialBalanceA = await tokenA.balanceOf(deployer.address);
      const deployerInitialBalanceB = await tokenB.balanceOf(deployer.address);
      const initialLiquidity = await simpleSwap.balanceOf(deployer.address);
      const poolBalanceA = await tokenA.balanceOf(simpleSwap.target);
      const poolBalanceB = await tokenB.balanceOf(simpleSwap.target);
      await expect(simpleSwap.connect(deployer).removeLiquidity(
        tokenA.target,
        tokenB.target,
        initialLiquidity,
        initialASupply,
        initialBSupply,
        deployer.address,
        newTimestamp
      )).to.emit(simpleSwap, "LiquidityRemoved")
        .withArgs(deployer.address, deployer.address, initialLiquidity, initialASupply, initialBSupply);
      // Check balances after adding liquidity: deployer's balance should decrease.
      expect(await tokenA.balanceOf(deployer.address)).to.equal(deployerInitialBalanceA + initialASupply);
      expect(await tokenB.balanceOf(deployer.address)).to.equal(deployerInitialBalanceB + initialBSupply);
      expect(await simpleSwap.balanceOf(deployer.address)).to.equal(0n); // LP tokens should be burned
      expect(await tokenA.balanceOf(simpleSwap.target)).to.equal(poolBalanceA - initialASupply);
      expect(await tokenB.balanceOf(simpleSwap.target)).to.equal(poolBalanceB - initialBSupply);
    });
  });

  describe("Token Swap", function () {
    // We stipulate already having some liquidity in the pool
    // uint reserveA = IERC20(tokenA).balanceOf(address(this));
    //     uint reserveB = IERC20(tokenB).balanceOf(address(this));
    //     uint totalLP = totalSupply();
    


    // set up a suitable timeout for the test
    let currentTimestamp;
    let newTimestamp;

    beforeEach(async function () {
      // Get current block timestamp
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      currentTimestamp = block.timestamp;

      console.log("Current blockchain timestamp:", currentTimestamp);

      // Add 60 seconds
      newTimestamp = currentTimestamp + 60;
      console.log("New timestamp (+60s):", newTimestamp);
    });

    it("should revert if deadline expired", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
      const amountIn = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("10");
      // Attempt to remove liquidity with a past deadline
      await expect(simpleSwap.connect(deployer).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenA.target, tokenB.target],
        deployer.address,
        currentTimestamp - 1// Set deadline to past timestamp
      )).to.be.revertedWithCustomError(simpleSwap, "DEADLINE_EXPIRED");
    });

    it("should revert if target address is invalid", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
      const amountIn = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("10");
      // Attempt to remove liquidity with an invalid target address
      await expect(simpleSwap.connect(deployer).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenA.target, tokenB.target],
        ZERO_ADDRESS,
        newTimestamp 
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TO");
    });

    it("should revert if the path.lenght != 2", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
        
        
      // Check initial balances before adding liquidity
      
      await expect(simpleSwap.connect(deployer).swapExactTokensForTokens(
        initialASupply,
        0n,
        [tokenA.target, tokenB.target, tokenA.target], // Invalid path with length
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_SWAP_ROUTE");
    });

    it("should revert if the tokens provided are not A and B and distinct", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);

      await expect(simpleSwap.connect(deployer).swapExactTokensForTokens(
        initialASupply,
        0n,
        [tokenA.target, deployer.address],
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TOKEN");

      await expect(simpleSwap.connect(deployer).swapExactTokensForTokens(
        initialASupply,
        0n,
        [deployer.address, tokenB.target],
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TOKEN");

      await expect(simpleSwap.connect(deployer).swapExactTokensForTokens(
        initialASupply,
        0n,
        [tokenB.target, tokenB.target],
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INVALID_TOKEN");
    });

    it("should revert if the output amount does not meet minimum required", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
        
        
      // Check initial balances before adding liquidity
      
      await expect(simpleSwap.connect(deployer).swapExactTokensForTokens(
        initialASupply,
        initialBSupply + 100n, // Unbalanced amount
        [tokenA.target, tokenB.target], 
        deployer.address,
        newTimestamp
      )).to.be.revertedWithCustomError(simpleSwap, "INSUFFICIENT_OUTPUT_AMOUNT");
    });

    it("should swap tokens, emit event and transfer tokens", async function () {
      const { tokenA, tokenB, simpleSwap, deployer } = await loadFixture(deployFixtureWithInitialLiquidity);
        
      // Check initial balances before swapping
      const deployerInitialBalanceA = await tokenA.balanceOf(deployer.address);
      const deployerInitialBalanceB = await tokenB.balanceOf(deployer.address);
      const poolBalanceA = await tokenA.balanceOf(simpleSwap.target);
      const poolBalanceB = await tokenB.balanceOf(simpleSwap.target);
      
      // Swap tokens
      const amountIn = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("10");
      // calculate the expected amount out based on the initial pool balances

      const amountOut = await simpleSwap.getAmountOut(amountIn, poolBalanceA, poolBalanceB);

      await expect(simpleSwap.connect(deployer).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenA.target, tokenB.target],
        deployer.address,
        newTimestamp
      )).to.emit(simpleSwap, "Swap")
        .withArgs(
          deployer.address,
          deployer.address,
          tokenA.target,
          tokenB.target,
          amountIn,
          amountOut
        );
      
      // Check balances after swapping: deployer's balance should decrease for A and increase for B.
      expect(await tokenA.balanceOf(deployer.address)).to.equal(deployerInitialBalanceA - amountIn);
      expect(await tokenB.balanceOf(deployer.address)).to.equal(deployerInitialBalanceB + amountOut); 
      expect(await tokenA.balanceOf(simpleSwap.target)).to.equal(poolBalanceA + amountIn);
      expect(await tokenB.balanceOf(simpleSwap.target)).to.equal(poolBalanceB - amountOut); 
    });
  });
  
  describe("getAmountOut", function () {
    it("should calculate the correct amount out based on reserves", async function () {
      const { tokenA, tokenB, simpleSwap } = await loadFixture(deployFixtureWithInitialLiquidity);
      
      const amountIn = ethers.parseEther("10");
      const reserveA = await tokenA.balanceOf(simpleSwap.target);
      const reserveB = await tokenB.balanceOf(simpleSwap.target);
      
      const expectedAmountOut = await simpleSwap.getAmountOut(amountIn, reserveA, reserveB);
      
      expect(expectedAmountOut).to.equal((amountIn * reserveB) / (reserveA + amountIn))
    });
  });

  describe("getPrice", function () {
    it("should calculate the price of token A in terms of token B", async function () {
      const { tokenA, tokenB, simpleSwap } = await loadFixture(deployFixtureWithInitialLiquidity);
      
      
      const reserveA = await tokenA.balanceOf(simpleSwap.target);
      const reserveB = await tokenB.balanceOf(simpleSwap.target);
      
      const price = await simpleSwap.getPrice(tokenA.target, tokenB.target);
      
      expect(price).to.equal((reserveB * ethers.parseEther("1")) / reserveA);
    });

    it("should revert if there is no liquidity", async function () {
      const { tokenA, tokenB, simpleSwap } = await loadFixture(deployFixture);
      
      await expect(simpleSwap.getPrice(tokenA.target, tokenB.target
        )).to.be.revertedWithCustomError(simpleSwap, "INSUFFICIENT_LIQUIDITY");

    });
  });
  
});

