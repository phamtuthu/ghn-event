// =============================
//       SUPER ADMIN
// =============================
export const SUPER_ADMINS = [
  999999999, // Thay bằng Telegram ID thật của bạn
];

// =============================
//       TEAM LEAD MAPPING
// =============================
// Format: telegramUserId : teamNumber
export const TEAM_LEADS = {
  // TEAM 1
  111111111: 1,

  // TEAM 2
  222222222: 2,

  // TEAM 3
  333333333: 3
};

// =============================
// MAP COMMAND → TEAM
// =============================
export const TEAM_COMMAND_MAP = {
  // team 1
  "3089136": 1,
  "3110482": 1,
  "3041313": 1,
  "3089135": 1,
  "3125832": 1,
  "3097094": 1,
  "3063800": 1,
  "3113236": 1,
  "3125839": 1,

  // team 2
  "3053079": 2,
  "3061430": 2,
  "3115063": 2,
  "3070887": 2,
  "3108527": 2,
  "3134239": 2,
  "3111106": 2,
  "3097092": 2,

  // team 3
  "3100229": 3,
  "3066803": 3,
  "3114284": 3,
  "3100526": 3,
  "3065006": 3,
  "3101076": 3,
  "3114283": 3
};

// =============================
//    CHECK PERMISSION
// =============================
export function canRunCommand(userId, command) {
  if (SUPER_ADMINS.includes(userId)) return true;

  if (!TEAM_COMMAND_MAP[command]) return true;

  const userTeam = TEAM_LEADS[userId];
  const commandTeam = TEAM_COMMAND_MAP[command];

  if (!userTeam) return false;

  return userTeam === commandTeam;
}
