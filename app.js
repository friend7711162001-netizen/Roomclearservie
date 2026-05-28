/**
 * 🧹 今日房務整理看板 - 核心邏輯控制 (app.js)
 * 100% 使用「繁體中文（台灣）」進行程式碼邏輯註解與使用者提示。
 */

// --- 📢 管理者設定區 (預設雲端連結) ---
// 💡 您可以將在 Google Sheet 產生的 CSV 連結填寫在下方雙引號中做為「預設網址」！
// 這樣一來，所有員工的手機第一次點開網頁，完全不需要貼上網址，就能直接自動同步您的排班表！
const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTTH_CEEBRYiWoKSC28uXLf6m_svyJ-iTimxeY7mj-BgiLhewfvkw_VTgXXKAaJxIMsJyFd7C14VC3Y/pub?gid=1383763028&single=true&output=csv";

// --- 全域變數定義 ---
let rawSheetData = "";      // 儲存從 Google Sheet 抓取或 Demo 的原始文字 (CSV/TSV 格式)
let currentSelectedDate = new Date(); // 當前瀏覽的日期，預設為今天
let parsedSchedule = {};    // 解析後的排班資料結構
let availableHousekeepers = new Set(); // 所有排班表內出現的房務員名字
let isMonthlyView = false;   // 標記當前是否為「月總覽看板」視圖

// 莫蘭迪示範排班資料 (以 CSV 格式編寫，方便使用者在未串接時直接預覽功能)
const DEMO_CSV_DATA = `2026	更新日期												5/28																		
1	1	2	3	4	5	6	7	8	9	10	11	12	13	14	15	16	17	18	19	20	21	22	23	24	25	26	27	28	29	30	31
星期	四	五	六	日	一	二	三	四	五	六	日	一	二	三	四	五	六	日	一	二	三	四	五	六	日	一	二	三	四	五	六
202																															
201																												-	-	2	
301																												-	2		
302																									1						
大	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	1	1
小	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	1	0	0	0	0	0
人員																										華				華	華
																															
5	1	2	3	4	5	6	7	8	9	10	11	12	13	14	15	16	17	18	19	20	21	22	23	24	25	26	27	28	29	30	31
星期	五	六	日	一	二	三	四	五	六	日	一	二	三	四	五	六	日	一	二	三	四	五	六	日	一	二	三	四	五	六	日
202	-	-	-	1				-	-	-	1		-	1		1	-	-	1	-	1	-	-	-	1			-	-	1	
201	-	-	-	2					-	-	2			-	2		-	-	2	-	-	-	2	-	2			-	-	2	
301	2			2			2		-	-	2		-	2	-	2					2		-	2	-	-	2	-	-	2	-
302	-	-	-	1				-	-	-	1	-	-	-	1	1	-	-	1		-	1		-	-	1		-	-	1	
大	0	1	0	0	2	0	0	1	0	0	0	2	0	0	1	1	1	0	0	1	0	1	0	1	1	1	0	1	0	0	2
小	1	0	0	0	2	0	0	0	0	0	0	2	0	0	1	1	2	0	0	2	0	1	1	0	0	1	1	0	0	0	2
人員	姐	姐			姐			姐				姐			姐	姐	姐			姐		姐	姐	姐	姐	姐	姐	姐			姐`;

// --- DOM 元素宣告 ---
const dateTextEl = document.getElementById('date-text');
const dayOfWeekEl = document.getElementById('day-of-week');
const datePickerEl = document.getElementById('date-picker');
const housekeeperFilterEl = document.getElementById('filter-housekeeper');
const syncStatusEl = document.getElementById('sync-status');
const btnSyncNowEl = document.getElementById('btn-sync-now');
const btnPrevDayEl = document.getElementById('btn-prev-day');
const btnNextDayEl = document.getElementById('btn-next-day');

// 日看板與月看板主容器
const dailyViewContainerEl = document.getElementById('daily-view-container');
const dailyDateSelectorEl = document.getElementById('daily-date-selector');
const monthlyViewContainerEl = document.getElementById('monthly-view-container');
const btnMonthlyToggleEl = document.getElementById('btn-monthly-toggle');

