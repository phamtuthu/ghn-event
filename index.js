const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ================================
// 1. SUPER ADMIN (ENV)
// ================================
function parseSuperAdmins() {
  if (!process.env.SUPER_ADMINS) return [];
  return process.env.SUPER_ADMINS.split(",").map(x => Number(x.trim()));
}
const SUPER_ADMINS = parseSuperAdmins();

// ================================
// 2. TEAM LEADS (ENV)
// ================================
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

// ================================
// 3. MEMBERS (ENV)
// ================================
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

// ================================
// 4. SYSTEM COMMANDS (ENV)
// ================================
const SYSTEM_COMMANDS = {
  datanew: process.env.GAS_DATANEW_URL,
  dataold: process.env.GAS_DATAOLD_URL,
  updatenew: process.env.GAS_UPDATENEW_URL,
  updateold: process.env.GAS_UPDATEOLD_URL,
};

// ================================
// 5. PERMISSION CHECK
// ================================
function canRun(userId, command) {

  // Super Admin → full quyền
  if (SUPER_ADMINS.includes(userId)) return true;

  // Lệnh hệ thống → ai cũng chạy
  if (SYSTEM_COMMANDS[command]) return true;

  // Không phải lệnh nhân viên → ai cũng chạy
  if (!MEMBERS[command]) return true;

  const memberTeam = MEMBERS[command].team;
  const userTeam = TEAM_LEADS[userId];

  // Không phải leader → không có quyền
  if (!userTeam) return false;

  return userTeam === memberTeam;
}

// ================================
// 6. PRINT TEAM
// ================================
function printTeam(teamNumber) {
  let out = `*Team ${teamNumber}*\n`;

  Object.entries(MEMBERS)
    .filter(([cmd, info]) => info.team === teamNumber)
    .forEach(([cmd, info]) => {
      out += `/${cmd} — ${info.name}\n`;
    });

  return out + "\n";
}

// ================================
// 7. HELP MENU THEO QUYỀN
// ================================
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

    const allTeams = [...new Set(Object.values(MEMBERS).map(m => m.team))];
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

  // Nhân viên → không có quyền xem
  text += `====================\n`;
  text += `3️⃣ *Cập nhật theo nhân viên*\n`;
  text += `====================\n`;
  text += `_Bạn không có quyền xem danh sách._\n`;

  return text;
}

// ================================
// 8. TELEGRAM SEND
// ================================
function send(chatId, text) {
  return axios.post(`${TG_API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  });
}

// ================================
// 9. WEBHOOK
// ================================
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace("/", "").trim();

    // HELP
    if (text === "help" || text === "start") {
      await send(chatId, buildHelp(userId));
      return res.sendStatus(200);
    }

    // SYSTEM COMMAND
    if (SYSTEM_COMMANDS[text]) {
      if (!canRun(userId, text)) {
        await send(chatId, "⛔ Bạn không có quyền chạy lệnh này.");
        return res.sendStatus(200);
      }

      await send(chatId, "⏳ Đang xử lý...");
      await axios.get(SYSTEM_COMMANDS[text]);
      await send(chatId, "✅ Hoàn tất!");
      return res.sendStatus(200);
    }

    // MEMBER COMMAND
    if (MEMBERS[text]) {
      if (!canRun(userId, text)) {
        await send(chatId, "⛔ Bạn không có quyền chạy lệnh này.");
        return res.sendStatus(200);
      }

      const envKey = MEMBERS[text].gasEnv;
      await send(chatId, `⏳ Đang cập nhật cho *${MEMBERS[text].name}*...`);
      await axios.get(process.env[envKey]);
      await send(chatId, "✅ Hoàn tất!");
      return res.sendStatus(200);
    }

    await send(chatId, "⛔ Không hiểu lệnh. Gõ /help.");
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
