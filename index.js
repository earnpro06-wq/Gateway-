const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');

// ১. ফায়ারবেস কানেকশন (পাথ ঠিক করা হয়েছে)
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bet-baji-vip-default-rtdb.firebaseio.com"
});

const db = admin.database();
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ২. পেমেন্ট রিসিভ করার এন্ডপয়েন্ট
app.post('/sms-webhook', async (req, res) => {
    // অ্যাপ থেকে পাঠানো JSON ডাটা ধরা
    const sms = req.body.text; 
    const sender = req.body.from;

    console.log(`পেমেন্ট SMS এসেছে: ${sms}`);

    // পেমেন্ট কি না যাচাই করা
    if (sms && (sms.includes("TrxID") || sms.includes("Transaction ID"))) {
        try {
            // Regex দিয়ে TrxID এবং Amount বের করা
            const trxMatch = sms.match(/[0-9A-Z]{10}/);
            const amountMatch = sms.match(/Tk ([0-9,.]+)/);

            const trxId = trxMatch ? trxMatch[0] : "UNKNOWN_" + Date.now();
            const amount = amountMatch ? amountMatch[1] : "0";

            // ৩. Firebase-এ ডাটা সেভ
            await db.ref('autopayments/' + trxId).set({
                amount: amount,
                sender: sender,
                sms_full: sms,
                status: "Pending",
                timestamp: Date.now()
            });

            console.log(`ফায়ারবেসে সেভ হয়েছে: TrxID ${trxId}`);
            res.status(200).send("Success");
        } catch (error) {
            console.error("Error parsing SMS:", error);
            res.status(500).send("Error");
        }
    } else {
        res.status(400).send("Not a payment SMS");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
