/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/constant/contract";
import { NextResponse } from "next/server";
import { Chain, createWalletClient, getContract, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Vérification de la configuration dans les variables d'environnement
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PK as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL as string;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID);
if (!RELAYER_PRIVATE_KEY || !RPC_URL || !CONTRACT_ADDRESS) {
  throw new Error("Relayer configuration missing in environment variables");
}

// Création du transport RPC
const transport = http(RPC_URL);
let currentNonce: number | null = null;

interface QueueItem {
  playerAddress: string;
  action: string;
  score?: number;
  resolve: (txHash: string) => void;
  reject: (error: { message: string }) => void;
}

const transactionQueue: QueueItem[] = [];
let processing = false;

async function processTransaction(
  playerAddress: string,
  action: string,
  score?: number
): Promise<string> {
  const account = privateKeyToAccount(
    RELAYER_PRIVATE_KEY.startsWith("0x")
      ? RELAYER_PRIVATE_KEY
      : `0x${RELAYER_PRIVATE_KEY}`
  );

  const walletClient = createWalletClient({
    account,
    chain: { id: CHAIN_ID } as Chain,
    transport,
  });

  const contract = getContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    client: walletClient,
  });

  if (currentNonce === null) {
    const nonceHex = await walletClient.request({
      method: "eth_getTransactionCount" as any,
      params: [account.address, "pending"],
    });
    currentNonce = parseInt(String(nonceHex), 16);
  }
  const txOptions = { nonce: currentNonce };
  currentNonce++;

  let txHash: string;
  try {
    // Mapper les différentes actions : "click", "submitScore", "game_over", "powerup"
    let actualAction = action;
    if (action === "game_over") {
      actualAction = "submitScore";
      if (typeof score !== "number") {
        score = 0;
      }
    } else if (action === "powerup") {
      actualAction = "click";
    }
    
    if (actualAction === "click") {
      txHash = await contract.write.click([playerAddress], txOptions);
    } else if (actualAction === "submitScore") {
      if (typeof score !== "number") {
        throw new Error("Invalid or missing 'score' parameter for submitScore action.");
      }
      txHash = await contract.write.submitScore([score, playerAddress], txOptions);
    } else {
      throw new Error("Invalid action. Supported actions: 'click', 'submitScore', 'game_over', 'powerup'.");
    }
  } catch (error) {
    if ((error as { message: string }).message &&
        (error as { message: string }).message.includes("Nonce too low")) {
      const nonceHex = await walletClient.request({
        method: "eth_getTransactionCount" as any,
        params: [account.address, "pending"],
      });
      currentNonce = parseInt(String(nonceHex), 16);
      const newTxOptions = { nonce: currentNonce };
      currentNonce++;
      if (action === "click" || action === "powerup") {
        txHash = await contract.write.click([playerAddress], newTxOptions);
      } else if (action === "submitScore" || action === "game_over") {
        txHash = await contract.write.submitScore([score, playerAddress], newTxOptions);
      } else {
        throw new Error("Invalid action on retry.");
      }
    } else {
      throw error;
    }
  }
  return txHash;
}

async function processQueue() {
  if (processing) return;
  processing = true;
  while (transactionQueue.length > 0) {
    const item = transactionQueue.shift()!;
    try {
      const txHash = await processTransaction(item.playerAddress, item.action, item.score);
      item.resolve(txHash);
    } catch (error) {
      item.reject(error as { message: string });
    }
  }
  processing = false;
}

// ================================
// Configuration CORS
// ================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // Vous pouvez restreindre à un domaine si besoin : ex "http://localhost:53505"
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"       // 24 heures
};

// Gérer la requête OPTIONS avec new Response pour garantir l'envoi des headers
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Gérer la requête POST en renvoyant aussi les headers CORS
export async function POST(req: Request) {
  try {
    const { playerAddress, action, score } = await req.json();
    if (!playerAddress || !action) {
      return NextResponse.json(
        { error: "Invalid request. 'playerAddress' and 'action' are required." },
        { status: 400, headers: corsHeaders }
      );
    }
    const txPromise = new Promise<string>((resolve, reject) => {
      transactionQueue.push({ playerAddress, action, score, resolve, reject });
    });
    processQueue();
    const txHash = await txPromise;
    return NextResponse.json(
      { success: true, txHash },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Relayer error:", error);
    return NextResponse.json(
      { error: "Transaction failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
