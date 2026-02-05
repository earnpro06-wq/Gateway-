const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');

// ১. ফায়ারবেস কানেকশন (সরাসরি চাবির তথ্য কোডে দেওয়া হলো যাতে ভুল না হয়)
const serviceAccount = {
  "type": "service_account",
  "project_id": "bet-baji-vip",
  "private_key_id": "896021e7d4508222bcf2613d0de200ea80796fea",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDZIkdyNJm7HA2l\n8uIbyKU3CbDPW617ToQCOcRkJHFHIfeecQm9KEwigmSXHIUGRTgGFXberhEavuL0\no1E2zdOMKjs+gkIWloVB8NK1jYHIB3bA4MgrzPmvhLJSeqXmrS9lJREMmr2gT+yt\nyA9Q+ZNZbd06ZQPR/TBU9cYnWMqlLGwBWmr9msORdNN/ZiAHQO5rVqDVJbaWQvU3\nBbsJxcNS7MrAhDy/vBvAzsQdv+QtKZlC0Vu+WQmCmXZs3zZS5y8I8i+KGj8dEdLP\nm7lWC3NjtnCJt+Kq7/qiY3RGAI+opi4g07dydjVIcestvw90o4FNHzTGR6t1SsC8\nShy+P771AgMBAAECggEAES5zDINDW44eObCXmg7inTwhPLSVQdRrggjpKerE+JXO\n/r9qFQjgcWXzqLjDK++ukwiqxcxsomWoFtHqMMB7tLPOHqWhriDjUt2dXBa3m3OV\nFDEVQHtb5zrEU4jMojgNBTS4KHusH/MtwsM5twobUfBtbjFPv+jdegjn+6ASikbt\nafyCnGw6/NRhvKZx2a7yTkqSbWnVP2/VLYvp3yqmfDXPt06Rfz6Oa6uWBOORfE2J\nTiD1D0ZcDd2bc5RaUdhEKa8MAbc3nC9xgjF2v4VjDW/1U0D2YaQwyQdQ7BPB8vkU\nE6MPXCu0iB4VoQHECBw4jY5t6c/J91iBApdC0stuIQKBgQD0hGOzuQxWjg/u2Zw0\nAUQmRFTYgFzK2w2m88qZKOdW2HypIXQ3GsrQb79Cd2vsXMWYTKxvf8zvzOSuo8/Y\nGJVHFrwDhFAyA8QD85KyjEiBTSl/G4zXXN1p/vMJqrM0pjp/4eWOcojNyuMKMfoY\n+tFM+DwIpdsxfVLvgVHq8zEXEQKBgQDjVK94AnB9f4/6PkszigIlkHtbvqsvzyGg\nxCK3juFafdRfAmmfFsjQlVtpon9078cTEgXMBaQuwty+DRyJgM8toK7JXIVs9FwQ\npf+EtASGFeiE5gmXr7i/n5NNu7W2XWyTMxFTJ4xI2gN1jUuOJgTzu1AdYRUNpXjQ\n2v10xVfRpQKBgQDWz6PjlTMwqzd2J3jh+ybK04cSeJqMoCr7O/wF1/h8xE2oLDqz\n2nbI7RNCqjWG/e2doeZvQgBhv0g74K/M8bPbMy7TjB8EAWjn68k50KI17fsBrstp\nvCzMXO1Y1b0ACPUluef438gtuwsAvu0vmtHbY80h78uES8xbmunDlgjPcQKBgAty\nZDOCy+9F0RYktNyvglQp5kxEWZJat7LErYrYovhPhbYTBQaBuzLlkmjLSee1eyy2\np5wSXKYOIddgCaPS3JvLj4GMKxvFYi1kbm1cMy4dREwM2UbODlt3yY8MeKXqJmFz\nHNg3EZVJhQsSRk+uEmnDcNFJ5il9v4uku0Z5+WYRAoGAMT/Avi6f7bPqjF6JjYAl\n995ppd8Mgf/Q0bpM4tJh0/4IdkhuiQbMq2w+gclhMen2d2Js9P0Xe7QzURoaGegQ\ngmyCI6GKc9iPkzLsCSBg0pmVBN4axtvRF2Iqvge3bW8iet6ayO9FdUdj2SxvElZd\nlwtp6dcy+fDgnL853VXiiQc=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@bet-baji-vip.iam.gserviceaccount.com",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); 
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ২. পেমেন্ট রিসিভ করার এন্ডপয়েন্ট
app.post('/sms-webhook', async (req, res) => {
    
    // ডাটা রিসিভ করা (JSON বা সরাসরি টেক্সট উভয়ই হ্যান্ডেল করবে)
    let rawSms = req.body.text || req.body.message || req.body.body || "";
    
    // যদি পুরো বডিটাই অবজেক্ট হিসেবে আসে (যেমন আপনার হোয়াটসঅ্যাপ লগে আসছিল)
    if (typeof req.body === 'object' && !rawSms) {
        rawSms = JSON.stringify(req.body);
    }
    
    const sender = req.body.from || req.body.sender || "Unknown";

    console.log(`রিসিভড ডাটা: ${rawSms}`);

    // পেমেন্ট যাচাইয়ের জন্য ছোট হাতের অক্ষরে রূপান্তর
    const smsLower = rawSms.toLowerCase();

    // কি-ওয়ার্ড চেক (বিকাশ, নগদ বা অন্য পেমেন্টের ক্ষেত্রে trxid, trx, বা received থাকা জরুরি)
    if (smsLower.includes("trxid") || smsLower.includes("trx") || smsLower.includes("received")) {
        try {
            // ৩. Regex দিয়ে TrxID এবং Amount বের করা
            const trxMatch = rawSms.match(/[0-9A-Z]{8,12}/i); 
            const amountMatch = rawSms.match(/(?:Tk|Amount|টাকা|ট|amount)\s?([0-9,.]+)/i);

            const trxId = trxMatch ? trxMatch[0] : null;
            let amount = amountMatch ? amountMatch[1].replace(/,/g, '') : "0";

            if (trxId) {
                // ৪. Cloud Firestore-এ ডাটা সেভ
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
            // যদি ভুল চাবি থাকে তবে এখানে এরর দেখাবে
            console.error("❌ Firestore Error:", error.message);
            return res.status(500).send("Authentication or Database Error");
        }
    } else {
        console.log("⚠️ এটি পেমেন্ট এসএমএস নয় (কি-ওয়ার্ড মেলেনি)।");
        return res.status(200).send("Not a payment SMS");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
