import Web3 from "web3";

const CELO_RPC = "https://alfajores-forno.celo-testnet.org";
const RECEIVER_ADDRESS = "0xfb4580155df1869e4145a5313b23606b9a9b101d"; // 👈 Replace with your Celo address
const MIN_AMOUNT_CELO = 0.1;

const web3 = new Web3(CELO_RPC);
let lastTxHash = "";
let paymentHistory = [];

export default async function handler(req, res) {
  try {
    const latestBlock = await web3.eth.getBlock("latest", true);
    if (!latestBlock || !latestBlock.transactions)
      return res.status(200).json({ payment: false, message: "No transactions found" });

    const tx = latestBlock.transactions.find(
      (t) =>
        t.to &&
        t.to.toLowerCase() === RECEIVER_ADDRESS.toLowerCase() &&
        parseFloat(web3.utils.fromWei(t.value, "ether")) >= MIN_AMOUNT_CELO
    );

    if (!tx)
      return res.status(200).json({ payment: false, message: "No valid payment yet" });

    if (tx.hash === lastTxHash)
      return res.status(200).json({ payment: false, message: "No new payment" });

    lastTxHash = tx.hash;

    const amount = parseFloat(web3.utils.fromWei(tx.value, "ether")).toFixed(4);
    const newPayment = {
      from: tx.from,
      amount,
      hash: tx.hash,
      time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    };

    paymentHistory.unshift(newPayment);
    if (paymentHistory.length > 10) paymentHistory.pop();

    console.log("✅ New CELO payment detected:", amount, "from", tx.from);
    return res.status(200).json({ payment: true, amount, hash: tx.hash });
  } catch (err) {
    console.error("Error checking payment:", err);
    res.status(500).json({ error: "Error checking payment" });
  }
}

// Export shared memory for index.js dashboard
export { paymentHistory };
