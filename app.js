// ============================================
// LAP ROOF GRID TRACKER
// app.js — Main Building A thru Q
// ============================================

const ROWS = [
  { label: "A", section: "Main Body" },
  { label: "B", section: "Main Body" },
  { label: "C", section: "Main Body" },
  { label: "D", section: "Main Body" },
  { label: "E", section: "Main Body" },
  { label: "F", section: "Main Body" },
  { label: "G", section: "Main Body" },
  { label: "H", section: "Main Body" },
  { label: "J", section: "Main Body" },
  { label: "K", section: "Main Body" },
  { label: "L", section: "Main Body" },
  { label: "M", section: "Main Body" },
  { label: "N", section: "Main Body" },
  { label: "P", section: "Main Body" },
  { label: "Q", section: "Main Body" },
];

const COLS = [
  "013","012","011","010","09","08","07","06","05","04","03","02","01",
  "1","2","3","4","5","6","7","8","9","10","11","12","13","14","15",
  "16","17","18","19","20","21","22","23","24","25","26","27","28",
  "29","30","31","32","33","34","35","36","37","38","39","40","41",
  "42","43","44","45","46"
];

const STORAGE_KEY = "lapRoofData_v2";

let bayData = {};
let selectedCond = "";
let activeBayId = "";

// ---- INIT ----
function init() {
  loadData();
  buildGrid();
  updateSummary();
}

// ---- LOAD / SAVE DATA ----
function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    bayData = JSON.parse(stored);
  } else {
    ROWS.forEach(row => {
      COLS.forEach(col => {
        const id = row.label + "-" + col;
        bayData[id] = {
          id:        id,
          row:       row.label,
          col:       col,
          section:   row.section,
          condition: "Not Inspected",
          lastDate:  "",
          inspector: "",
          workOrder: "",
          notes:     ""
        };
      });
    });
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bayData));
}

