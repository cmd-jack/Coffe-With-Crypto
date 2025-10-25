import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// ---------- CONFIG ----------
const HELIUS_API_KEY = "5e625ff9-1643-47d1-93af-191efa78931d";
const WALLET_ADDRESS = "AeAiU3YnaNYGuHU4GD8iEX66ELrabQpyFdtsjFiCoBHd";
const MIN_AMOUNT_SOL = 0.001;

let lastSignature = "";
let paymentHistory = []; // store recent payments

// ---------- HOME ROUTE ----------
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
      ${
        paymentHistory.length === 0
          ? `<tr><td colspan="5">No payments yet</td></tr>`
          : paymentHistory
              .map(
                (p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.from}</td>
              <td>${p.amount}</td>
              <td><a href="https://explorer.solana.com/tx/${p.signature}?cluster=devnet" target="_blank">View</a></td>
              <td>${p.time}</td>
            </tr>
          `
              )
              .join("")
      }
    </table>
    <div class="footer">Powered by Solana Devnet + Vercel</div>
  </body>
  </html>
  `;
  res.send(html);
});

// ---------- CHECK PAYMENT ROUTE ----------
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

    // Skip if already processed
    if (sig === lastSignature) {
      return res.json({ payment: false, message: "No new payment" });
    }

    // ✅ Check for native SOL transfers
    const solTransfers = tx.nativeTransfers || [];
    const solTransfer = solTransfers.find(
      (t) => t.toUserAccount === WALLET_ADDRESS
    );

    if (solTransfer) {
      const amountSol = parseFloat(solTransfer.amount) / 1e9; // convert lamports → SOL
      if (amountSol >= MIN_AMOUNT_SOL) {
        lastSignature = sig;

        // Add to history
        paymentHistory.unshift({
          from: solTransfer.fromUserAccount,
          amount: amountSol.toFixed(4),
          signature: sig,
          time: new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
        });

        // Keep only last 10
        if (paymentHistory.length > 10) paymentHistory.pop();

        console.log(
          "✅ Valid payment:",
          amountSol,
          "SOL from",
          solTransfer.fromUserAccount
        );
        return res.json({ payment: true, amount: amountSol });
      }
    }

    res.json({ payment: false, message: "No valid SOL transfer found" });
  } catch (err) {
    console.error("Error checking payment:", err);
    res.status(500).json({ error: "Error checking payment" });
  }
});

// ---------- RUN SERVER ----------
app.listen(3000, () =>
  console.log("🚀 Server running on http://localhost:3000")
);
