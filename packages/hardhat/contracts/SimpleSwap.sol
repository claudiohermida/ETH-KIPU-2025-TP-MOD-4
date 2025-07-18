// Order of Layout
// Contract elements should be laid out in the following order:

// Pragma statements

// Import statements

// Events

// Errors

// Interfaces

// Libraries

// Contracts

// Inside each contract, library or interface, use the following order:

// Type declarations

// State variables

// Events

// Errors

// Modifiers

// Functions

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Interface for SimpleSwap
interface ISimpleSwap {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
    // returns (uint[] memory amounts);

    function getPrice(address tokenA, address tokenB) external view returns (uint256 price);
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external view returns (uint256);
}

contract SimpleSwap is ISimpleSwap, ERC20 {
    /*///////////////////////////////////////////////////////////////
                           TYPES
     //////////////////////////////////////////////////////////////*/

    /** @notice Local state of the swapExactTokensForTokens function
     *  @dev This struct is used to store the local state of the swap operation,
     *  @param tokenIn: address of input token
     *  @param tokenOut: address of output token
     *  @param reserveIn: reserve of input token in the swap contract
     *  @param reserveOut: reserve of output token in the swap contract
     *  @param amountOut: amount of output token to be received
     */
    struct SwapLocalState {
        address tokenIn;
        address tokenOut;
        uint reserveIn;
        uint reserveOut;
        uint amountOut;
    }

    /*///////////////////////////////////////////////////////////////
                           STATE
      //////////////////////////////////////////////////////////////*/

    // we should have used private variables instantiated in the constructor for the two tokens,
    // rather than overcomplicating the swap interface by adding the token addresses in every function call
    /// @notice The first token of the trading pair.
    IERC20 private immutable _tokenA;
    /// @notice The first token of the trading pair.
    IERC20 private immutable _tokenB;

    /*///////////////////////////////////////////////////////////////
                           EVENTS
      //////////////////////////////////////////////////////////////*/
    /**
     * @notice someone added liquidity to the pool
     * @param lProvider:  address of liquidity provider
     * @param to:  address of receiver of liquidity tokens
     * @param amountAIn: amount of token A deposited
     * @param amountBIn: amount of token B deposited
     * @param liquidityTokensOut: amount of LP shares minted
     */
    event LiquidityAdded(
        address indexed lProvider,
        address indexed to,
        uint amountAIn,
        uint amountBIn,
        uint liquidityTokensOut
    );

    /**
     * @notice some LP removed liquidity to the pool
     * @param lProvider:  address of liquidity provider
     * @param to:  address of receiver of liquidity tokens
     * @param liquidityTokensIn: amount of LP shares burnt
     * @param amountAOut: amount of token A received/withdrawn
     * @param amountBOut: amount of token B received/withdrawn
     */
    event LiquidityRemoved(
        address indexed lProvider,
        address indexed to,
        uint liquidityTokensIn,
        uint amountAOut,
        uint amountBOut
    );

    /**
     * @notice a swap has been performed from tokenIn into tokenOut
     * @param sender:  address of provider of input tokens
     * @param receiver: address of recipient of output tokens
     * @param tokenIn: address of token deposited
     * @param tokenOut: address of token received
     * @param amountIn: amount of token deposite
     * @param amountOut: amount of token received/withdrawn
     */
    event Swap(
        address indexed sender,
        address indexed receiver,
        address tokenIn,
        address tokenOut,
        uint amountIn,
        uint amountOut
    );

    /*///////////////////////////////////////////////////////////////
                           ERRORS
      //////////////////////////////////////////////////////////////*/

    /**
     * @notice invalid token address for interaction
     */
    error INVALID_TOKEN();

    /**
     * @notice invalid address to send tokens to (address(0))
     */
    error INVALID_TO();

    /**
     * @notice insufficient amount of expected output tokens,
     * below minimum desired
     */
    error INSUFFICIENT_OUTPUT_AMOUNT();

    /**
     * @notice insufficient liquidity to swap or to fulfill a liquidity withdrawal
     */
    error INSUFFICIENT_LIQUIDITY();

    /**
     * @notice proposed liquidity provision would unbalance pool,
     * breaking the invariant x * y == k
     */
    error UNBALANCED_LIQUIDITY_PROVISION();

    // /**
    //   * @notice proposed liquidity would be zero
    //   */
    // error INSUFFICIENT_LIQUIDITY_MINTED();

    // /**
    //   * @notice liquidity to burn would be zero
    //   */
    // error INSUFFICIENT_LIQUIDITY_BURNED();

    /**
     * @notice deadline expired to perform operation
     */
    error DEADLINE_EXPIRED();

    /**
     * @notice invalid swap route
     * in our simple set up, it should have length 2
     * and consists of either [tokenA,tokenB] or [tokenB,tokenA]
     */
    error INVALID_SWAP_ROUTE();

    /*///////////////////////////////////////////////////////////////
                           MODFIFIERS
      //////////////////////////////////////////////////////////////*/

    /**
     * @notice must be performed up to deadline
     */
    modifier onlyBeforeDeadline(uint deadline) {
        if (block.timestamp > deadline) {
            revert DEADLINE_EXPIRED();
        }
        _;
    }

    /**
     * @notice must not use address(0)
     */
    modifier onlyValidAddress(address to) {
        if (to == address(0)) {
            revert INVALID_TO();
        }
        _;
    }

    /*///////////////////////////////////////////////////////////////
                           HELPER FUNCTIONS
      //////////////////////////////////////////////////////////////*/

    /**
     * @dev Calculates the optimal amount of tokenA and tokenB to add to the liquidity pool
     * based on desired amounts and current pool reserves.
     * @param amountADesired The maximum amount of tokenA the caller is willing to deposit.
     * @param amountBDesired The maximum amount of tokenB the caller is willing to deposit.
     * @param reserveA The current reserve of tokenA in the pair contract.
     * @param reserveB The current reserve of tokenB in the pair contract.
     * @return amountA amountB Amounts The calculated actual amounts of tokenA and tokenB to be deposited.
     */
    function _calculateAmountsToDeposit(
        uint amountADesired,
        uint amountBDesired,
        uint reserveA,
        uint reserveB
    ) internal pure returns (uint amountA, uint amountB) {
        //     uint reserveA = tokenA.balanceOf(address(this));
        //     uint reserveB = tokenB.balanceOf(address(this));
        if (reserveA == 0 && reserveB == 0) {
            // First liquidity provision for this pair.
            // In this simplified example, we'll just use the desired amounts directly.
            // A real Uniswap Router would likely ensure both are non-zero.
            return (amountADesired, amountBDesired);
        }

        // Calculate amountB needed if we use all of amountADesired at current ratio
        uint amountBOptimal = (amountADesired * reserveB) / reserveA;

        if (amountBOptimal <= amountBDesired) {
            // We have enough B to match desired A
            amountA = amountADesired;
            amountB = amountBOptimal;
        } else {
            // We don't have enough B, so use all of desired B and calculate A
            uint amountAOptimal = (amountBDesired * reserveA) / reserveB;
            amountA = amountAOptimal;
            amountB = amountBDesired;
        }
    }

    /**
     * @dev Calculates the amount of liquidity tokens to mint,
     * based on deposited amounts and current pool reserves.
     * Special case: initial liquidity provision, no reserves.
     * @param amountADeposited amount of tokens A deposited.
     * @param amountBDeposited amount of tokens B deposited.
     * @param reserveA The current reserve of tokenA in the swap contract.
     * @param reserveB The current reserve of tokenB in the swap contract.
     * @param totalLP the total supply of LP_AB tokens minted so far.
     * @return liquidityTokens The amount of LP_AB tokens to mint.
     */
    function _calculateLiquidityToMint(
        uint amountADeposited,
        uint amountBDeposited,
        uint reserveA,
        uint reserveB,
        uint totalLP
    ) internal pure returns (uint liquidityTokens) {
        // check whether this is the inital liquidity provision
        if (totalLP == 0) {
            // ( reserveA == 0 && reserveB == 0)
            liquidityTokens = Math.sqrt(amountADeposited * amountBDeposited);
        } else {
            liquidityTokens = Math.min(
                (amountADeposited * totalLP) / reserveA,
                (amountBDeposited * totalLP) / reserveB
            );
        }
    }

    /**
     * @dev Calculates the amount of tokens to withdraw when redeeming liquidity,
     * based on current pool reserves.
     * @param liquidityToBurn amount of liquidity tokens to redeem.
     * @param reserveA The current reserve of tokenA in the swap contract.
     * @param reserveB The current reserve of tokenB in the swap contract.
     * @param totalLP the total supply of LP_AB tokens minted so far.
     * @return amountAOut and amountBOut Amounts of A and B tokens to withdraw from the pool.
     */
    function _calculateExitLiquidity(
        uint liquidityToBurn,
        uint reserveA,
        uint reserveB,
        uint totalLP
    ) internal pure returns (uint amountAOut, uint amountBOut) {
        // we could check totalLP != 0, but let Solidity safe math take care of it
        amountAOut = (liquidityToBurn * reserveA) / totalLP;
        amountBOut = (liquidityToBurn * reserveB) / totalLP;
    }

    /*///////////////////////////////////////////////////////////////
                          CONSTRUCTOR
      //////////////////////////////////////////////////////////////*/
    constructor(address tokenA_, address tokenB_) ERC20("LPShares_AB", "LP_AB") {
        _tokenA = IERC20(tokenA_);
        _tokenB = IERC20(tokenB_);
    }

    /*///////////////////////////////////////////////////////////////
                           LOGIC
      //////////////////////////////////////////////////////////////*/

    /**
     * @dev Adds liquidity to the pool.
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @param amountADesired The maximum amount of tokenA to deposit.
     * @param amountBDesired The maximum amount of tokenB to deposit.
     * @param amountAMin The minimum amount of tokenA to accept. Transaction reverts if less is used.
     * @param amountBMin The minimum amount of tokenB to accept. Transaction reverts if less is used.
     * @param to The address to receive the liquidity tokens.
     * @param deadline The unix timestamp after which the transaction will revert.
     * @return amountA The actual amount of tokenA deposited.
     * @return amountB The actual amount of tokenB deposited.
     * @return liquidity The amount of liquidity tokens minted.
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external onlyBeforeDeadline(deadline) onlyValidAddress(to) returns (uint amountA, uint amountB, uint liquidity) {
        // 0. verifies that tokenA and tokenB are the same as the ones in the contract
        if (tokenA != address(_tokenA) || tokenB != address(_tokenB)) {
            revert INVALID_TOKEN();
        }
        // 1. gas saving: we read the reserves into local variables, as they are used in various calculations
        uint reserveA = IERC20(tokenA).balanceOf(address(this));
        uint reserveB = IERC20(tokenB).balanceOf(address(this));
        uint totalLP = totalSupply();

        // 2. compute the optimal amounts to deposit
        (amountA, amountB) = _calculateAmountsToDeposit(amountADesired, amountBDesired, reserveA, reserveB);

        // 3. check whether required minimums are met
        if (amountA < amountAMin || amountB < amountBMin) {
            revert UNBALANCED_LIQUIDITY_PROVISION();
        }

        //4. transfer tokens from sender into swap contract
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        //5. calculate amount of liquidity tokens to mint
        liquidity = _calculateLiquidityToMint(amountA, amountB, reserveA, reserveB, totalLP);
        //6. if we got a positive quantity,
        // mint the corresponding tokens to the target address using the internal _mint
        // and emit the corresponding event
        if (liquidity > 0) {
            _mint(to, liquidity);
            emit LiquidityAdded(msg.sender, to, amountA, amountB, liquidity);
        }
    } // addLiquidity

    /**
     * @dev Removes liquidity from the pool.
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @param liquidity The amount of LP_AB tokens to redeem
     * @param amountAMin The minimum amount of tokenA to accept. Transaction reverts if less is issued.
     * @param amountBMin The minimum amount of tokenB to accept. Transaction reverts if less is issued.
     * @param to The address to receive the A and B tokens.
     * @param deadline The unix timestamp after which the transaction will revert.
     * @return amountA The amount of tokenA received.
     * @return amountB The amount of tokenB received.
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external onlyBeforeDeadline(deadline) onlyValidAddress(to) returns (uint256 amountA, uint256 amountB) {
        // 0. verifies that tokenA and tokenB are the same as the ones in the contract
        if (tokenA != address(_tokenA) || tokenB != address(_tokenB)) {
            revert INVALID_TOKEN();
        }
        // 1. gas saving: we read the reserves into local variables, as they are used in various calculations
        uint reserveA = IERC20(tokenA).balanceOf(address(this));
        uint reserveB = IERC20(tokenB).balanceOf(address(this));
        uint totalLP = totalSupply();

        //2. calculate the amount of tokens A and B to transfer
        (amountA, amountB) = _calculateExitLiquidity(liquidity, reserveA, reserveB, totalLP);

        // 3. check whether required minimums are met
        if (amountA < amountAMin || amountB < amountBMin) {
            revert INSUFFICIENT_LIQUIDITY();
        } else {
            //4. burn the liquidity tokens, calling the internal _burn function
            _burn(msg.sender, liquidity);
            //5. transfer the A and B tokens to receiver
            IERC20(tokenA).transfer(to, amountA);
            IERC20(tokenB).transfer(to, amountB);
            //6. emit the LiquidityRemoved event
            emit LiquidityRemoved(msg.sender, to, liquidity, amountA, amountB);
        }
    } // removeLiquidity

    /**
     * @dev swap a given amount of tokens for its corresponding pair in the pool, according to the current balance
     * @param amountIn The amount of tokens provided to swap
     * @param amountOutMin The minimum of tokens accepted in exchange (slippage protection)
     * @param path The route of token addresses to follow
     * (in our case, only 2, either [tokenA,tokenB] or [tokenB,tokenA])
     * @param to The address to receive the exchanged tokens.
     * @param deadline The unix timestamp after which the transaction will revert.
     */
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external onlyBeforeDeadline(deadline) onlyValidAddress(to) {
        // returns (uint[] memory amounts)
        //0. setup a struct to store local state
        SwapLocalState memory localState;
        // 1. check path has the right length
        if (path.length != 2) {
            revert INVALID_SWAP_ROUTE();
        }

        //2. obtain the address of the tokens in question, saving gas in multiple reads from array
        (localState.tokenIn, localState.tokenOut) = (path[0], path[1]);

        //3. verify validity of addresses,
        // must be either _tokenA or _tokenB and different from each other
        if (localState.tokenIn != address(_tokenA)) {
            if (localState.tokenIn != address(_tokenB)) {
                // tokenIn != tokenA && tokenB
                revert INVALID_TOKEN();
            } else if (localState.tokenOut != address(_tokenA)) {
                // tokenIn == tokenB
                revert INVALID_TOKEN();
            }
        } else if (localState.tokenOut != address(_tokenB)) {
            // tokenIn == tokenA
            revert INVALID_TOKEN();
        }
        //4. gas saving, store reserves in local variables
        localState.reserveIn = IERC20(localState.tokenIn).balanceOf(address(this));
        localState.reserveOut = IERC20(localState.tokenOut).balanceOf(address(this));

        //5. compute amount of tokens to transfer
        localState.amountOut = getAmountOut(amountIn, localState.reserveIn, localState.reserveOut);

        //6. check if minimum met
        if (localState.amountOut < amountOutMin) {
            revert INSUFFICIENT_OUTPUT_AMOUNT();
        }

        //7. perform transfers and emit event
        IERC20(localState.tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(localState.tokenOut).transfer(to, localState.amountOut);
        emit Swap(
            msg.sender, // sender
            to, // target address
            localState.tokenIn, // input token
            localState.tokenOut, // output token
            amountIn,
            localState.amountOut
        );
        //8. assign the quantities in the stablished output array
        // amounts = new uint[](2);
        //  amounts[0] = amountIn;
        //  amounts[1] = amountOut;
    } // swapExactTokensForTokens

    /**
     * @dev return the price of token A in terms of tokenB, according to current reserves
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @return price The price of token A in decimals units of tokenB
     */
    function getPrice(address tokenA, address tokenB) external view returns (uint256 price) {
        // gas saving, store reserves in local variables
        uint reserveA = IERC20(tokenA).balanceOf(address(this));
        uint reserveB = IERC20(tokenB).balanceOf(address(this));

        // check if there is liquidity and if so, calculate price
        if (reserveA > 0 && reserveB > 0) {
            price = (reserveB * 1e18) / reserveA;
        } else {
            revert INSUFFICIENT_LIQUIDITY();
        }
    }

    /**
     * @dev return the amount of tokens to obtain in exchange for amountIn, according to current reserves
     * we use public rather than external as we also use this function in swapExactTokensForTokens
     * if there is no reserveIn and a zero amountIn, it will fail for division by zero.
     * @param amountIn The amount of tokens to exchange
     * @param reserveIn The amount of reserves of the input token
     * @param reserveOut The amount of reserves of the output token
     * @return amountOut the amount of output tokens
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
    }
} // contract SimpleSwap
