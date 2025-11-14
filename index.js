// ================================================
// GHN TELEGRAM BOT CONTROLLER (FINAL STABLE VERSION)
// ================================================

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// --------------------------------
// TELEGRAM CONFIG
// --------------------------------
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --------------------------------
// 1. SUPER ADMIN (toàn quyền)
// --------------------------------
const SUPER_ADMINS = [
  673765921,
  890886032// <-- thay bằng Telegram ID của bạn
];

// --------------------------------
// 2. TEAM LEAD MAPPING
// --------------------------------
const TEAM_LEADS = {
  771974442: 1, // Team 1 leader
  6087756568: 2, // Team 2 leader
  677156507: 3  // Team 3 leader
};

// --------------------------------
// 3. LỆNH → TEAM QUẢN LÝ
// --------------------------------
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

// --------------------------------
// 4. PERMISSION CHECK
// --------------------------------
function canRunCommand(userId, command) {
  if (SUPER_ADMINS.includes(userId)) return true;
  if (!TEAM_COMMAND_MAP[command]) return true;  
  const userTeam = TEAM_LEADS[userId];
  const commandTeam = TEAM_COMMAND_MAP[command];
  if (!userTeam) return false;
  return userTeam === commandTeam;
}

// --------------------------------
// 5. RUNNING LOCK – chống chạy trùng
// --------------------------------
const runningTasks = {};

function isRunning(cmd) {
  return runningTasks[cmd] === true;
}

function setRunning(cmd) {
  runningTasks[cmd] = true;
}

function clearRunning(cmd) {
  delete runningTasks[cmd];
}

// --------------------------------
// 6. GỬI TIN NHẮN TELEGRAM
// --------------------------------
function send(chatId, text) {
  return axios.post(`${TG_API}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// --------------------------------
// 7. HELP MENU (HIỂN THỊ ĐẸP)
// --------------------------------
const HELP_MESSAGE =
`📌 *Menu lệnh bot GHN Data*  
_(Chỉ trưởng team mới chạy được lệnh cập nhật theo nhân viên)_

====================
1️⃣ *Báo cáo số lượng data*
====================
/datanew - Data buổi sáng  
/dataold - Data buổi chiều  

====================
2️⃣ *Cập nhật data*
====================
/updatenew - Update Data New  
/updateold - Update Data Old  

====================
3️⃣ *Cập nhật theo nhân viên*
====================

*Team 1*
/3089136 - Phan Thanh Cường  
/3110482 - Trần Thị Thu Mai  
/3041313 - Đỗ Ngọc Trâm  
/3089135 - Bùi Vĩnh Nguyên  
/3125832 - Nguyễn Thị Anh  
/3097094 - Lê Thị Vỹ Trinh  
/3063800 - Nguyễn Thanh Tú  
/3113236 - Phan Thị Đào  
/3125839 - Nguyễn Hùng Thuận  

*Team 2*
/3053079 - Ngô Thuỳ Dương  
/3061430 - Lê Anh Tuấn  
/3115063 - Hồ Lam Nhiên  
/3070887 - Lư Đức Hiển  
/3108527 - Hà Sâm Minh  
/3134239 - Nguyễn Hoàng Yến  
/3111106 - Huỳnh Võ Anh Thư  
/3097092 - Ngô Tuấn Kiệt  

*Team 3*
/3100229 - Lê Quốc Quân  
/3066803 - Phan Nguyễn Diệu An  
/3114284 - Nguyễn Lâm Trường  
/3100526 - Đoàn Thị Trinh  
/3065006 - Trần Thị Hằng  
/3101076 - Lê Phạm Quỳnh Như  
/3114283 - Bạch Tuấn Anh  
`;

// --------------------------------
// 8. MAP LỆNH → GAS URL
// (tất cả đặt trong ENV trên Railway)
// --------------------------------
const GAS = {
  datanew: process.env.GAS_DATANEW_URL,
  dataold: process.env.GAS_DATAOLD_URL,
  updatenew: process.env.GAS_UPDATENEW_URL,
  updateold: process.env.GAS_UPDATEOLD_URL,

  // Team 1
  "3089136": process.env.GAS_3089136_URL,
  "3110482": process.env.GAS_3110482_URL,
  "3041313": process.env.GAS_3041313_URL,
  "3089135": process.env.GAS_3089135_URL,
  "3125832": process.env.GAS_3125832_URL,
  "3097094": process.env.GAS_3097094_URL,
  "3063800": process.env.GAS_3063800_URL,
  "3113236": process.env.GAS_3113236_URL,
  "3125839": process.env.GAS_3125839_URL,

  // Team 2
  "3053079": process.env.GAS_3053079_URL,
  "3061430": process.env.GAS_3061430_URL,
  "3115063": process.env.GAS_3115063_URL,
  "3070887": process.env.GAS_3070887_URL,
  "3108527": process.env.GAS_3108527_URL,
  "3134239": process.env.GAS_3134239_URL,
  "3111106": process.env.GAS_3111106_URL,
  "3097092": process.env.GAS_3097092_URL,

  // Team 3
  "3100229": process.env.GAS_3100229_URL,
  "3066803": process.env.GAS_3066803_URL,
  "3114284": process.env.GAS_3114284_URL,
  "3100526": process.env.GAS_3100526_URL,
  "3065006": process.env.GAS_3065006_URL,
  "3101076": process.env.GAS_3101076_URL,
  "3114283": process.env.GAS_3114283_URL
};

// --------------------------------
// 9. TELEGRAM WEBHOOK
// --------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace("/", "").trim();

    // Trả về ngay để Telegram không retry
    res.sendStatus(200);

    // /help
    if (text === "help") {
      return send(chatId, HELP_MESSAGE);
    }

    // Command không tồn tại
    if (!GAS[text]) {
      return send(chatId, "⛔ Lệnh không hợp lệ. Gõ /help để xem menu.");
    }

    // Check permission
    if (!canRunCommand(userId, text)) {
      return send(chatId, "⛔ Bạn không có quyền chạy lệnh này.");
    }

    // Check lock
    if (isRunning(text)) {
      return send(chatId, "⚠ Lệnh này đang chạy. Vui lòng đợi hoàn tất.");
    }

    // Set lock
    setRunning(text);

    await send(chatId, "⏳ Đang xử lý...");

    // Gọi GAS
    await axios.get(GAS[text]);

    clearRunning(text);

    await send(chatId, "✅ Hoàn tất!");

  } catch (err) {
    console.error("Webhook error:", err);
  }
});

// --------------------------------
app.get("/", (req, res) => {
  res.send("GHN Bot Controller ✓ Running");
});
// --------------------------------

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("BOT is running on port", PORT));
