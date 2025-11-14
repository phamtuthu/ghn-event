const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

/* ENV
--------------------------------------------- */
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/* ROOT CHECK (Railway health-check)
--------------------------------------------- */
app.get("/", (req, res) => {
  res.send("Bot is running ✓");
});

/* TELEGRAM WEBHOOK
--------------------------------------------- */
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text === "/start" || text === "/help") {
      await sendMessage(chatId,
        "🤖 Bot Menu\n\n" +
        "👉 /import — Import dữ liệu từ Google Sheets\n" +
        "👉 /notinew — Gửi thông báo Data New\n"
      );
    }

    if (text === "/import") {
      await sendMessage(chatId, "⏳ Đang chạy import...");
      await axios.get(process.env.GAS_IMPORT_URL_NEW);
      await sendMessage(chatId, "✅ Import xong!");
    }

    if (text === "/notinew") {
      await sendMessage(chatId, "⏳ Đang chạy thông báo...");
      await axios.get(process.env.GAS_NOTINEW_URL);
      await sendMessage(chatId, "✅ Đã gửi thông báo!");
    }

    return res.sendStatus(200);

  } catch (e) {
    console.error("Webhook error:", e);
    return res.sendStatus(200);
  }
});

/* SEND MESSAGE
--------------------------------------------- */
async function sendMessage(chatId, text) {
  return axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

/* RAILWAY PORT
--------------------------------------------- */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Bot Controller running on port", PORT);
});