// 日統計儀表板
const statTotalRoomsEl = document.getElementById('stat-total-rooms');
const statLargeCountEl = document.getElementById('stat-large-count');
const statSmallCountEl = document.getElementById('stat-small-count');

// 月統計與月控制
const monthlyLargeCountEl = document.getElementById('monthly-large-count');
const monthlySmallCountEl = document.getElementById('monthly-small-count');
const monthlyMonthSelectEl = document.getElementById('monthly-month-select');
const monthlyListTitleEl = document.getElementById('monthly-list-title');
const monthlyDaysListEl = document.getElementById('monthly-days-list');

// 房間列表與狀態
const stateMessageEl = document.getElementById('state-message');
const roomCardsGridEl = document.getElementById('room-cards-grid');

// 設定抽屜
const settingsDrawerEl = document.getElementById('settings-drawer');
const btnSettingsToggleEl = document.getElementById('btn-settings-toggle');
const btnSettingsCloseEl = document.getElementById('btn-settings-close');
const drawerOverlayEl = document.getElementById('drawer-overlay');
const inputSheetUrlEl = document.getElementById('input-sheet-url');
const btnSaveSettingsEl = document.getElementById('btn-save-settings');
const btnClearSettingsEl = document.getElementById('btn-clear-settings');

// 示範按鈕與動作
const btnLoadDemoEl = document.getElementById('btn-load-demo');
const btnOpenSettingsHeroEl = document.getElementById('btn-open-settings-hero');

// Toast 提示
const toastEl = document.getElementById('toast');
const toastMessageEl = document.getElementById('toast-message');

// --- 系統初始化與事件綁定 ---
document.addEventListener('DOMContentLoaded', () => {
  // 初始化 Lucide 圖標
  lucide.createIcons();

  // 從 LocalStorage 載入已儲存的 Google Sheet 連結，若無則讀取預設寫死的雲端網址
  const savedUrl = localStorage.getItem('google_sheet_csv_url') || DEFAULT_CSV_URL;

  const hasConfiguredUrl = savedUrl && savedUrl !== "您的_GOOGLE_SHEET_CSV_發佈網址_填在這裡" && savedUrl.trim() !== "";

  if (hasConfiguredUrl) {
    inputSheetUrlEl.value = savedUrl;
    fetchGoogleSheetData(savedUrl);
  } else {
    showStateMessage('start');
  }

  // 綁定事件監聽器
  btnSettingsToggleEl.addEventListener('click', openSettings);
  btnSettingsCloseEl.addEventListener('click', closeSettings);
  drawerOverlayEl.addEventListener('click', closeSettings);
  btnOpenSettingsHeroEl.addEventListener('click', openSettings);

  btnSaveSettingsEl.addEventListener('click', saveSettings);
  btnClearSettingsEl.addEventListener('click', clearSettings);

  btnLoadDemoEl.addEventListener('click', loadDemoData);
  btnSyncNowEl.addEventListener('click', triggerManualSync);

  // 日/月 看板切換按鈕
  btnMonthlyToggleEl.addEventListener('click', () => toggleViewMode());
  monthlyMonthSelectEl.addEventListener('change', renderMonthlyOverview);

  // 日期切換按鈕
  btnPrevDayEl.addEventListener('click', () => changeDate(-1));
  btnNextDayEl.addEventListener('click', () => changeDate(1));

  // 日期選擇器變更事件
  datePickerEl.addEventListener('change', (e) => {
    if (e.target.value) {
      currentSelectedDate = new Date(e.target.value);
      updateDateDisplay();
      renderTodayDashboard();
    }
  });



  // 人員篩選變更事件
  housekeeperFilterEl.addEventListener('change', () => {
    renderTodayDashboard();
  });

  // 設定日期選擇器預設最大最小值
  const todayStr = formatDateToYYYYMMDD(currentSelectedDate);
  datePickerEl.value = todayStr;
  updateDateDisplay();
});

