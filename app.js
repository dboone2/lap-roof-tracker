// ============================================
// LAP ROOF GRID TRACKER
// app.js
// ============================================

const ROWS = [
  { label: "GG",  section: "Upper Roof" },
  { label: "FF",  section: "Upper Roof" },
  { label: "EE",  section: "Upper Roof" },
  { label: "DD",  section: "Upper Roof" },
  { label: "A",   section: "Main Body"  },
  { label: "A1",  section: "Main Body"  },
  { label: "A3",  section: "Main Body"  },
  { label: "B",   section: "Main Body"  },
  { label: "B.6", section: "Main Body"  },
  { label: "C",   section: "Main Body"  },
  { label: "D",   section: "Main Body"  },
  { label: "D1",  section: "Main Body"  },
  { label: "E",   section: "Main Body"  },
  { label: "F",   section: "Main Body"  },
  { label: "G",   section: "Main Body"  },
  { label: "H",   section: "Main Body"  },
  { label: "J",   section: "Main Body"  },
  { label: "K",   section: "Main Body"  },
  { label: "L",   section: "Main Body"  },
  { label: "M",   section: "Main Body"  },
  { label: "N",   section: "Main Body"  },
  { label: "P",   section: "Main Body"  },
  { label: "Q",   section: "Main Body"  },
];

const COLS = 46;
const STORAGE_KEY = "lapRoofData";

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
      for (let c = 1; c <= COLS; c++) {
        const id = makeBayId(row.label, c);
        bayData[id] = {
          id: id,
          row: row.label,
          col: c,
          section: row.section,
          condition: "Not Inspected",
          lastDate: "",
          inspector: "",
          workOrder: "",
          notes: ""
        };
      }
    });
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bayData));
}

function makeBayId(rowLabel, col) {
  return rowLabel + "-" + String(col).padStart(3, "0");
}

// ---- BUILD GRID ----
function buildGrid() {
  const thead = document.getElementById("grid-header");
  const tbody = document.getElementById("grid-body");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // Header row — column numbers
  const headerRow = document.createElement("tr");
  const cornerTh = document.createElement("th");
  cornerTh.className = "row-header-top";
  cornerTh.textContent = "ROW / COL";
  headerRow.appendChild(cornerTh);
  for (let c = 1; c <= COLS; c++) {
    const th = document.createElement("th");
    th.textContent = String(c).padStart(3, "0");
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);

  // Data rows
  let lastSection = ROWS[0].section;
  ROWS.forEach(row => {

    // Divider between Upper Roof and Main Body
    if (lastSection !== row.section) {
      const divRow = document.createElement("tr");
      divRow.className = "divider";
      for (let c = 0; c <= COLS; c++) {
        divRow.appendChild(document.createElement("td"));
      }
      tbody.appendChild(divRow);
      lastSection = row.section;
    }

    const tr = document.createElement("tr");

    // Row label cell
    const labelTd = document.createElement("td");
    labelTd.className = "row-label" + (row.section === "Upper Roof" ? " upper-roof" : "");
    labelTd.textContent = row.label;
    tr.appendChild(labelTd);

    // Bay cells
    for (let c = 1; c <= COLS; c++) {
      const id = makeBayId(row.label, c);
      const td = document.createElement("td");
      td.className = "bay-cell";
      td.id = "cell-" + id;
      td.textContent = id;
      td.title = id + " — " + row.section;
      td.onclick = () => openPopup(id);
      applyCondColor(td, bayData[id] ? bayData[id].condition : "Not Inspected");
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });
}

// ---- APPLY COLOR TO CELL ----
function applyCondColor(td, condition) {
  td.classList.remove("cond-good", "cond-fair", "cond-poor", "cond-critical", "cond-ni");
  switch (condition) {
    case "Good":         td.classList.add("cond-good");     break;
    case "Fair":         td.classList.add("cond-fair");     break;
    case "Poor":         td.classList.add("cond-poor");     break;
    case "Critical":     td.classList.add("cond-critical"); break;
    default:             td.classList.add("cond-ni");       break;
  }
}

// ---- UPDATE SUMMARY COUNTS ----
function updateSummary() {
  let total = 0, ni = 0, good = 0, fair = 0, poor = 0, crit = 0;
  Object.values(bayData).forEach(b => {
    total++;
    switch (b.condition) {
      case "Good":         good++; break;
      case "Fair":         fair++; break;
      case "Poor":         poor++; break;
      case "Critical":     crit++; break;
      default:             ni++;   break;
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
  activeBayId = bayId;
  selectedCond = "";
  const bay = bayData[bayId];

  document.getElementById("popup-bay-id").textContent    = bayId;
  document.getElementById("popup-section").textContent   = bay.section;
  document.getElementById("popup-current-cond").textContent = bay.condition;
  document.getElementById("popup-last-date").textContent = bay.lastDate || "Never";
  document.getElementById("popup-last-inspector").textContent = bay.inspector || "-";
  document.getElementById("input-inspector").value = bay.inspector || "";
  document.getElementById("input-wo").value        = bay.workOrder || "";
  document.getElementById("input-notes").value     = bay.notes || "";

  // Clear selected state on buttons
  document.querySelectorAll(".cond-btn").forEach(b => b.classList.remove("selected"));

  document.getElementById("overlay").classList.remove("hidden");
  document.getElementById("popup").classList.remove("hidden");
}

// ---- SELECT CONDITION BUTTON ----
function selectCond(cond) {
  selectedCond = cond;
  document.querySelectorAll(".cond-btn").forEach(b => b.classList.remove("selected"));
  const map = {
    "Good": ".good-btn",
    "Fair": ".fair-btn",
    "Poor": ".poor-btn",
    "Critical": ".crit-btn",
    "Not Inspected": ".ni-btn"
  };
  const btn = document.querySelector(map[cond]);
  if (btn) btn.classList.add("selected");
}

// ---- CLOSE POPUP ----
function closePopup() {
  document.getElementById("overlay").classList.add("hidden");
  document.getElementById("popup").classList.add("hidden");
  activeBayId = "";
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
  const headers = ["Bay ID","Row","Column","Section","Condition","Last Inspection","Inspector","Work Order","Notes"];
  const rows = Object.values(bayData).map(b => [
    b.id, b.row, b.col, b.section, b.condition,
    b.lastDate, b.inspector, b.workOrder, b.notes
  ].map(v => `"${(v || "").toString().replace(/"/g, '""')}"`).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
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