// ---- BUILD GRID ----
function buildGrid() {
  const thead = document.getElementById("grid-header");
  const tbody = document.getElementById("grid-body");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // Header row — column labels
  const headerRow = document.createElement("tr");
  const cornerTh  = document.createElement("th");
  cornerTh.className   = "row-header-top";
  cornerTh.textContent = "ROW / COL";
  headerRow.appendChild(cornerTh);

  COLS.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    // Visual divider after col 01 (end of the negative side)
    if (col === "01") {
      th.style.borderRight = "3px solid #ffcc00";
    }
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  // Data rows
  ROWS.forEach(row => {
    const tr = document.createElement("tr");

    // Row label
    const labelTd = document.createElement("td");
    labelTd.className   = "row-label";
    labelTd.textContent = row.label;
    tr.appendChild(labelTd);

    // Bay cells
    COLS.forEach(col => {
      const id = row.label + "-" + col;
      const td = document.createElement("td");
      td.className = "bay-cell";
      td.id        = "cell-" + id;
      td.textContent = id;
      td.title     = id + " — " + row.section;
      td.onclick   = () => openPopup(id);

      // Visual divider after col 01
      if (col === "01") {
        td.style.borderRight = "3px solid #ffcc00";
      }

      applyCondColor(td, bayData[id] ? bayData[id].condition : "Not Inspected");
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// ---- APPLY COLOR TO CELL ----
function applyCondColor(td, condition) {
  td.classList.remove("cond-good","cond-fair","cond-poor","cond-critical","cond-ni");
  switch (condition) {
    case "Good":     td.classList.add("cond-good");     break;
    case "Fair":     td.classList.add("cond-fair");     break;
    case "Poor":     td.classList.add("cond-poor");     break;
    case "Critical": td.classList.add("cond-critical"); break;
    default:         td.classList.add("cond-ni");       break;
  }
}

// ---- UPDATE SUMMARY COUNTS ----
function updateSummary() {
  let total = 0, ni = 0, good = 0, fair = 0, poor = 0, crit = 0;
  Object.values(bayData).forEach(b => {
    total++;
    switch (b.condition) {
      case "Good":     good++; break;
      case "Fair":     fair++; break;
      case "Poor":     poor++; break;
      case "Critical": crit++; break;
      default:         ni++;   break;
    }
  });
  document.getElementById("count-total").textContent = total;
  document.getElementById("count-ni").textContent    = ni;
  document.getElementById("count-good").textContent  = good;
  document.getElementById("count-fair").textContent  = fair;
  document.getElementById("count-poor").textContent  = poor;
  document.getElementById("count-crit").textContent  = crit;
}

// ---- OPEN POPUP ----
function openPopup(bayId) {
  activeBayId  = bayId;
  selectedCond = "";
  const bay    = bayData[bayId];

  document.getElementById("popup-bay-id").textContent        = bayId;
  document.getElementById("popup-section").textContent       = bay.section;
  document.getElementById("popup-current-cond").textContent  = bay.condition;
  document.getElementById("popup-last-date").textContent     = bay.lastDate  || "Never";
  document.getElementById("popup-last-inspector").textContent = bay.inspector || "-";
  document.getElementById("input-inspector").value = bay.inspector || "";
  document.getElementById("input-wo").value        = bay.workOrder || "";
  document.getElementById("input-notes").value     = bay.notes     || "";

  document.querySelectorAll(".cond-btn").forEach(b => b.classList.remove("selected"));

  document.getElementById("overlay").classList.remove("hidden");
  document.getElementById("popup").classList.remove("hidden");
}

// ---- SELECT CONDITION ----
function selectCond(cond) {
  selectedCond = cond;
  document.querySelectorAll(".cond-btn").forEach(b => b.classList.remove("selected"));
  const map = {
    "Good":         ".good-btn",
    "Fair":         ".fair-btn",
    "Poor":         ".poor-btn",
    "Critical":     ".crit-btn",
    "Not Inspected":".ni-btn"
  };
  const btn = document.querySelector(map[cond]);
  if (btn) btn.classList.add("selected");
}

// ---- CLOSE POPUP ----
function closePopup() {
  document.getElementById("overlay").classList.add("hidden");
  document.getElementById("popup").classList.add("hidden");
  activeBayId  = "";
  selectedCond = "";
}

// ---- SAVE BAY ----
function saveBay() {
  if (!selectedCond) {
    alert("Please select a condition before saving.");
    return;
  }
  const inspector = document.getElementById("input-inspector").value.trim() || "Unknown";
  const workOrder = document.getElementById("input-wo").value.trim();
  const notes     = document.getElementById("input-notes").value.trim();
  const today     = new Date().toLocaleDateString("en-US");

  bayData[activeBayId].condition = selectedCond;
  bayData[activeBayId].lastDate  = today;
  bayData[activeBayId].inspector = inspector;
  bayData[activeBayId].workOrder = workOrder;
  bayData[activeBayId].notes     = notes;

  saveData();

  const cell = document.getElementById("cell-" + activeBayId);
  if (cell) applyCondColor(cell, selectedCond);

  updateSummary();
  closePopup();
}

// ---- EXPORT CSV ----
function exportCSV() {
  const headers = ["Bay ID","Row","Column","Section","Condition",
                   "Last Inspection","Inspector","Work Order","Notes"];
  const rows = Object.values(bayData).map(b =>
    [b.id, b.row, b.col, b.section, b.condition,
     b.lastDate, b.inspector, b.workOrder, b.notes]
    .map(v => `"${(v || "").toString().replace(/"/g,'""')}"`)
    .join(",")
  );
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "LAP_Roof_Tracker_" + new Date().toISOString().slice(0,10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---- RESET ALL ----
function resetAll() {
  if (!confirm("Reset ALL bay data back to Not Inspected?\n\nThis cannot be undone.")) return;
  Object.keys(bayData).forEach(id => {
    bayData[id].condition = "Not Inspected";
    bayData[id].lastDate  = "";
    bayData[id].inspector = "";
    bayData[id].workOrder = "";
    bayData[id].notes     = "";
    const cell = document.getElementById("cell-" + id);
    if (cell) applyCondColor(cell, "Not Inspected");
  });
  saveData();
  updateSummary();
}

// ---- CLOSE ON OVERLAY CLICK ----
document.getElementById("overlay").addEventListener("click", closePopup);

// ---- START ----
init();
