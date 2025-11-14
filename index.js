const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ================================
// 1. DANH SÁCH SUPER ADMIN
// ================================
const SUPER_ADMINS = [
  999999999     // ← THAY BẰNG TELEGRAM ID CỦA BẠN
];

// ================================
// 2. TEAM LEAD MAPPING
// ================================
// format: userId: teamNumber
const TEAM_LEADS = {
  111111111: 1,  // Team 1 leader
  222222222: 2,  // Team 2 leader
  333333333: 3   // Team 3 leader
};

// ================================
// 3. MAP LỆNH → TEAM SỞ HỮU
// ================================
const TEAM_COMMAND_MAP = {
  // TEAM 1
  "3089136": 1,
  "3110482": 1,
  "3041313": 1,
  "3089135": 1,
  "3125832": 1,
  "3097094": 1,
  "3063800": 1,
  "3113236": 1,
  "3125839": 1,

  // TEAM 2
  "3053079": 2,
  "3061430": 2,
  "3115063": 2,
  "3070887": 2,
  "3108527": 2,
  "3134239": 2,
  "3111106": 2,
  "3097092": 2,

  // TEAM 3
  "3100229": 3,
  "3066803": 3,
  "3114284": 3,
  "3100526": 3,
  "3065006": 3,
  "3101076": 3,
  "3114283": 3
};

// ================================
// 4. CHECK PERMISSION
// ================================
function canRunCommand(userId, command) {

  // Super admin → luôn pass
  if (SUPER_ADMINS.includes(userId)) return true;

  // Lệnh không thuộc team → ai cũng chạy được
  if (!TEAM_COMMAND_MAP[command]) return true;

  const userTeam = TEAM_LEADS[userId];
  const commandTeam = TEAM_COMMAND_MAP[command];

  // Không phải team lead → không có quyền
  if (!userTeam) return false;

  return userTeam === commandTeam;
}

// ================================
// 5. AUTO REGISTER COMMANDS
// ================================
const COMMANDS = [
  { command: "help", description: "Hiện menu trợ giúp" },

  { command: "datanew", description: "Báo cáo data sáng" },
  { command: "dataold", description: "Báo cáo data chiều" },

  { command: "updatenew", description: "Update data New" },
  { command: "updateold", description: "Update data Old" },

  // team 1
  { command: "3089136", description: "Phan Thanh Cường – Team 1" },
  { command: "3110482", description: "Trần Thị Thu Mai – Team 1" },
  { command: "3041313", description: "Đỗ Ngọc Trâm – Team 1" },
  { command: "3089135", description: "Bùi Vĩnh Nguyên – Team 1" },
  { command: "3125832", description: "Nguyễn Thị Anh – Team 1" },
  { command: "3097094", description: "Lê Thị Vỹ Trinh – Team 1" },
  { command: "3063800", description: "Nguyễn Thanh Tú – Team 1" },
  { command: "3113236", description: "Phan Thị Đào – Team 1" },
  { command: "3125839", description: "Nguyễn Hùng Thuận – Team 1" },

  // team 2
  { command: "3053079", description: "Ngô Thuỳ Dương – Team 2" },
  { command: "3061430", description: "Lê Anh Tuấn – Team 2" },
  { command: "3115063", description: "Hồ Lam Nhiên – Team 2" },
  { command: "3070887", description: "Lư Đức Hiển – Team 2" },
  { command: "3108527", description: "Hà Sâm Minh – Team 2" },
  { command: "3134239", description: "Nguyễn Hoàng Yến – Team 2" },
  { command: "3111106", description: "Huỳnh Võ Anh Thư – Team 2" },
  { command: "3097092", description: "Ngô Tuấn Kiệt – Team 2" },

  // team 3
  { command: "3100229", description: "Lê Quốc Quân – Team 3" },
  { command: "3066803", description: "Phan Nguyễn Diệu An – Team 3" },
  { command: "3114284", description: "Nguyễn Lâm Trường – Team 3" },
  { command: "3100526", description: "Đoàn Thị Trinh – Team 3" },
  { command: "3065006", description: "Trần Thị Hằng – Team 3" },
  { command: "3101076", description: "Lê Phạm Quỳnh Như – Team 3" },
  { command: "3114283", description: "Bạch Tuấn Anh – Team 3" },
];

// Đăng ký menu vào Telegram
axios.post(`${TG_API}/setMyCommands`, { commands: COMMANDS })
  .then(() => console.log("✓ Commands registered"))
  .catch(err => console.error("Command register error:", err.message));

// ================================
// 6. GỬI TIN NHẮN TELEGRAM
// ================================
function send(chatId, text) {
  return axios.post(`${TG_API}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// ================================
// 7. WEBHOOK
// ================================
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace("/", "").trim();

    // ===== HELP =====
    if (text === "help") {
      await send(chatId,
`📌 *Menu chính*

1️⃣ Báo cáo số lượng data:
/datanew – Sáng
/dataold – Chiều

2️⃣ Cập nhật data:
/updatenew – Data New
/updateold – Data Old

3️⃣ Cập nhật từng nhân viên:
→ Bấm / và chọn`);
      return res.sendStatus(200);
    }

    // ================================
    // MAP LỆNH → GAS URL
    // ================================
    const GAS = {
      datanew: process.env.GAS_DATANEW_URL,
      dataold: process.env.GAS_DATAOLD_URL,
      updatenew: process.env.GAS_UPDATENEW_URL,
      updateold: process.env.GAS_UPDATEOLD_URL,

      // nhân viên
      "3089136": process.env.GAS_3089136_URL,
      "3110482": process.env.GAS_3110482_URL,
      // ... (tất cả nhân viên còn lại)
    };

    if (!GAS[text]) {
      await send(chatId, "⛔ Không hiểu lệnh. Gõ /help.");
      return res.sendStatus(200);
    }

    // ===== CHECK PERMISSION =====
    if (!canRunCommand(userId, text)) {
      await send(chatId, "⛔ Bạn không có quyền chạy lệnh này.");
      return res.sendStatus(200);
    }

    // ===== RUN TASK =====
    await send(chatId, "⏳ Đang xử lý…");
    await axios.get(GAS[text]);
    await send(chatId, "✅ Hoàn tất!");

    return res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(200);
  }
});

// ================================
app.get("/", (req, res) => res.send("Bot Controller is running ✓"));
// ================================

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("BOT is running on port", PORT));
