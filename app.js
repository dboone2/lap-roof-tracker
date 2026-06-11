// ============================================
// LAP ROOF TRACKER — app.js v3
// Main Building — Severity Based Tracking
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

const STORAGE_KEY = "lapRoofData_v3";

let bayData        = {};
let selectedSeverity = "";
let isRepaired     = false;
let activeBayId    = "";
let hideRepaired   = false;

// ---- INIT ----
function init() {
  loadData();
  buildGrid();
  updateSummary();
}

// ---- CREATE EMPTY BAY ----
function createEmptyBay(id, row, col, section) {
  return {
    id,
    row,
    col,
    section,
    currentStatus:   "Not Inspected",
    currentSeverity: "",
    history:         []
  };
}

// ---- LOAD DATA ----
function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    bayData = JSON.parse(stored);
  } else {
    ROWS.forEach(row => {
      COLS.forEach(col => {
        const id = row.label + "-" + col;
        bayData[id] = createEmptyBay(id, row.label, col, row.section);
      });
    });
    saveData();
  }
}

// ---- SAVE DATA ----
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bayData));
}

// ---- BUILD GRID ----
function buildGrid() {
  const thead = document.getElementById("grid-header");
  const tbody = document.getElementById("grid-body");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // Header row
  const headerRow = document.createElement("tr");
  const cornerTh  = document.createElement("th");
  cornerTh.className   = "row-header-top";
  cornerTh.textContent = "ROW / COL";
  headerRow.appendChild(cornerTh);

  COLS.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    if (col === "01") th.classList.add("col-divider");
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  // Data rows
  ROWS.forEach(row => {
    const tr = document.createElement("tr");

    const labelTd = document.createElement("td");
    labelTd.className   = "row-label";
    labelTd.textContent = row.label;
    tr.appendChild(labelTd);

    COLS.forEach(col => {
      const id = row.label + "-" + col;
      const td = document.createElement("td");
      td.className = "bay-cell";
      td.id        = "cell-" + id;
      td.title     = id + " — " + row.section;
      if (col === "01") td.classList.add("col-divider");
      td.onclick   = () => openPopup(id);
      applyCell(td, bayData[id]);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// ---- APPLY CELL DISPLAY ----
function applyCell(td, bay) {
  td.classList.remove(
    "cond-ni","cond-s1","cond-s2","cond-s3",
    "cond-s4","cond-s5","cond-repaired"
  );

  if (bay.currentStatus === "Repaired") {
    td.classList.add("cond-repaired");
    td.innerHTML   = bay.id + "<br><small>" + bay.currentSeverity + " ✅</small>";
    td.style.opacity = hideRepaired ? "0.15" : "1";
  } else if (bay.currentSeverity) {
    td.classList.add("cond-" + bay.currentSeverity.toLowerCase());
    td.innerHTML   = bay.id + "<br><small>" + bay.currentSeverity + "</small>";
    td.style.opacity = "1";
  } else {
    td.classList.add("cond-ni");
    td.textContent = bay.id;
    td.style.opacity = "1";
  }
}

// ---- UPDATE SINGLE CELL ----
function updateCell(bayId) {
  const td = document.getElementById("cell-" + bayId);
  if (td) applyCell(td, bayData[bayId]);
}

// ---- UPDATE SUMMARY COUNTS ----
function updateSummary() {
  let total = 0, ni = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0, repaired = 0;

  Object.values(bayData).forEach(b => {
    total++;
    if (b.currentStatus === "Repaired") { repaired++; return; }
    switch (b.currentSeverity) {
      case "S1": s1++; break;
      case "S2": s2++; break;
      case "S3": s3++; break;
      case "S4": s4++; break;
      case "S5": s5++; break;
      default:   ni++; break;
    }
  });

  document.getElementById("count-total").textContent    = total;
  document.getElementById("count-ni").textContent       = ni;
  document.getElementById("count-s1").textContent       = s1;
  document.getElementById("count-s2").textContent       = s2;
  document.getElementById("count-s3").textContent       = s3;
  document.getElementById("count-s4").textContent       = s4;
  document.getElementById("count-s5").textContent       = s5;
  document.getElementById("count-repaired").textContent = repaired;
}

// ---- OPEN POPUP ----
function openPopup(bayId) {
  activeBayId      = bayId;
  selectedSeverity = "";
  isRepaired       = false;

  const bay = bayData[bayId];

  document.getElementById("popup-bay-id").textContent      = bayId;
  document.getElementById("popup-section").textContent     = bay.section;

  const statusText = bay.currentStatus +
    (bay.currentSeverity ? " (" + bay.currentSeverity + ")" : "");
  document.getElementById("popup-current-status").textContent = statusText;

  const lastEntry = bay.history.length > 0
    ? bay.history[bay.history.length - 1]
    : null;

  document.getElementById("popup-last-date").textContent =
    lastEntry ? lastEntry.date : "Never";
  document.getElementById("popup-last-inspector").textContent =
    lastEntry ? lastEntry.inspector : "-";

  // Reset form
  document.getElementById("input-inspector").value = "";
  document.getElementById("input-wo").value        = "";
  document.getElementById("input-notes").value     = "";
  document.getElementById("input-photo").value     = "";

  // Reset severity buttons
  document.querySelectorAll(".sev-btn").forEach(b => b.classList.remove("selected"));

  // Hide repaired section and reset its button
  document.getElementById("repaired-section").classList.add("hidden");
  const repairedBtn = document.getElementById("repaired-btn");
  repairedBtn.classList.remove("active");
  repairedBtn.textContent = "Mark as Repaired";

  // Build history log
  buildHistoryLog(bay);

  document.getElementById("overlay").classList.remove("hidden");
  document.getElementById("popup").classList.remove("hidden");
}

// ---- SELECT SEVERITY ----
function selectSeverity(sev) {
  selectedSeverity = sev;
  isRepaired       = false;

  document.querySelectorAll(".sev-btn").forEach(b => b.classList.remove("selected"));
  document.getElementById("sev-btn-" + sev).classList.add("selected");

  // Reveal repaired toggle and reset it
  document.getElementById("repaired-section").classList.remove("hidden");
  const repairedBtn = document.getElementById("repaired-btn");
  repairedBtn.classList.remove("active");
  repairedBtn.textContent = "Mark as Repaired";
}

// ---- TOGGLE REPAIRED STATUS INSIDE POPUP ----
function toggleRepairedStatus() {
  isRepaired = !isRepaired;
  const btn  = document.getElementById("repaired-btn");
  if (isRepaired) {
    btn.classList.add("active");
    btn.textContent = "✅ Marked as Repaired — Click to Undo";
  } else {
    btn.classList.remove("active");
    btn.textContent = "Mark as Repaired";
  }
}

// ---- BUILD HISTORY LOG ----
function buildHistoryLog(bay) {
  const log = document.getElementById("history-log");

  if (!bay.history || bay.history.length === 0) {
    log.innerHTML = "<p class='no-history'>No inspection history yet.</p>";
    return;
  }

  const entries = [...bay.history].reverse();

  log.innerHTML = entries.map(e => {
    const isRep      = e.status === "Repaired";
    const sevClass   = e.severity ? "sev-" + e.severity.toLowerCase() : "";
    const woHTML     = e.workOrder
      ? `<span>WO#: ${e.workOrder}</span>` : "";
    const notesHTML  = e.notes
      ? `<div class="hist-notes">${e.notes}</div>` : "";
    const photoHTML  = e.photoLink
      ? `<div class="hist-photo">
           <a href="${e.photoLink}" target="_blank" rel="noopener">📷 View Photo</a>
         </div>` : "";

    return `
      <div class="history-entry ${isRep ? 'hist-repaired' : 'hist-issue'}">
        <div class="hist-header">
          <span class="hist-date">${e.date}</span>
          <span class="hist-severity ${sevClass}">${e.severity || ""}</span>
          <span class="hist-status ${isRep ? 'repaired' : ''}">${e.status}</span>
        </div>
        <div class="hist-details">
          <span>Inspector: ${e.inspector}</span>
          ${woHTML}
        </div>
        ${notesHTML}
        ${photoHTML}
      </div>
    `;
  }).join("");
}

// ---- SAVE BAY ----
function saveBay() {
  if (!selectedSeverity) {
    alert("Please select a severity level (S1 – S5) before saving.");
    return;
  }

  const inspector = document.getElementById("input-inspector").value.trim() || "Unknown";
  const workOrder  = document.getElementById("input-wo").value.trim();
  const notes      = document.getElementById("input-notes").value.trim();
  const photoLink  = document.getElementById("input-photo").value.trim();
  const today      = new Date().toLocaleDateString("en-US");
  const status     = isRepaired ? "Repaired" : "Issue";

  const entry = { date: today, inspector, severity: selectedSeverity,
                  status, workOrder, notes, photoLink };

  if (!bayData[activeBayId].history) bayData[activeBayId].history = [];
  bayData[activeBayId].history.push(entry);
  bayData[activeBayId].currentSeverity = selectedSeverity;
  bayData[activeBayId].currentStatus   = status;

  saveData();
  updateCell(activeBayId);
  updateSummary();
  closePopup();
}

// ---- TOGGLE REPAIRED VIEW — HEADER BUTTON ----
function toggleRepairedView() {
  hideRepaired    = !hideRepaired;
  const btn       = document.getElementById("toggle-repaired-btn");
  btn.textContent = hideRepaired ? "Show Repaired Bays" : "Hide Repaired Bays";
  hideRepaired ? btn.classList.add("active") : btn.classList.remove("active");
  Object.keys(bayData).forEach(id => updateCell(id));
}

// ---- CLOSE POPUP ----
function closePopup() {
  document.getElementById("overlay").classList.add("hidden");
  document.getElementById("popup").classList.add("hidden");
  activeBayId      = "";
  selectedSeverity = "";
  isRepaired       = false;
}

// ---- EXPORT CSV ----
function exportCSV() {
  const headers = [
    "Bay ID","Row","Column","Section",
    "Current Status","Current Severity",
    "Entry #","Date","Inspector","Severity",
    "Status","Work Order","Notes","Photo Link"
  ];

  const rows = [];
  Object.values(bayData).forEach(b => {
    if (b.history && b.history.length > 0) {
      b.history.forEach((h, i) => {
        rows.push([
          b.id, b.row, b.col, b.section,
          b.currentStatus, b.currentSeverity,
          i + 1, h.date, h.inspector, h.severity,
          h.status, h.workOrder, h.notes, h.photoLink
        ]);
      });
    } else {
      rows.push([
        b.id, b.row, b.col, b.section,
        "Not Inspected", "",
        "", "", "", "", "", "", "", ""
      ]);
    }
  });

  const csv = [
    headers.join(","),
    ...rows.map(r =>
      r.map(v => `"${(v || "").toString().replace(/"/g, '""')}"`)
       .join(",")
    )
  ].join("\n");

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
  if (!confirm(
    "Reset ALL bay data back to Not Inspected?\n\n" +
    "This will erase all history and cannot be undone."
  )) return;

  ROWS.forEach(row => {
    COLS.forEach(col => {
      const id = row.label + "-" + col;
      bayData[id] = createEmptyBay(id, row.label, col, row.section);
    });
  });

  saveData();
  buildGrid();
  updateSummary();
}

// ---- CLOSE ON OVERLAY CLICK ----
document.getElementById("overlay").addEventListener("click", closePopup);

// ---- START ----
init();
