const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');

// ১. ফায়ারবেস কানেকশন (আপনার নতুন জেনারেট করা ফাইল অনুযায়ী আপডেট করা হয়েছে)
const serviceAccount = require('bet-baji-vip-firebase-adminsdk-fbsvc-28b3cb38ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Firestore ডিক্লেয়ার করা
const db = admin.firestore(); 
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ২. পেমেন্ট রিসিভ করার এন্ডপয়েন্ট
app.post('/sms-webhook', async (req, res) => {
    
    // ডাটা রিসিভ করার লজিক (JSON অবজেক্ট হ্যান্ডেল করার জন্য)
    let rawSms = req.body.text || req.body.message || req.body.body || "";
    
    // যদি পুরো বডিটাই স্ট্রিং হয় বা অবজেক্ট হিসেবে আসে
    if (typeof req.body === 'object' && !rawSms) {
        rawSms = JSON.stringify(req.body);
    }
    
    const sender = req.body.from || req.body.sender || "Unknown";

    console.log(`রিসিভড ডাটা: ${rawSms}`);

    // পেমেন্ট যাচাইয়ের জন্য ছোট হাতের অক্ষরে রূপান্তর
    const smsLower = rawSms.toLowerCase();

    // কি-ওয়ার্ড চেক (বিকাশ বা অন্য পেমেন্টের ক্ষেত্রে trxid, trx, বা received থাকা জরুরি)
    if (smsLower.includes("trxid") || smsLower.includes("trx") || smsLower.includes("transaction")) {
        try {
            // ৩. Regex দিয়ে TrxID এবং Amount বের করা
            // i ফ্ল্যাগ ব্যবহার করা হয়েছে যাতে ছোট/বড় সব অক্ষর ধরে
            const trxMatch = rawSms.match(/[0-9A-Z]{8,12}/i); 
            const amountMatch = rawSms.match(/(?:Tk|Amount|টাকা|ট|amount)\s?([0-9,.]+)/i);

            const trxId = trxMatch ? trxMatch[0] : null;
            let amount = amountMatch ? amountMatch[1].replace(/,/g, '') : "0";

            if (trxId) {
                // ৪. Cloud Firestore-এ ডাটা সেভ
                // doc(trxId) ব্যবহার করা হয়েছে যাতে ডুপ্লিকেট পেমেন্ট না হয়
                await db.collection('autopayments').doc(trxId).set({
                    amount: parseFloat(amount),
                    sender: sender,
                    sms_full: rawSms,
                    status: "Success",
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`✅ সফল! Firestore-এ সেভ হয়েছে: TrxID ${trxId}, Amount: ${amount}`);
                return res.status(200).send("Success");
            } else {
                console.log("❌ কি-ওয়ার্ড মিললেও TrxID খুঁজে পাওয়া যায়নি।");
                return res.status(200).send("TrxID not found");
            }
        } catch (error) {
            console.error("❌ Firestore Error:", error);
            return res.status(500).send("Error saving data");
        }
    } else {
        console.log("⚠️ এটি পেমেন্ট এসএমএস নয় (কি-ওয়ার্ড মেলেনি)।");
        return res.status(200).send("Not a payment SMS");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
