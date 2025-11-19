import express from "express";
import { google } from "googleapis";

const app = express();
app.use(express.json());

// =====================================================
// 1. GOOGLE AUTH – chuẩn Enterprise
// =====================================================
async function getSheetsClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// Clean 1 row: bỏ dấu ' ở đầu nếu có
function cleanRow(row) {
  return row.map((v) => {
    if (typeof v === "string" && v.startsWith("'")) {
      return v.slice(1); // bỏ dấu '
    }
    return v;
  });
}

// =====================================================
// 2. Enterprise Import API
// =====================================================
app.post("/import-data", async (req, res) => {
  try {
    const {
      sourceFileId,
      sourceSheet,
      sourceRange,
      destFileId,
      destSheet,
      startDate,
      endDate,
    } = req.body;

    const sheets = await getSheetsClient();

    // STEP 1 — Đọc dữ liệu nguồn
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: sourceFileId,
      range: `${sourceSheet}!${sourceRange}`,
    });

    const rows = read.data.values || [];
    const sd = new Date(startDate);
    const ed = new Date(endDate);

    // STEP 2 — Filter theo ngày (cột I)
    const filtered = rows.filter((r) => {
      const d = r[8]; // cột I
      if (!d) return false;
      const dateObj = new Date(d);
      return dateObj >= sd && dateObj <= ed;
    });

    if (filtered.length === 0) {
      return res.json({
        message: "Không tìm thấy dòng phù hợp",
        imported: 0,
      });
    }

    // STEP 2.5 — Clean dữ liệu (bỏ dấu ' nếu đã có từ trước)
    const cleaned = filtered.map((row) => cleanRow(row));

    // STEP 3 — Xoá dữ liệu cũ
    await sheets.spreadsheets.values.clear({
      spreadsheetId: destFileId,
      range: `${destSheet}!A2:Z`,
    });

    // STEP 4 — Ghi dữ liệu mới (RAW, không thêm ')
    await sheets.spreadsheets.values.update({
      spreadsheetId: destFileId,
      range: `${destSheet}!A2`,
      valueInputOption: "RAW",
      requestBody: {
        values: cleaned,
      },
    });

    res.json({
      message: "Import thành công",
      imported: cleaned.length,
    });
  } catch (err) {
    console.error("IMPORT ERROR:", err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
});

// =====================================================
// 3. Healthcheck
// =====================================================
app.get("/", (req, res) => {
  res.send("GHN Importer Enterprise API is running.");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on Railway (Enterprise mode)...");
});
