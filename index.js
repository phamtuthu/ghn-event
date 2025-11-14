// index.js
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ====== ENV ======
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;           // token bot Telegram
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const IMPORT_URL = process.env.GAS_IMPORT_URL_NEW;      // URL Apps Script import
const NOTI_URL = process.env.GAS_NOTINEW_URL;           // URL Apps Script noti

// ====== HEALTH CHECK (Railway dùng cái này) ======
app.get("/", (req, res) => {
  res.status(200).send("Bot is running ✓");
});

// ====== TELEGRAM WEBHOOK ======
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) {
      return res.sendStatus(200);
    }

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Menu
    if (text === "/start" || text === "/help") {
      await send(chatId,
`🤖 Bot Menu

👉 /import — Import dữ liệu từ Google Sheets
👉 /notinew — Gửi Notification Data New`);
      return res.sendStatus(200);
    }

    // /import
    if (text === "/import") {
      await send(chatId, "⏳ Import đang chạy...");
      await axios.get(IMPORT_URL);
      await send(chatId, "✅ Import xong!");
      return res.sendStatus(200);
    }

    // /notinew
    if (text === "/notinew") {
      await send(chatId, "⏳ Đang gửi Notification...");
      await axios.get(NOTI_URL);
      await send(chatId, "✅ Notification xong!");
      return res.sendStatus(200);
    }

    // Lệnh khác
    await send(chatId, "❌ Lệnh không hợp lệ. Gõ /help để xem danh sách.");
    return res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(200);
  }
});

// ====== HÀM GỬI TELEGRAM ======
async function send(chatId, text) {
  if (!BOT_TOKEN) {
    console.error("Missing TELEGRAM_TOKEN env");
    return;
  }
  return axios.post(`${TG_API}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// ====== START SERVER ======
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Bot Controller running on port", PORT);
});
