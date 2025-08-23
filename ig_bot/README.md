# Instagram Messaging Bot Integration

This folder contains a simple **Node.js** service that demonstrates how to
integrate your own conversational assistant (for example, ChatGPT) with the
Instagram Messaging API.  The goal is to automate responses to Direct
Messages (DMs) sent to your business’s **Instagram professional** account.

> **Important:** The code in `index.js` does not send messages on its own.  It
> exposes a webhook endpoint that Meta (the owner of Instagram) will call
> whenever someone sends a DM to your account.  The server then uses the
> Instagram API to reply.  You must provide your own credentials and run
> this service on a public URL (for example, using [ngrok](https://ngrok.com/)).

## How it works

1. **Webhook verification (GET request)** – when you add a callback URL in
   the Meta App Dashboard, Meta sends a `GET` request containing a
   challenge parameter.  The server validates the verify token and
   responds with the provided `hub.challenge`, confirming that you own the
   endpoint.

2. **Receive messages (POST request)** – when a customer sends a DM to your
   Instagram professional account, Meta posts a JSON payload to your
   webhook.  The payload includes the sender’s Instagram‐scoped ID and the
   text of their message.  The server uses the `callModel` function to
   generate a reply and then sends a **text message** back to the user via
   the Instagram API.  According to Meta’s documentation, sending a text
   reply requires a `POST` request to the `/<IG_ID>/messages` endpoint with
   the `recipient.id` and `message.text` fields set【177086243600660†L260-L281】.

3. **Generate responses** – in this example, `callModel` returns a
   hardcoded greeting that invites the user to book a call.  In a real
   implementation you would replace this function with a call to
   your conversational AI and/or incorporate conversation context stored
   in the `memory` object.

## Prerequisites

To use this project you need:

* An **Instagram professional account** (Business or Creator).  Make sure
  that the account has “Allow access to messages” enabled under
  *Settings → Privacy → Messages → Connected tools*.

* A **Meta App** configured with the **Instagram Graph API** and
  **Webhooks** products.  The Webhooks product must be subscribed to the
  `messages` field for Instagram.  During configuration you will set a
  callback URL and a verify token.  The callback URL should be your
  server’s `/webhooks/instagram` endpoint, and the verify token must match
  the `VERIFY_TOKEN` environment variable used by this server.

* A **long‑lived access token** with the `instagram_manage_messages` scope.
  This token authorizes your server to send replies to messages.  Meta’s
  documentation explains how to obtain the token and the Instagram ID of
  your professional account (the `IG_ID`).

## Setup

1. **Clone or copy** this directory onto the machine where you want to run
   the service.

2. **Install dependencies** – this project uses only Node’s built‑in
   modules, so there are no external dependencies to install.  You only
   need to have Node.js installed.

3. **Set environment variables** – before running the server, export the
   following variables:

   ```sh
   export VERIFY_TOKEN="your_verify_token"
   export IG_ID="your_instagram_business_account_id"
   export ACCESS_TOKEN="your_long_lived_user_access_token"
   export PORT=3000 # optional
   ```

   The `VERIFY_TOKEN` is an arbitrary string that you will enter in the
   Meta App Dashboard when configuring the Webhooks product.  Meta sends
   this token to your server during verification; the server must check
   that it matches before responding with `hub.challenge`.

4. **Start the server**:

   ```sh
   node index.js
   ```

   The service will listen on port `PORT` (default `3000`) and log when it
   starts.  Use a tunnelling service such as **ngrok** to expose the
   webhook endpoint publicly (e.g. `https://<your‑ngrok‑subdomain>.ngrok.io/webhooks/instagram`).
   Configure this URL in your Meta App Dashboard.

5. **Subscribe your Instagram account** – follow Meta’s steps for
   subscribing a professional account to your app.  This typically
   involves making a `POST` request to the Graph API with the `subscribed_fields` set
   to `messages`.

6. **Test** – send a DM from another Instagram account to your
   professional account.  You should see your server log the event and the
   user should receive the automated reply.

## Extending this project

This example stores conversation history in a simple in‑memory object and
generates a static reply.  For a real integration you should:

* Replace `callModel` with a function that calls your conversational AI
  (for example, the OpenAI API).  Pass the conversation history (`memory`) and
  user messages as context so that replies are coherent.
* Persist conversation state in a database so that context survives
  restarts.
* Handle other webhook events (such as reactions or message deletions) as
  needed.  The Instagram Messaging API can deliver events for links,
  attachments and quick replies, each requiring slightly different
  handling.

Refer to the official Instagram API documentation for details on sending
text messages and other media types【177086243600660†L260-L283】.
