import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ======= ENV VARIABLES =======
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

const COMMANDS = {
  "/importnew": process.env.GAS_IMPORT_URL_NEW,
  "/notinew": process.env.GAS_NOTINEW_URL,
};

app.post("/webhook", async (req, res) => {
  // Trả về ngay để Telegram không retry
  res.status(200).send("OK");

  try {
    const msg = req.body.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    // Thông báo đang xử lý
    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: "⏳ Đang xử lý...",
    });

    if (text === "/start" || text === "/help") {
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text:
`🤖 *Bot Google Script Controller*

Các lệnh hiện có:
👉 /import — Import dữ liệu từ Google Sheets
👉 /notinew — Gửi thông báo Data New`,
        parse_mode: "Markdown",
      });
      return;
    }

    if (!COMMANDS[text]) {
      await axios.post(TELEGRAM_API, {
        chat_id: chatId,
        text: "❌ Lệnh không hợp lệ. Gõ /help để xem danh sách.",
      });
      return;
    }

    const url = COMMANDS[text];
    await axios.get(url);

    await axios.post(TELEGRAM_API, {
      chat_id: chatId,
      text: `✅ Đã hoàn thành lệnh *${text}*`,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("Webhook error:", err.message);
  }
});

// QUAN TRỌNG: dùng PORT Railway cung cấp
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot Controller running on port ${PORT}`);
});
