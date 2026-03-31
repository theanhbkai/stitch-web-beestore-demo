// ============================================================
// FILE: Code.gs — Google Apps Script Nhận Dữ Liệu Lead từ Chatbot
// ============================================================
// CỘT GOOGLE SHEETS (9 cột, dòng 1):
// A: Thời gian | B: Tên | C: SĐT | D: Email | E: Quan tâm | F: Mức độ | G: Nguồn | H: Session ID | I: Lịch sử Chat
// ============================================================

// ⚙️ CẤU HÌNH — Lấy từ Script Properties (bảo mật, dễ bảo trì)
var props = PropertiesService.getScriptProperties();
var SPREADSHEET_ID = props.getProperty('SPREADSHEET_ID');
var SALES_EMAIL = props.getProperty('SALES_EMAIL');

// ============================================================
// 🔧 CHẠY HÀM NÀY 1 LẦN DUY NHẤT ĐỂ CÀI ĐẶT CẤU HÌNH
// (Mở Apps Script → Chọn hàm setupConfig → Nhấn ▶ Run)
// ============================================================
function setupConfig() {
  PropertiesService.getScriptProperties().setProperties({
    'SPREADSHEET_ID': 'THAY_SPREADSHEET_ID_CUA_BAN_VAO_DAY',
    'SALES_EMAIL': 'THAY_EMAIL_CUA_BAN_VAO_DAY@gmail.com'
  });
  Logger.log('✅ Đã lưu cấu hình thành công! Bạn có thể deploy Web App.');
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var newTime = data.timestamp || new Date().toLocaleString('vi-VN');
    var newName = data.name || '';
    var newPhone = data.phone || '';
    var newEmail = data.email || '';
    var newInterest = data.interest || '';
    var newIntentLevel = data.intentLevel || '';
    var newSource = data.source || '';
    var newSessionId = data.sessionId || '';
    var newHistory = data.chatHistory || '';

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var rowIndexToUpdate = -1;

    // Tìm Session ID ở Cột H (index 7)
    if (newSessionId) {
      for (var i = values.length - 1; i > 0; i--) { 
        var rowSessionId = values[i][7] ? values[i][7].toString().trim() : '';
        if (rowSessionId === newSessionId) {
          rowIndexToUpdate = i + 1;
          break;
        }
      }
    }

    if (rowIndexToUpdate > -1) {
      // === CẬP NHẬT GỘP ===
      var currentRow = values[rowIndexToUpdate - 1];
      if (!currentRow[1] && newName) sheet.getRange(rowIndexToUpdate, 2).setValue(newName);       // B: Tên
      if (!currentRow[2] && newPhone) sheet.getRange(rowIndexToUpdate, 3).setValue(newPhone);     // C: SĐT
      if (!currentRow[3] && newEmail) sheet.getRange(rowIndexToUpdate, 4).setValue(newEmail);     // D: Email
      if (newInterest) sheet.getRange(rowIndexToUpdate, 5).setValue(newInterest);                 // E: Quan tâm
      if (newIntentLevel) sheet.getRange(rowIndexToUpdate, 6).setValue(newIntentLevel);           // F: Mức độ
      if (newHistory) sheet.getRange(rowIndexToUpdate, 9).setValue(newHistory);                   // I: Lịch sử Chat
      sheet.getRange(rowIndexToUpdate, 1).setValue(newTime);                                      // A: Thời gian
    } else {
      // === TẠO DÒNG MỚI ===
      // A          B        C        D        E            F              G         H            I
      sheet.appendRow([newTime, newName, newPhone, newEmail, newInterest, newIntentLevel, newSource, newSessionId, newHistory]);
    }

    // 🔥 CẢNH BÁO KHÁCH NÓNG
    if (newIntentLevel === 'hot' && (newName || newPhone || newEmail)) {
      sendHotLeadAlert(newName, newPhone, newEmail, newInterest, newTime);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendHotLeadAlert(name, phone, email, interest, time) {
  try {
    var subject = '🔥 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY!';
    var body = '📢 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY!\n\n'
      + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      + 'Tên:       ' + (name || 'Chưa rõ') + '\n'
      + 'SĐT:       ' + (phone || 'Chưa cung cấp') + '\n'
      + 'Email:     ' + (email || 'Chưa cung cấp') + '\n'
      + 'Quan tâm:  ' + (interest || 'Chưa xác định') + '\n'
      + 'Thời gian: ' + time + '\n'
      + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
      + '⚡ Vui lòng liên hệ khách hàng này trong vòng 30 phút!\n\n'
      + '— Hệ thống Chatbot AI BEESTORE';
    
    MailApp.sendEmail(SALES_EMAIL, subject, body);
    Logger.log('✅ Đã gửi email cảnh báo khách HOT: ' + name);
  } catch (err) {
    Logger.log('❌ Lỗi gửi email: ' + err.toString());
  }
}

function doGet() {
  return ContentService.createTextOutput("API Chatbot Leads v2 đang hoạt động! ✅");
}
