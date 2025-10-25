import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const HELIUS_API_KEY = "5e625ff9-1643-47d1-93af-191efa78931d";
const WALLET_ADDRESS = "AeAiU3YnaNYGuHU4GD8iEX66ELrabQpyFdtsjFiCoBHd";
let lastSignature = ""; // to avoid duplicate confirmation
const MIN_AMOUNT_SOL = 0.01; // coffee price

app.get("/check-payment", async (req, res) => {
  try {
    const url = `https://api.helius.xyz/v0/addresses/${WALLET_ADDRESS}/transactions?api-key=${HELIUS_API_KEY}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.length === 0) {
      return res.json({ payment: false, message: "No transactions yet" });
    }

    const tx = data[0];
    const sig = tx.signature;

    // If already processed
    if (sig === lastSignature) {
      return res.json({ payment: false, message: "No new payment" });
    }

    // Check if SOL transfer to our wallet
    const transfers = tx.tokenTransfers || [];
    const solTransfer = transfers.find(t => 
      t.toUserAccount === WALLET_ADDRESS && t.mint === "So11111111111111111111111111111111111111112"
    );

    if (solTransfer) {
      const amountSol = parseFloat(solTransfer.tokenAmount);
      if (amountSol >= MIN_AMOUNT_SOL) {
        lastSignature = sig;
        console.log("✅ Valid payment received:", amountSol, "SOL");
        return res.json({ payment: true, amount: amountSol });
      }
    }

    res.json({ payment: false, message: "No valid payment found" });

  } catch (err) {
    console.error("Error checking payment:", err);
    res.status(500).json({ error: "Error checking payment" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
