const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

app.get("/", (req, res) => {
  res.send("Bot Controller is running ✓");
});

// Webhook URL: https://<railway-domain>/webhook
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (text === "/start" || text === "/help") {
      await send(chatId,
`🤖 Bot Menu

👉 /import — Import Google Sheet
👉 /notinew — Gửi Notification`);
    }

    if (text === "/import") {
      await send(chatId, "⏳ Import đang chạy...");
      await axios.get(process.env.GAS_IMPORT_URL_NEW);
      await send(chatId, "✅ Import xong!");
    }

    if (text === "/notinew") {
      await send(chatId, "⏳ Đang gửi thông báo...");
      await axios.get(process.env.GAS_NOTINEW_URL);
      await send(chatId, "✅ Notification xong!");
    }

    return res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(200);
  }
});

function send(chatId, text) {
  return axios.post(`${TG_API}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("BOT is running on port", PORT));
