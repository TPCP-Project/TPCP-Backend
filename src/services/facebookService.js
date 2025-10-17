const axios = require("axios");

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

function buildParams(pageAccessToken) {
  return { access_token: pageAccessToken };
}

async function callSendAPI(pageAccessToken, payload) {
  const url = `${GRAPH_API_BASE}/me/messages`;
  await axios.post(url, payload, { params: buildParams(pageAccessToken) });
}

module.exports = {
  async markSeen(pageAccessToken, recipientId) {
    const payload = {
      recipient: { id: recipientId },
      sender_action: "mark_seen",
    };
    await callSendAPI(pageAccessToken, payload);
  },

  async sendTypingIndicator(pageAccessToken, recipientId, isTyping) {
    const payload = {
      recipient: { id: recipientId },
      sender_action: isTyping ? "typing_on" : "typing_off",
    };
    await callSendAPI(pageAccessToken, payload);
  },

  async sendTextMessage(pageAccessToken, recipientId, text) {
    if (!text) return;
    const payload = {
      recipient: { id: recipientId },
      message: { text },
    };
    await callSendAPI(pageAccessToken, payload);
  },
};
