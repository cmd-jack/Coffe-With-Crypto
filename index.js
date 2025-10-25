import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const HELIUS_API_KEY = "5e625ff9-1643-47d1-93af-191efa78931d";
const WALLET_ADDRESS = "AeAiU3YnaNYGuHU4GD8iEX66ELrabQpyFdtsjFiCoBHd";
const MIN_AMOUNT_SOL = 0.1;

let lastSignature = "";
let paymentHistory = []; // Store recent payments

// ---------- HOME ROUTE (Simple UI) ----------
app.get("/", (req, res) => {
  let html = `
  <html>
  <head>
    <title>☕ Web3 Coffee Payments</title>
    <style>
      body { font-family: Arial; text-align:center; background:#f5f5f5; }
      h2 { color:#333; }
      table { margin:auto; border-collapse: collapse; width:80%; background:white; }
      th, td { padding:10px; border:1px solid #ddd; }
      th { background:#222; color:white; }
      tr:nth-child(even){ background:#f2f2f2; }
      .footer { margin-top:20px; color:#666; font-size:14px; }
    </style>
  </head>
  <body>
    <h2>☕ Coffee Machine Payment History</h2>
    <table>
      <tr><th>#</th><th>Wallet</th><th>Amount (SOL)</th><th>Signature</th><th>Time</th></tr>
      ${paymentHistory.length === 0 
        ? `<tr><td colspan="5">No payments yet</td></tr>`
        : paymentHistory.map((p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.from}</td>
              <td>${p.amount}</td>
              <td><a href="https://explorer.solana.com/tx/${p.signature}?cluster=devnet" target="_blank">View</a></td>
              <td>${p.time}</td>
            </tr>
          `).join("")
      }
    </table>
    <div class="footer">Powered by Solana Devnet + Vercel</div>
  </body>
  </html>
  `;
  res.send(html);
});

// ---------- CHECK PAYMENT (for ESP8266) ----------
app.get("/check-payment", async (req, res) => {
  try {
    const url = `https://api.helius.xyz/v0/addresses/${WALLET_ADDRESS}/transactions?api-key=${HELIUS_API_KEY}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.length === 0)
      return res.json({ payment: false, message: "No transactions yet" });

    const tx = data[0];
    const sig = tx.signature;

    // Skip if already processed
    if (sig === lastSignature)
      return res.json({ payment: false, message: "No new payment" });

    // Find SOL transfer to our wallet
    const transfers = tx.tokenTransfers || [];
    const solTransfer = transfers.find(t =>
      t.toUserAccount === WALLET_ADDRESS &&
      t.mint === "So11111111111111111111111111111111111111112"
    );

    if (solTransfer) {
      const amountSol = parseFloat(solTransfer.tokenAmount);
      if (amountSol >= MIN_AMOUNT_SOL) {
        lastSignature = sig;

        // Add to history
        paymentHistory.unshift({
          from: solTransfer.fromUserAccount,
          amount: amountSol,
          signature: sig,
          time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        });

        // Keep last 10 payments only
        if (paymentHistory.length > 10) paymentHistory.pop();

        console.log("✅ Valid payment:", amountSol, "SOL from", solTransfer.fromUserAccount);
        return res.json({ payment: true, amount: amountSol });
      }
    }

    res.json({ payment: false, message: "No valid payment found" });

  } catch (err) {
    console.error("Error checking payment:", err);
    res.status(500).json({ error: "Error checking payment" });
  }
});

// ---------- RUN LOCALLY ----------
app.listen(3000, () => console.log("Server running on port 3000"));
