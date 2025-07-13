"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
// import { useTransactor } from "~~/hooks/scaffold-eth/useTransactor";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [swapResult, setSwapResult] = useState<{ amountIn: string; amountOut: string } | null>(null);

  // const writeTx = useTransactor();

  // Get contract addresses based on current network
  const getContractAddresses = () => {
    const networkId = targetNetwork.id;
    const contracts = deployedContracts[networkId as keyof typeof deployedContracts];

    if (!contracts) {
      console.warn(`No contracts found for network ${networkId}`);
      return null;
    }

    // Check if we're on localhost and provide better error handling
    if (networkId === 31337) {
      console.log("Connected to localhost network. Make sure local blockchain is running with 'yarn chain'");
    }

    return {
      simpleSwapAddress: contracts.SimpleSwap?.address,
      tokenAAddress: contracts.TokenA?.address,
      tokenBAddress: contracts.TokenB?.address,
    };
  };

  const contractAddresses = getContractAddresses();
  const simpleSwapAddress = contractAddresses?.simpleSwapAddress || "";
  const tokenAAddress = contractAddresses?.tokenAAddress || "";
  const tokenBAddress = contractAddresses?.tokenBAddress || "";

  // Read contract hooks with error handling
  const { data: currentPrice, error: priceError } = useScaffoldReadContract({
    contractName: "SimpleSwap",
    functionName: "getPrice",
    args: [tokenAAddress, tokenBAddress],
  });

  const { data: userBalance, error: balanceError } = useScaffoldReadContract({
    contractName: "TokenA",
    functionName: "balanceOf",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
  });

  const {
    data: tokenAAllowance,
    refetch: refetchAllowance,
    error: allowanceError,
  } = useScaffoldReadContract({
    contractName: "TokenA",
    functionName: "allowance",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000", simpleSwapAddress],
  });

  const { data: reserveIn, error: reserveInError } = useScaffoldReadContract({
    contractName: "TokenA",
    functionName: "balanceOf",
    args: [simpleSwapAddress],
  });

  const { data: reserveOut, error: reserveOutError } = useScaffoldReadContract({
    contractName: "TokenB",
    functionName: "balanceOf",
    args: [simpleSwapAddress],
  });

  // Calculate amount out manually using the same formula as the contract
  const calculateAmountOut = (amountIn: string, reserveIn: bigint, reserveOut: bigint): string => {
    if (!amountIn || parseFloat(amountIn) <= 0 || reserveIn === BigInt(0)) {
      return "";
    }
    const amountInWei = parseEther(amountIn);
    const amountOutWei = (amountInWei * reserveOut) / (reserveIn + amountInWei);
    return formatEther(amountOutWei);
  };

  // Debug logging
  console.log("Debug:", {
    amountIn,
    reserveIn: reserveIn?.toString(),
    reserveOut: reserveOut?.toString(),
    amountOut,
    hasReserves: !!(reserveIn && reserveOut),
    reserveInValue: reserveIn ? formatEther(reserveIn) : "0",
    reserveOutValue: reserveOut ? formatEther(reserveOut) : "0",
    tokenAAllowance: tokenAAllowance?.toString(),
    connectedAddress,
    contractAddresses: !!contractAddresses,
  });

  // Log errors if they occur
  if (priceError) console.error("Price fetch error:", priceError);
  if (balanceError) console.error("Balance fetch error:", balanceError);
  if (allowanceError) console.error("Allowance fetch error:", allowanceError);
  if (reserveInError) console.error("ReserveIn fetch error:", reserveInError);
  if (reserveOutError) console.error("ReserveOut fetch error:", reserveOutError);

  // Write contract hooks
  const { writeContractAsync: writeTokenAAsync } = useScaffoldWriteContract({
    contractName: "TokenA",
  });

  const { writeContractAsync: writeSimpleSwapAsync } = useScaffoldWriteContract({
    contractName: "SimpleSwap",
  });

  // Update price display
  useEffect(() => {
    if (currentPrice) {
      setPrice(formatEther(currentPrice));
    }
  }, [currentPrice]);

  // Update amount out when amountIn or reserves change
  useEffect(() => {
    console.log("useEffect triggered:", {
      amountIn,
      reserveIn: reserveIn?.toString(),
      reserveOut: reserveOut?.toString(),
      hasValidReserves: !!(reserveIn && reserveOut && reserveIn > BigInt(0) && reserveOut > BigInt(0)),
    });

    if (amountIn && reserveIn && reserveOut && reserveIn > BigInt(0) && reserveOut > BigInt(0)) {
      try {
        const calculatedAmount = calculateAmountOut(amountIn, reserveIn, reserveOut);
        console.log("Setting amountOut to:", calculatedAmount);
        setAmountOut(calculatedAmount);
      } catch (error) {
        console.error("Error calculating amount out:", error);
        setAmountOut("");
      }
    } else {
      setAmountOut("");
    }
  }, [amountIn, reserveIn, reserveOut]);

  const handleSwap = async () => {
    if (!connectedAddress || !amountIn) return;

    try {
      setIsConfirming(true);
      const amountInWei = parseEther(amountIn);
      const amountOutMin = parseEther(((parseFloat(price || "0") * parseFloat(amountIn)) / 2).toString());
      const deadline = Math.floor(Date.now() / 1000) + 120;

      // Check allowance and approve if needed
      if (!tokenAAllowance || tokenAAllowance < amountInWei) {
        console.log("Insufficient allowance. Current:", tokenAAllowance?.toString(), "Needed:", amountInWei.toString());

        // Need to approve first
        try {
          await writeTokenAAsync({
            functionName: "approve",
            args: [simpleSwapAddress, amountInWei],
          });

          notification.success("Approval successful! Please wait for confirmation...");

          // Wait a bit for the approval to be processed
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Refetch allowance to ensure it was updated
          await refetchAllowance();

          // Double-check allowance after approval
          const updatedAllowance = await refetchAllowance();
          console.log("Updated allowance:", updatedAllowance?.data?.toString());
        } catch (approvalError) {
          console.error("Approval failed:", approvalError);
          notification.error("Approval failed. Please try again.");
          setIsConfirming(false);
          return;
        }
      }

      // Perform swap
      await writeSimpleSwapAsync({
        functionName: "swapExactTokensForTokens",
        args: [amountInWei, amountOutMin, [tokenAAddress, tokenBAddress], connectedAddress, BigInt(deadline)],
      });

      notification.success(`Swap confirmed: ${amountIn} A -> ${amountOut} B`);

      // Set swap result for banner display
      setSwapResult({ amountIn, amountOut });

      // Reset form
      setAmountIn("");
      setAmountOut("");
      setIsConfirming(false);
    } catch (error) {
      console.error("Swap error:", error);
      notification.error("Swap failed. Please try again.");
      setIsConfirming(false);
    }
  };

  const isFormValid = connectedAddress && amountIn && parseFloat(amountIn) > 0 && contractAddresses;

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">SimpleSwap</span>
          </h1>

          {/* Swap Form */}
          <div className="max-w-md mx-auto bg-base-100 rounded-lg shadow-lg p-6">
            {/* Header with balance */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Swap Tokens</h2>
              {connectedAddress && userBalance !== undefined && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Token A Balance</p>
                  <p className="font-mono">Balance: {formatEther(userBalance)}</p>
                </div>
              )}
            </div>

            {/* Input Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Amount of tokens A to swap</label>
                <input
                  type="number"
                  placeholder="amount of tokens A to swap"
                  value={amountIn}
                  onChange={e => setAmountIn(e.target.value)}
                  disabled={!connectedAddress || !contractAddresses}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Expected amount of tokens B to receive</label>
                <input
                  type="number"
                  placeholder="expected amount of tokens B to receive"
                  value={amountOut}
                  onChange={e => setAmountOut(e.target.value)}
                  disabled={!connectedAddress || !contractAddresses}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Price Display */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm">
                <span className="text-gray-600">Price: </span>
                <span className="font-mono">PRICE: 1 A → {price ? parseFloat(price).toFixed(6) : "..."} B</span>
              </div>
            </div>

            {/* Reserves Info */}
            {reserveIn && reserveOut && (
              <div className="text-xs text-gray-500 mb-4">
                <p>
                  Pool Reserves: {formatEther(reserveIn)} A / {formatEther(reserveOut)} B
                </p>
              </div>
            )}

            {/* No Liquidity Warning */}
            {(!reserveIn || !reserveOut || reserveIn === BigInt(0) || reserveOut === BigInt(0)) && (
              <div className="text-xs text-red-500 mb-4">
                <p>⚠️ No liquidity in pool. Cannot calculate swap amounts.</p>
              </div>
            )}

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={!isFormValid || isConfirming}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {isConfirming ? "Processing..." : isFormValid ? "CONFIRM" : "SWAP"}
            </button>

            {!connectedAddress && (
              <p className="text-center text-sm text-gray-600 mt-4">Please connect your wallet to start swapping</p>
            )}
          </div>

          {/* Swap Confirmation Banner */}
          {swapResult && (
            <div className="max-w-md mx-auto mt-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">✅ Swap Confirmed!</p>
                  <p className="text-sm">
                    Swapped {swapResult.amountIn} A → {swapResult.amountOut} B
                  </p>
                </div>
                <button
                  onClick={() => setSwapResult(null)}
                  className="text-green-500 hover:text-green-700 text-lg font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
