const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();
const port = 3000;

app.use(bodyParser.json());

// Firebase Admin setup
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Verify Facebook webhook
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = "aH@12345678";
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// Health check route
app.get('/', (req, res) => {
  res.send('Server is alive!');
});

// Receive leads
app.post('/webhook', (req, res) => {
  console.log('🔥 POST /webhook hit');
  console.log('📦 Full body:', JSON.stringify(req.body, null, 2));

  if (req.body.entry) {
    // طريقة Facebook المباشرة
    const entries = req.body.entry;
    entries.forEach(entry => {
      entry.changes.forEach(change => {
        const leadData = change.value;
        if (!leadData || !leadData.leadgen_id) {
          console.error('❌ Missing leadgen_id in leadData');
          return;
        }

        console.log(`📝 Writing document with ID: ${leadData.leadgen_id}`);

        db.collection('Leads-N').doc(leadData.leadgen_id).set(leadData)
          .then(() => console.log(`✅ Lead ${leadData.leadgen_id} saved to Firestore`))
          .catch(err => console.error('❌ Error saving lead:', err));
      });
    });

  } else {
    // طريقة Zapier (مباشرة)
    const fullName = req.body.name;
    const phone = req.body.mobile;
    const campaignId = req.body.campaignId;
    const adsetId = req.body.adsetId;
    const campaignName = req.body.campaignName;
    const adName = req.body.adName;
    const email = req.body.email;

    if (!fullName || !phone) {
      console.error('❌ Missing full_name or phone_number in Zapier payload');
      res.status(400).send('Missing required fields');
      return;
    }

    const zapierDoc = {
      name: fullName,
      mobile: phone,
      campaignId: campaignId,
      adsetId:adsetId,
      campaignName:campaignName,
      adName:adName,
      email:email
      timeStamp: new Date().toISOString()
    };

    const docId = req.body.mobile || `zapier_${Date.now()}`;

    console.log(`📝 Writing Zapier document with ID: ${docId}`);

    db.collection('Leads-N').doc(docId).set(zapierDoc)
      .then(() => console.log(`✅ Zapier Lead ${docId} saved to Firestore`))
      .catch(err => console.error('❌ Error saving Zapier lead:', err));
  }

  res.sendStatus(200);
});


app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