// --- 顯示 Toast 提示訊息 ---
function showToast(message) {
  toastMessageEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

// --- 格式化日期輔助函式 ---
function formatDateToYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// --- 更新畫面上的日期與星期顯示 ---
function updateDateDisplay() {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const yyyy = currentSelectedDate.getFullYear();
  const mm = String(currentSelectedDate.getMonth() + 1).padStart(2, '0');
  const dd = String(currentSelectedDate.getDate()).padStart(2, '0');

  dateTextEl.textContent = `${yyyy} 年 ${mm} 月 ${dd} 日`;
  dayOfWeekEl.textContent = days[currentSelectedDate.getDay()];
  datePickerEl.value = `${yyyy}-${mm}-${dd}`;
}

// --- 日期加減切換 ---
function changeDate(daysOffset) {
  currentSelectedDate.setDate(currentSelectedDate.getDate() + daysOffset);
  updateDateDisplay();
  renderTodayDashboard();
}

// --- 開關設定抽屜 ---
function openSettings() {
  settingsDrawerEl.classList.add('open');
}

function closeSettings() {
  settingsDrawerEl.classList.remove('open');
}

// --- 儲存 Google Sheet 設定 ---
function saveSettings() {
  const url = inputSheetUrlEl.value.trim();
  if (!url) {
    showToast('❌ 請輸入有效的網址！');
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showToast('❌ 網址必須以 http:// 或 https:// 開頭！');
    return;
  }

  localStorage.setItem('google_sheet_csv_url', url);
  showToast('💾 設定已儲存，開始同步資料...');
  closeSettings();
  fetchGoogleSheetData(url);
}

// --- 清除 Google Sheet 設定 ---
function clearSettings() {
  localStorage.removeItem('google_sheet_csv_url');
  inputSheetUrlEl.value = "";
  rawSheetData = "";
  parsedSchedule = {};
  availableHousekeepers.clear();

  showToast('🗑️ 設定已清除！');
  closeSettings();
  showStateMessage('start');
  updateSyncStatus('error', '未設定試算表連結');
}

// --- 載入示範資料 ---
function loadDemoData() {
  rawSheetData = DEMO_CSV_DATA;
  showToast('✨ 已載入 2026 年 5 月份莫蘭迪示範資料！');
  parseCSVToSchedule(rawSheetData);
  updateSyncStatus('success', '目前使用示範資料');

  // 設定時間為示範資料有的 2026-05-28，方便使用者看得到內容
  currentSelectedDate = new Date('2026-05-28');
  updateDateDisplay();
  renderTodayDashboard();
}

// --- 手動同步按鈕邏輯 ---
function triggerManualSync() {
  const savedUrl = localStorage.getItem('google_sheet_csv_url');
  if (savedUrl) {
    fetchGoogleSheetData(savedUrl);
  } else {
    showToast('⚠️ 請先點擊右上角設定 Google Sheet CSV 連結！');
    openSettings();
  }
}

// --- 更新同步狀態燈號 ---
function updateSyncStatus(type, message) {
  syncStatusEl.className = 'sync-status';
  syncStatusEl.innerHTML = '';

  const icon = document.createElement('i');
  if (type === 'success') {
    syncStatusEl.classList.add('success');
    icon.setAttribute('data-lucide', 'check-circle');
    syncStatusEl.appendChild(icon);
    syncStatusEl.appendChild(document.createTextNode(' ' + message));
  } else if (type === 'error') {
    syncStatusEl.classList.add('error');
    icon.setAttribute('data-lucide', 'alert-circle');
    syncStatusEl.appendChild(icon);
    syncStatusEl.appendChild(document.createTextNode(' ' + message));
  } else if (type === 'syncing') {
    syncStatusEl.classList.add('syncing');
    icon.setAttribute('data-lucide', 'refresh-cw');
    syncStatusEl.appendChild(icon);
    syncStatusEl.appendChild(document.createTextNode(' ' + message));
  }

  lucide.createIcons();
}

// --- 從 Google Sheet URL 下載 CSV 資料 ---
async function fetchGoogleSheetData(csvUrl) {
  updateSyncStatus('syncing', '正在同步雲端資料...');

  try {
    // 為了防呆，如果使用者複製了整份 Sheet 的 edit 網址而非 pub 網址，我們在 JS 做個貼心的自動置換！
    let finalUrl = csvUrl;
    if (csvUrl.includes('/edit') && !csvUrl.includes('pub?output=csv')) {
      const match = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        // 自動轉換成 CSV 匯出網址格式
        finalUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
        showToast('💡 已貼心為您自動轉換試算表下載格式');
      }
    }

    const response = await fetch(finalUrl);
    if (!response.ok) {
      throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      throw new Error('下載的資料為空，請確認 Google Sheet 發佈設定！');
    }

    rawSheetData = text;
    showToast('✅ 雲端資料同步成功！');
    updateSyncStatus('success', '已同步最新雲端資料');
    parseCSVToSchedule(rawSheetData);
    renderTodayDashboard();
  } catch (error) {
    console.error('Fetch Error:', error);
    showToast('❌ 同步失敗，請確認網路或連結是否正確！');
    updateSyncStatus('error', '雲端同步失敗');

    if (!rawSheetData) {
      showStateMessage('error', error.message);
    }
  }
}

