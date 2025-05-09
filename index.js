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
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.get('/', (req, res) => {
  res.send('Server is alive!');
});

// Receive leads
app.post('/webhook', (req, res) => {
  const entries = req.body.entry;
  entries.forEach(entry => {
    entry.changes.forEach(change => {
      const leadData = change.value;
      db.collection('Leads').add(leadData)
        .then(() => console.log('Lead saved to Firestore'))
        .catch(err => console.error('Error saving lead:', err));
    });
  });
  res.sendStatus(200);
});

app.get('/webhook', (req, res) => {
  console.log('GET /webhook hit');
  ...
});

app.listen(port, () => console.log(`Server running on port ${port}`));
