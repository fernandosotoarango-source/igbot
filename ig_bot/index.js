const http = require('http');
const https = require('https');
const url = require('url');

/*
 * Instagram Webhooks and Messaging handler
 *
 * This simple Node.js server demonstrates how to handle webhook events from
 * Meta's Instagram Messaging API and send automated replies. It performs
 * three primary tasks:
 *  - Verifies webhook subscriptions by responding with the provided
 *    challenge when the verify token matches (GET requests).
 *  - Receives webhook events (POST requests) and extracts the sender ID
 *    and message text.
 *  - Generates a reply (using a placeholder function) and sends it back
 *    to the user via the Instagram API.
 *
 * Note: In a production system you would replace the callModel function
 * with a call to your conversational AI (e.g. ChatGPT) and persist
 * conversation history to a database. This example keeps state in memory
 * for demonstration purposes only.
 */

// Read configuration from environment variables. Replace these values
// with your actual credentials or set environment variables accordingly.
//
// In this deployment we hard‑code the values for the verification token,
// Instagram Business Account ID and long‑lived access token because the user
// provided them during the setup. These constants must match the values
// configured in the Meta developer console and Cloud Run environment:
//
//  - VERIFY_TOKEN: This must be the same string you entered in the
//    “Identificador de verificación” field when configuring the webhook in
//    Meta. We are using the application ID here because the user selected
//    it as their verification token during deployment.
//  - IG_ID: The numeric ID of your Instagram professional account. You can
//    find this on the API setup page under “Cuenta de Instagram”.
//  - ACCESS_TOKEN: The long‑lived access token generated from the “Generar
//    identificador” dialog. This token must have the `instagram_manage_messages`
//    permission and will be used to send messages back to Instagram users.
const VERIFY_TOKEN = '7674028595838117';
const IG_ID = '17841464542107646';
const ACCESS_TOKEN = 'IGAAK58ubYVo1BZAFB4UzRyMGprd19pRWF4Y0w5aThHVXJERnYweFR1aG9mTDFHRzJRWXBpVkpJM1pudVpmbUE3NDNRa2tGVkYyWTF5anlkV2N2U2NyRldkTzUzSzV2MnI5aDd6enFMREw4VWJPN2pjcDFfMFgyTGlOU0h2ZA25FawZDZD';

// In‑memory store for conversation history. You can replace this with a
// persistent data store such as a database if required.
const memory = {};

/**
 * Sends a text message to an Instagram user.
 *
 * @param {string} recipientId - The Instagram‑scoped ID of the recipient.
 * @param {string} text - The message text to send.
 * @returns {Promise<void>} Resolves when the API call completes.
 */
function sendInstagramMessage(recipientId, text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      recipient: { id: recipientId },
      message: { text: text },
    });

    const options = {
      hostname: 'graph.instagram.com',
      path: `/v23.0/${IG_ID}/messages`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Instagram API returned status ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.write(data);
    req.end();
  });
}

/**
 * Placeholder function that generates a reply for a given user message.
 * Replace this with a call to your conversational AI (e.g. ChatGPT).
 *
 * @param {string} senderId - The ID of the sender.
 * @param {string} text - The text sent by the user.
 * @returns {string} A reply to send back to the user.
 */
function callModel(senderId, text) {
  // Initialize conversation history if not present
  if (!memory[senderId]) {
    memory[senderId] = { history: [] };
  }
  // Append user message to history
  memory[senderId].history.push({ role: 'user', text: text, timestamp: Date.now() });

  // For demonstration purposes, generate a simple response. You can
  // incorporate context from memory[senderId].history if desired.
  const response =
    '¡Hola! Gracias por tu mensaje. Soy tu asistente de IAM Smart Marketing. ' +
    'Mi meta es ayudarte a conseguir más pacientes y agendar una cita contigo. ' +
    '¿Te gustaría reservar una llamada para conocer nuestros planes?';

  // Append assistant reply to history
  memory[senderId].history.push({ role: 'assistant', text: response, timestamp: Date.now() });
  return response;
}

/**
 * HTTP server to handle Instagram webhook verification and event processing.
 */
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Handle webhook verification (GET request)
  if (req.method === 'GET' && parsedUrl.pathname === '/webhooks/instagram') {
    const mode = parsedUrl.query['hub.mode'];
    const token = parsedUrl.query['hub.verify_token'];
    const challenge = parsedUrl.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge);
    } else {
      res.writeHead(403);
      res.end('Forbidden');
    }
    return;
  }

  // Handle webhook event notifications (POST request)
  if (req.method === 'POST' && parsedUrl.pathname === '/webhooks/instagram') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const jsonBody = JSON.parse(body);
        // Webhook payload may contain multiple entries
        if (Array.isArray(jsonBody.entry)) {
          for (const entry of jsonBody.entry) {
            const messagingEvents = entry.messaging || entry.changes || [];
            for (const event of messagingEvents) {
              // Extract sender ID and message text depending on event structure
              const senderId =
                (event.sender && event.sender.id) ||
                (event.from && event.from.id) ||
                (event.value && event.value.sender_id);
              const text =
                (event.message && event.message.text) ||
                (event.value && event.value.message) ||
                '';
              if (senderId && text) {
                const reply = callModel(senderId, text);
                try {
                  await sendInstagramMessage(senderId, reply);
                  console.log(`Replied to ${senderId}`);
                } catch (err) {
                  console.error(`Failed to send message to ${senderId}: ${err.message}`);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error processing webhook event:', err.message);
      }
      // Respond to Meta quickly (200 OK) to acknowledge receipt of the event
      res.writeHead(200);
      res.end('EVENT_RECEIVED');
    });
    return;
  }

  // Default response for other routes
  res.writeHead(404);
  res.end('Not Found');
});

// Start the server on the provided port or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