// --- 核心邏輯：解析 CSV 試算表 (月份網格格式) ---
function parseCSVToSchedule(csvText) {
  // 將 CSV 資料按行分割，並相容 Windows/Unix 換行字元
  const lines = csvText.split(/\r?\n/);

  parsedSchedule = {};
  availableHousekeepers.clear();

  let currentMonth = null;
  let currentBlockRows = [];

  // 遍歷每一行，將其劃分為多個月份區塊 (Monthly Blocks)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 解析 CSV 儲存格，支援逗號 (,) 與 Tab 鍵 (\t) 兩種分隔符號
    // 這樣使用者直接在網頁測試貼上時也能完美解析
    const delimiter = line.includes('\t') ? '\t' : ',';
    const cells = line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));

    if (cells.length === 0) continue;

    const firstCell = cells[0];

    // 🔍 判斷是否為「月份區塊」的開頭：第一格為 1 ~ 12 的數字
    const parsedMonth = parseInt(firstCell);
    if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
      // 遇到新的月份區塊，先把舊的區塊送去解析
      if (currentMonth !== null && currentBlockRows.length > 0) {
        processMonthBlock(currentMonth, currentBlockRows);
      }
      // 初始化新月份區塊
      currentMonth = parsedMonth;
      currentBlockRows = [cells]; // 存入月份的第一列（包含日期 1-31）
    } else if (currentMonth !== null) {
      // 屬於當前月份區塊的後續行
      currentBlockRows.push(cells);
    }
  }

  // 不要漏掉最後一個月份區塊的處理
  if (currentMonth !== null && currentBlockRows.length > 0) {
    processMonthBlock(currentMonth, currentBlockRows);
  }

  // 更新房務人員下拉選單
  populateHousekeeperDropdown();
}

/**
 * 💡 智慧解析單一月份區塊的核心邏輯
 * @param {number} month 月份數字 (1-12)
 * @param {Array<Array<string>>} rows 該月份區塊的所有列資料
 */
function processMonthBlock(month, rows) {
  // 第一列為日期標題 [month, '1', '2', '3', ..., '31']
  const dateHeader = rows[0];

  // 尋找包含「星期」的列
  const weekdayRow = rows.find(r => r[0] === '星期');

  // 尋找包含「大」、「小」、「人員」的列
  const largeRow = rows.find(r => r[0] === '大');
  const smallRow = rows.find(r => r[0] === '小');
  const staffRow = rows.find(r => r[0] === '人員');

  // 尋找所有的房間列（房號通常是三位數的純數字，例如 201, 202, 301, 302）
  const roomRows = rows.filter(r => {
    const roomNum = parseInt(r[0]);
    return !isNaN(roomNum) && r[0].length >= 3 && r[0] !== String(month);
  });

  // 如果連日期標題都沒有，就無法解析
  if (!dateHeader) return;

  // 建立此月份的排班資料庫
  if (!parsedSchedule[month]) {
    parsedSchedule[month] = {};
  }

  // 遍歷 1 到 31 日的每一欄
  // 從 index 1 開始（index 0 是列名稱如 201、人員、大）
  for (let colIdx = 1; colIdx < dateHeader.length; colIdx++) {
    const dayStr = dateHeader[colIdx];
    const day = parseInt(dayStr);

    // 如果這欄不是有效日期，則跳過
    if (isNaN(day) || day < 1 || day > 31) continue;

    // 初始化此月份中，這一天的具體排班結構
    parsedSchedule[month][day] = {
      weekday: weekdayRow ? weekdayRow[colIdx] : "",
      largeCount: largeRow ? parseInt(largeRow[colIdx]) || 0 : 0,
      smallCount: smallRow ? parseInt(smallRow[colIdx]) || 0 : 0,
      todayStaffName: staffRow ? staffRow[colIdx] || "" : "",
      roomRawValues: {} // 儲存房號當天的原始狀態代號 (用於隔日打掃邏輯)
    };

    // 遍歷所有房號列，抓取當天的原始狀態代號
    roomRows.forEach(r => {
      const roomNum = r[0];
      const taskCode = r[colIdx] ? r[colIdx].trim() : "";
      if (taskCode && taskCode !== "0") {
        parsedSchedule[month][day].roomRawValues[roomNum] = taskCode;
      }
    });

    // 取得今天這欄被指派的房務員名字，並加入全域集合中
    let assignedStaff = staffRow ? staffRow[colIdx] || "" : "";
    if (assignedStaff && assignedStaff !== "-" && assignedStaff !== "/") {
      // 處理多人共用字串，如 "姐/華" 則分割為獨立名字
      const splitStaff = assignedStaff.split(/[\/|、&]/);
      splitStaff.forEach(name => {
        const cleanName = name.trim();
        if (cleanName) availableHousekeepers.add(cleanName);
      });
    }
  }
}

