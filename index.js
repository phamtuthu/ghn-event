const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// =====================================
// 0. GLOBAL LOCK CHỐNG CHẠY TRÙNG
// =====================================
const runningUsers = new Set();   // userId -> đang chạy

// =====================================
// 1. SUPER ADMIN
// =====================================
function parseSuperAdmins() {
  if (!process.env.SUPER_ADMINS) return [];
  return process.env.SUPER_ADMINS.split(",").map(x => Number(x.trim()));
}
const SUPER_ADMINS = parseSuperAdmins();

// =====================================
// 2. TEAM LEADS (userId : team)
// =====================================
function parseTeamLeads() {
  const out = {};
  if (!process.env.TEAM_LEADS) return out;

  process.env.TEAM_LEADS.split(",").forEach(pair => {
    const [uid, team] = pair.split(":");
    out[uid.trim()] = Number(team.trim());
  });

  return out;
}
const TEAM_LEADS = parseTeamLeads();

// =====================================
// 3. MEMBERS (tất cả mã nhân viên)
// format: CODE:FULLNAME:TEAM:GAS_ENV_KEY
// =====================================
function parseMembers() {
  const out = {};

  if (!process.env.MEMBERS) return out;

  process.env.MEMBERS.split(",").forEach(block => {
    if (!block) return;

    const [code, fullname, team, gasKey] = block.split(":");

    out[code.trim()] = {
      name: fullname.trim(),
      team: Number(team.trim()),
      gasEnv: gasKey.trim()
    };
  });

  return out;
}
const MEMBERS = parseMembers();

// =====================================
// 4. SYSTEM COMMANDS
// =====================================
const SYSTEM_COMMANDS = {
  datanew: process.env.GAS_DATANEW_URL,
  dataold: process.env.GAS_DATAOLD_URL,
  updatenew: process.env.GAS_UPDATENEW_URL,
  updateold: process.env.GAS_UPDATEOLD_URL
};

// =====================================
// 5. PERMISSION CHECK
// =====================================
function canRun(userId, command) {

  // SUPER ADMIN = full quyền
  if (SUPER_ADMINS.includes(userId)) return true;

  // SYSTEM COMMAND = ai cũng chạy
  if (SYSTEM_COMMANDS[command]) return true;

  // nếu không phải mã nhân viên
  if (!MEMBERS[command]) return true;

  // cần phải là leader
  const userTeam = TEAM_LEADS[userId];
  if (!userTeam) return false;

  const memberTeam = MEMBERS[command].team;
  return userTeam === memberTeam;
}

// =====================================
// 6. PRINT TEAM
// =====================================
function printTeam(teamNumber) {
  let out = `*Team ${teamNumber}*\n`;

  Object.entries(MEMBERS)
    .filter(([cmd, info]) => info.team === teamNumber)
    .forEach(([cmd, info]) => {
      out += `/${cmd} — ${info.name}\n`;
    });

  return out + "\n";
}

// =====================================
// 7. BUILD HELP
// =====================================
function buildHelp(userId) {
  const isSuper = SUPER_ADMINS.includes(userId);
  const teamLead = TEAM_LEADS[userId] || null;

  let text = `📌 *Menu lệnh bot GHN Data*\n_(Hiển thị theo quyền)_\n\n`;

  text += `====================\n`;
  text += `1️⃣ *Báo cáo số lượng data*\n`;
  text += `====================\n`;
  text += `/datanew — Data buổi sáng\n`;
  text += `/dataold — Data buổi chiều\n\n`;

  text += `====================\n`;
  text += `2️⃣ *Cập nhật data*\n`;
  text += `====================\n`;
  text += `/updatenew — Update Data New\n`;
  text += `/updateold — Update Data Old\n\n`;

  // SUPER ADMIN → full menu
  if (isSuper) {
    text += `====================\n`;
    text += `3️⃣ *Cập nhật theo nhân viên*\n`;
    text += `====================\n\n`;

    const allTeams = [...new Set(Object.values(MEMBERS).map(x => x.team))];
    allTeams.forEach(team => text += printTeam(team));

    return text;
  }

  // TEAM LEAD → chỉ thấy team mình
  if (teamLead) {
    text += `====================\n`;
    text += `3️⃣ *Cập nhật nhân viên Team ${teamLead}*\n`;
    text += `====================\n\n`;
    text += printTeam(teamLead);
    return text;
  }

  // Nhân viên thường = không thấy danh sách
  text += `====================\n`;
  text += `3️⃣ *Cập nhật theo nhân viên*\n`;
  text += `====================\n`;
  text += `_Bạn không có quyền xem danh sách._\n`;

  return text;
}

// =====================================
// 8. SEND TELEGRAM
// =====================================
function send(chatId, text) {
  return axios.post(`${TG_API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  });
}

// =====================================
// 9. WEBHOOK (CHỐNG CHẠY TRÙNG)
// =====================================
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace("/", "").trim();

    // CHỐNG người dùng chạy lệnh liên tục
    if (runningUsers.has(userId)) {
      await send(chatId, "⛔ Lệnh trước đang chạy, vui lòng đợi hoàn tất!");
      return res.sendStatus(200);
    }

    // HELP
    if (text === "help" || text === "start") {
      await send(chatId, buildHelp(userId));
      return res.sendStatus(200);
    }

    // Xác định command thuộc hệ thống hay nhân viên
    const isSystem = SYSTEM_COMMANDS[text] ? true : false;
    const isMember = MEMBERS[text] ? true : false;

    if (!isSystem && !isMember) {
      await send(chatId, "⛔ Không hiểu lệnh. Gõ /help.");
      return res.sendStatus(200);
    }

    // CHECK QUYỀN
    if (!canRun(userId, text)) {
      await send(chatId, "⛔ Bạn không có quyền chạy lệnh này.");
      return res.sendStatus(200);
    }

    runningUsers.add(userId); // BẮT ĐẦU LOCK

    // Gửi trước để Telegram KHÔNG retry
    await send(chatId, "⏳ Đang xử lý…");

    res.sendStatus(200); // TRẢ VỀ NGAY – TRÁNH TELEGRAM RETRY

    // XỬ LÝ BACKGROUND (Non-blocking)
    setTimeout(async () => {
      try {
        if (isSystem) {
          await axios.get(SYSTEM_COMMANDS[text]);
        } else if (isMember) {
          const envKey = MEMBERS[text].gasEnv;
          await axios.get(process.env[envKey]);
        }
        await send(chatId, "✅ Hoàn tất!");
      } catch (err) {
        await send(chatId, "❌ Lỗi xử lý GAS, thử lại sau!");
        console.error("GAS ERROR:", err);
      } finally {
        runningUsers.delete(userId);  // MỞ LOCK
      }
    }, 10);

  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(200);
  }
});

// =====================================
app.get("/", (req, res) => res.send("Bot Controller is running ✓"));
// =====================================

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("BOT is running on port", PORT));
