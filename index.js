const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');

// ১. ফায়ারবেস কানেকশন (Firestore এর জন্য আপডেট করা)
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Realtime Database এর বদলে Firestore ডিক্লেয়ার করা
const db = admin.firestore(); 
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ২. পেমেন্ট রিসিভ করার এন্ডপয়েন্ট
app.post('/sms-webhook', async (req, res) => {
    // ডাটা রিসিভ করা
    const sms = req.body.text || req.body.message || req.body.body; 
    const sender = req.body.from || req.body.sender || "Unknown";

    console.log(`পেমেন্ট SMS এসেছে: ${sms}`);

    if (!sms) {
        console.log("Error: No message content received.");
        return res.status(400).send("No content found");
    }

    // পেমেন্ট যাচাই করা (বিকাশ, নগদ, রকেট)
    if (sms.includes("TrxID") || sms.includes("Transaction ID") || sms.includes("Trx")) {
        try {
            // Regex দিয়ে TrxID এবং Amount বের করা
            const trxMatch = sms.match(/[0-9A-Z]{8,12}/); 
            const amountMatch = sms.match(/(?:Tk|Amount|টাকা)\s?([0-9,.]+)/i);

            const trxId = trxMatch ? trxMatch[0] : null;
            let amount = amountMatch ? amountMatch[1].replace(/,/g, '') : "0";

            if (!trxId) {
                console.log("TrxID খুঁজে পাওয়া যায়নি।");
                return res.status(200).send("No TrxID found in message");
            }

            // ৩. Cloud Firestore-এ ডাটা সেভ
            await db.collection('autopayments').doc(trxId).set({
                amount: parseFloat(amount),
                sender: sender,
                sms_full: sms,
                status: "Success",
                timestamp: admin.firestore.FieldValue.serverTimestamp() // Firestore সার্ভার টাইম
            });

            console.log(`Firestore-এ সেভ হয়েছে: TrxID ${trxId}, Amount: ${amount}`);
            res.status(200).send("Success");
        } catch (error) {
            console.error("Error saving to Firestore:", error);
            res.status(500).send("Error saving data");
        }
    } else {
        console.log("এটি কোনো পেমেন্ট এসএমএস নয়।");
        res.status(200).send("Not a payment SMS");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