// --- 動態生成房務人員篩選選單 ---
function populateHousekeeperDropdown() {
  // 先保留第一項 "👤 全部人員"
  const currentVal = housekeeperFilterEl.value;
  housekeeperFilterEl.innerHTML = '<option value="ALL">👤 全部人員</option>';

  // 將收集到的所有房務員名字依序加入
  Array.from(availableHousekeepers).sort().forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = `👤 ${name}`;
    housekeeperFilterEl.appendChild(option);
  });

  // 恢復先前的選擇，避免切換日期時被重置
  if (Array.from(availableHousekeepers).includes(currentVal)) {
    housekeeperFilterEl.value = currentVal;
  }
}

// --- 畫面狀態顯示控制 ---
function showStateMessage(state, extraInfo = '') {
  stateMessageEl.classList.remove('hidden');
  roomCardsGridEl.classList.add('hidden');

  const titleEl = document.getElementById('state-title');
  const descEl = document.getElementById('state-desc');
  const actionArea = stateMessageEl.querySelector('.state-actions');

  if (state === 'start') {
    titleEl.textContent = '開始使用房務看板';
    descEl.textContent = '請點擊下方按鈕設定您的 Google Sheet CSV 發佈網址，或載入示範資料進行預覽。';
    actionArea.classList.remove('hidden');
  } else if (state === 'no_data') {
    titleEl.textContent = '今日無房務排班資料';
    descEl.textContent = `在 ${formatDateToYYYYMMDD(currentSelectedDate)} 這一天，排班表上沒有安排任何房間整理任務，或是當天被標記為休息。`;
    actionArea.classList.add('hidden');
  } else if (state === 'error') {
    titleEl.textContent = '資料解析失敗';
    descEl.textContent = `無法解析您的 Google Sheet CSV。請確認是否已正確將其「發佈到網路」並且格式選擇了「CSV」。\n錯誤詳情: ${extraInfo}`;
    actionArea.classList.remove('hidden');
  }
}

