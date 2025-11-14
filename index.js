const express = require("express");
const axios = require("axios");
const { COMMANDS } = require("./commands.js");
const { canRunCommand } = require("./permissions.js");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function registerCommands() {
  await axios.post(`${TG_API}/setMyCommands`, { commands: COMMANDS });
  console.log("✓ Telegram commands registered");
}
registerCommands();

function send(chatId, text) {
  return axios.post(`${TG_API}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

async function runTask(chatId, url, notice = "⏳ Đang xử lý…") {
  await send(chatId, notice);
  await axios.get(url);
  await send(chatId, "✅ Hoàn tất!");
}

app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text?.trim().replace("/", "");
    const userId = msg.from.id;

    if (text === "help") {
      return send(chatId,
`📌 *Menu chính*

1️⃣ Báo cáo data:
/datanew – Sáng
/dataold – Chiều

2️⃣ Cập nhật data:
/updatenew – Cập nhật New
/updateold – Cập nhật Old

3️⃣ Theo nhân viên:
→ Gõ / và chọn người`);
    }

    const GAS = {
      datanew: process.env.GAS_DATANEW_URL,
      dataold: process.env.GAS_DATAOLD_URL,
      updatenew: process.env.GAS_UPDATENEW_URL,
      updateold: process.env.GAS_UPDATEOLD_URL,

      "3089136": process.env.GAS_3089136_URL,
      "3110482": process.env.GAS_3110482_URL,
      "3041313": process.env.GAS_3041313_URL,
      "3089135": process.env.GAS_3089135_URL,
      "3125832": process.env.GAS_3125832_URL,
      "3097094": process.env.GAS_3097094_URL,
      "3063800": process.env.GAS_3063800_URL,
      "3113236": process.env.GAS_3113236_URL,
      "3125839": process.env.GAS_3125839_URL,

      "3053079": process.env.GAS_3053079_URL,
      "3061430": process.env.GAS_3061430_URL,
      "3115063": process.env.GAS_3115063_URL,
      "3070887": process.env.GAS_3070887_URL,
      "3108527": process.env.GAS_3108527_URL,
      "3134239": process.env.GAS_3134239_URL,
      "3111106": process.env.GAS_3111106_URL,
      "3097092": process.env.GAS_3097092_URL,

      "3100229": process.env.GAS_3100229_URL,
      "3066803": process.env.GAS_3066803_URL,
      "3114284": process.env.GAS_3114284_URL,
      "3100526": process.env.GAS_3100526_URL,
      "3065006": process.env.GAS_3065006_URL,
      "3101076": process.env.GAS_3101076_URL,
      "3114283": process.env.GAS_3114283_URL
    };

    if (!GAS[text]) {
      return send(chatId, "⛔ Không hiểu lệnh, gõ /help để xem menu.");
    }

    if (!canRunCommand(userId, text)) {
      return send(chatId, "⛔ Bạn không có quyền chạy lệnh này.");
    }

    await runTask(chatId, GAS[text]);
    return res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(200);
  }
});

app.get("/", (req, res) => res.send("Bot Controller Running ✓"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("BOT running on port", PORT));
