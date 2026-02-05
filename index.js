const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');

// ১. ফায়ারবেস কানেকশন
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bet-baji-vip-default-rtdb.firebaseio.com"
});

const db = admin.database();
const app = express();

// সব ধরণের ফরম্যাট সাপোর্ট করার জন্য মিডলওয়্যার
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ২. পেমেন্ট রিসিভ করার এন্ডপয়েন্ট
app.post('/sms-webhook', async (req, res) => {
    // ডাটা রিসিভ করা (JSON অথবা Form-data যাই হোক)
    const sms = req.body.text || req.body.message || req.body.body; 
    const sender = req.body.from || req.body.sender || "Unknown";

    console.log(`পেমেন্ট SMS এসেছে: ${sms}`);

    // যদি ডাটা undefined থাকে তবে সার্ভারে লগ দিবে
    if (!sms) {
        console.log("Error: No message content received.");
        return res.status(400).send("No content found");
    }

    // পেমেন্ট কি না যাচাই করা (বিকাশ/নগদ/রকেট এসএমএস চেক)
    if (sms.includes("TrxID") || sms.includes("Transaction ID") || sms.includes("Trx")) {
        try {
            // Regex দিয়ে TrxID এবং Amount বের করা
            const trxMatch = sms.match(/[0-9A-Z]{8,12}/); // ১০ অক্ষরের TrxID খুঁজে বের করবে
            const amountMatch = sms.match(/(?:Tk|Amount|টাকা)\s?([0-9,.]+)/i);

            const trxId = trxMatch ? trxMatch[0] : null;
            const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : "0";

            if (!trxId) {
                console.log("TrxID খুঁজে পাওয়া যায়নি।");
                return res.status(200).send("No TrxID found in message");
            }

            // ৩. Firebase-এ ডাটা সেভ
            await db.ref('autopayments/' + trxId).set({
                amount: parseFloat(amount),
                sender: sender,
                sms_full: sms,
                status: "Success",
                timestamp: Date.now()
            });

            console.log(`ফায়ারবেসে সেভ হয়েছে: TrxID ${trxId}, Amount: ${amount}`);
            res.status(200).send("Success");
        } catch (error) {
            console.error("Error parsing SMS:", error);
            res.status(500).send("Error");
        }
    } else {
        console.log("এটি কোনো পেমেন্ট এসএমএস নয়।");
        res.status(200).send("Not a payment SMS");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