// --- 核心渲染：依據日期與篩選條件繪製房務卡片與統計數值 ---
function renderTodayDashboard() {
  const month = currentSelectedDate.getMonth() + 1;
  const day = currentSelectedDate.getDate();

  // 檢查資料庫是否有該月份與該日期的資料
  const dayData = parsedSchedule[month] ? parsedSchedule[month][day] : null;

  if (!dayData) {
    // 歸零儀表板數值
    statTotalRoomsEl.textContent = '0';
    statLargeCountEl.textContent = '0';
    statSmallCountEl.textContent = '0';
    showStateMessage('no_data');
    return;
  }

  // 1. 更新大/小退房儀表板統計數值 (讀取今日 Day D 欄位)
  statLargeCountEl.textContent = dayData.largeCount;
  statSmallCountEl.textContent = dayData.smallCount;

  // 2. 智慧日期偏移：抓取「昨天 Day D-1」的房間狀態，作為「今天 Day D」的打掃任務
  const yesterday = new Date(currentSelectedDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const prevMonth = yesterday.getMonth() + 1;
  const prevDay = yesterday.getDate();

  const yesterdayData = parsedSchedule[prevMonth] ? parsedSchedule[prevMonth][prevDay] : null;
  const todayStaff = dayData.todayStaffName || "未分配";

  let todayRooms = [];

  if (yesterdayData && yesterdayData.roomRawValues) {
    Object.entries(yesterdayData.roomRawValues).forEach(([roomNum, taskCode]) => {
      // 解析昨天格子代號對應的今日房務分類
      let taskType = "未知狀態";
      let taskClass = "";

      if (taskCode === "-") {
        taskType = "續住（避免誤入）";
        taskClass = "do-not-enter";
      } else if (taskCode === "1") {
        taskType = "小間退房";
        taskClass = "checkout small";
      } else if (taskCode === "2") {
        taskType = "大間退房";
        taskClass = "checkout large";
      } else {
        taskType = taskCode;
        taskClass = "checkout large";
      }

      todayRooms.push({
        roomNumber: roomNum,
        taskCode: taskCode,
        taskType: taskType,
        taskClass: taskClass,
        housekeeper: todayStaff // 負責人是今天的打掃人員！
      });
    });
  }

  // 3. 依據選擇的房務人員進行房間過濾
  const selectedHousekeeper = housekeeperFilterEl.value; // 'ALL' 或是特定名字如 '華'

  const filteredRooms = todayRooms.filter(room => {
    if (selectedHousekeeper === 'ALL') {
      return true;
    }
    // 支援模糊比對（例如 "姐/華" 當選取 "華" 或 "姐" 時都能篩選出來）
    return room.housekeeper.includes(selectedHousekeeper);
  });

  // 區分「需整理退房」與「續住房間」
  const cleanRooms = filteredRooms.filter(r => r.taskCode === "1" || r.taskCode === "2");
  const stayoverRooms = filteredRooms.filter(r => r.taskCode === "-");

  // 統計總整理間數為「退房打掃間數」
  statTotalRoomsEl.textContent = cleanRooms.length;

  // 4. 判斷是否有任何房間資訊
  if (filteredRooms.length === 0) {
    showStateMessage('no_data');
    return;
  }

  // 隱藏狀態訊息，顯示房間卡片網格
  stateMessageEl.classList.add('hidden');
  roomCardsGridEl.classList.remove('hidden');

  // 取得分區容器
  const gridCleanEl = document.getElementById('grid-clean');
  const gridStayoverEl = document.getElementById('grid-stayover');
  const containerCleanEl = document.getElementById('container-clean');
  const containerStayoverEl = document.getElementById('container-stayover');

  gridCleanEl.innerHTML = '';
  gridStayoverEl.innerHTML = '';

  document.getElementById('count-clean').textContent = cleanRooms.length;
  document.getElementById('count-stayover').textContent = stayoverRooms.length;

  // 顯示/隱藏打掃分區
  if (cleanRooms.length === 0) {
    containerCleanEl.classList.add('hidden');
  } else {
    containerCleanEl.classList.remove('hidden');
    // 動態產生退房打掃卡片
    cleanRooms.forEach(room => {
      const card = document.createElement('div');
      card.className = `room-card ${room.taskClass}`;

      // 智慧圖案配置：大間房為 home (🏠)，小間房為 bed (🛏️)
      const iconName = room.taskClass.includes('large') ? 'home' : 'bed';

      card.innerHTML = `
        <div class="room-main-info">
          <div class="room-number-badge">${room.roomNumber}</div>
          <div class="room-type-badge">
            <span class="type-label">
              <i data-lucide="${iconName}"></i>
              <span>${room.taskType}</span>
            </span>
            <div class="room-meta">
              <span class="meta-housekeeper">
                <i data-lucide="user"></i>
                <span>負責人：${room.housekeeper}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="room-status-indicator">
          <span class="status-badge">今日打掃</span>
        </div>
      `;
      gridCleanEl.appendChild(card);
    });
  }

  // 顯示/隱藏續住防誤入分區
  if (stayoverRooms.length === 0) {
    containerStayoverEl.classList.add('hidden');
  } else {
    containerStayoverEl.classList.remove('hidden');
    // 動態產生續住防誤入卡片
    stayoverRooms.forEach(room => {
      const card = document.createElement('div');
      card.className = `room-card ${room.taskClass}`;

      const iconName = "shield-alert"; // 警示盾牌圖示

      card.innerHTML = `
        <div class="room-main-info">
          <div class="room-number-badge">${room.roomNumber}</div>
          <div class="room-type-badge">
            <span class="type-label">
              <i data-lucide="${iconName}"></i>
              <span>${room.taskType}</span>
            </span>
            <div class="room-meta">
              <span class="meta-housekeeper">
                <i data-lucide="user"></i>
                <span>負責人：${room.housekeeper}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="room-status-indicator">
          <span class="status-badge">避免誤入</span>
        </div>
      `;
      gridStayoverEl.appendChild(card);
    });
  }

  // 重新渲染新插入 DOM 的 Lucide 圖標
  lucide.createIcons();
}

// --- ⚙️ 月總覽視圖核心控制邏輯 ---

/**
 * 🔄 切換日看板與月總覽看板
 * @param {boolean|null} forceState 強制設定視圖狀態（true: 月總覽, false: 日看板）
 */
function toggleViewMode(forceState = null) {
  isMonthlyView = forceState !== null ? forceState : !isMonthlyView;

  if (isMonthlyView) {
    // 隱藏日看板相關容器
    dailyViewContainerEl.classList.add('hidden');
    dailyDateSelectorEl.classList.add('hidden');

    // 顯示月總覽容器
    monthlyViewContainerEl.classList.remove('hidden');

    // 更改切換按鈕的圖標為日曆/卡片切換
    btnMonthlyToggleEl.innerHTML = '<i data-lucide="layout-grid"></i>';
    btnMonthlyToggleEl.title = "切換回日打掃卡片";

    // 載入月份選單與數據明細
    populateMonthDropdown();
    renderMonthlyOverview();

    showToast('📅 已開啟月份排班總覽');
  } else {
    // 顯示日看板容器
    dailyViewContainerEl.classList.remove('hidden');
    dailyDateSelectorEl.classList.remove('hidden');

    // 隱藏月總覽容器
    monthlyViewContainerEl.classList.add('hidden');

    // 恢復切換按鈕圖標
    btnMonthlyToggleEl.innerHTML = '<i data-lucide="calendar-days"></i>';
    btnMonthlyToggleEl.title = "切換月分總覽";

    // 重新繪製今日打掃看板
    renderTodayDashboard();
  }

  // 重新繪製圖標
  lucide.createIcons();
}

/**
 * 📅 動態生成月份下拉選單（僅列出試算表中有排班資料的月份）
 */
function populateMonthDropdown() {
  const currentVal = monthlyMonthSelectEl.value;
  monthlyMonthSelectEl.innerHTML = '';

  // 獲取排班資料中所有有資料的月份
  const availableMonths = Object.keys(parsedSchedule).map(m => parseInt(m)).sort((a, b) => a - b);

  if (availableMonths.length === 0) {
    // 防呆：若無資料，預設加入當前月份
    const currentMonth = currentSelectedDate.getMonth() + 1;
    const option = document.createElement('option');
    option.value = currentMonth;
    option.textContent = `${currentMonth} 月`;
    monthlyMonthSelectEl.appendChild(option);
  } else {
    availableMonths.forEach(m => {
      const option = document.createElement('option');
      option.value = m;
      option.textContent = `${m} 月排班表`;
      monthlyMonthSelectEl.appendChild(option);
    });
  }

  // 預設選取當前瀏覽日期所屬的月份
  const activeMonth = currentSelectedDate.getMonth() + 1;
  if (availableMonths.includes(activeMonth)) {
    monthlyMonthSelectEl.value = activeMonth;
  } else if (availableMonths.length > 0) {
    monthlyMonthSelectEl.value = availableMonths[0];
  }
}

/**
 * 📊 渲染整個月的日期、星期、大/小數量與負責人員清單
 */
function renderMonthlyOverview() {
  const selectedMonth = parseInt(monthlyMonthSelectEl.value);
  if (isNaN(selectedMonth)) return;

  // 1. 更新清單標題
  monthlyListTitleEl.textContent = `${selectedMonth} 月排班明細`;

  const year = currentSelectedDate.getFullYear();
  // 計算該月份的總天數 (例如 5月為 31天)
  const daysInMonth = new Date(year, selectedMonth, 0).getDate();

  let totalLarge = 0;
  let totalSmall = 0;

  monthlyDaysListEl.innerHTML = '';

  // 2. 獲取今天系統時間的日期，供「今日標記」使用
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  // 3. 循序生成 1 號到當月最後一天的清單
  for (let d = 1; d <= daysInMonth; d++) {
    // 檢查當天是否有排班資料
    const dayData = parsedSchedule[selectedMonth] && parsedSchedule[selectedMonth][d]
      ? parsedSchedule[selectedMonth][d]
      : null;

    // 取得各項數值 (若無資料則為預設值)
    const weekday = dayData ? dayData.weekday : getWeekdayName(year, selectedMonth, d);
    const housekeeper = dayData ? dayData.todayStaffName : "";
    const largeCount = dayData ? dayData.largeCount : 0;
    const smallCount = dayData ? dayData.smallCount : 0;

    // 累計月份總量
    totalLarge += largeCount;
    totalSmall += smallCount;

    // 💡 智慧過濾：如果當天沒有大間、小間退房，且沒有分配打掃人員，則代表是空白空閒日，直接隱藏不顯示！
    const hasActiveTasks = largeCount > 0 || smallCount > 0 || (housekeeper && housekeeper.trim() !== "" && housekeeper !== "-" && housekeeper !== "/");
    if (!hasActiveTasks) {
      continue;
    }

    // 4. 動態創建列表列
    const row = document.createElement('div');
    row.className = 'monthly-row';

    // 標記「今天」的發光背景
    if (d === todayDay && selectedMonth === todayMonth && year === todayYear) {
      row.classList.add('is-today');
    }

    // 判斷是否為週末 (星期六、星期日)，給予專屬的紅粉色 badge 標色
    const isWeekend = weekday === '六' || weekday === '日' || weekday === 'Sat' || weekday === 'Sun';
    const weekendClass = isWeekend ? 'weekend' : '';

    // 5. 繪製列的 HTML 結構
    row.innerHTML = `
      <div class="col-date">
        <span>${selectedMonth}/${String(d).padStart(2, '0')}</span>
        <span class="monthly-weekday-badge ${weekendClass}">${weekday}</span>
      </div>
      <div class="col-staff">
        ${housekeeper ? `<span class="monthly-staff-badge">${housekeeper}</span>` : `<span style="color:#b5af9f;">-</span>`}
      </div>
      <div class="col-count">
        <span class="mini-count-badge large ${largeCount === 0 ? 'zero' : ''}">
          <i data-lucide="home" style="width:10px;height:10px;"></i> 大 ${largeCount}
        </span>
        <span class="mini-count-badge small ${smallCount === 0 ? 'zero' : ''}">
          <i data-lucide="bed" style="width:10px;height:10px;"></i> 小 ${smallCount}
        </span>
      </div>
    `;

    // 6. 智慧聯動：點選此列，自動變更日期並切換回日看板
    row.addEventListener('click', () => {
      // 變更當前選定時間
      currentSelectedDate = new Date(year, selectedMonth - 1, d);

      // 更新日看板上方日期與日期選擇器的數值
      updateDateDisplay();

      // 退出月總覽視圖，返回日卡片
      toggleViewMode(false);

      showToast(`📅 已為您切換至 ${selectedMonth}月${d}日 看板！`);
    });

    monthlyDaysListEl.appendChild(row);
  }

  // 7. 更新月總覽上方累計大/小統計面板
  monthlyLargeCountEl.textContent = totalLarge;
  monthlySmallCountEl.textContent = totalSmall;

  // 重新渲染 Lucide 圖標
  lucide.createIcons();
}

/**
 * 📅 輔助計算給定日期的星期字串（防呆用，以防試算表當天沒提供星期欄位）
 */
function getWeekdayName(year, month, day) {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const date = new Date(year, month - 1, day);
  return days[date.getDay()];
}
