// ============================================================
// LAP ROOF TRACKER — EXCEL / CSV IMPORT
// Column Order: Area | Bay | Building | Working On |
//               Call In Date | Severity | Repair Date |
//               Contractor | Tarped | Comments
// ============================================================

let importedRows  = [];
let validatedRows = [];

// ── CONSTANTS ────────────────────────────────────────────────
const VALID_AREAS      = ["Body","Paint","Final","Facilities"];
const VALID_SEVERITIES = ["S1","S2","S3","S4","S5","REP"];

const CONTRACTOR_MAP = {
    "schreiber"     : "Schriber",
    "schriber"      : "Schriber",
    "screiber"      : "Schriber",
    "royal"         : "Royal",
    "tecta"         : "Techta",
    "techta"        : "Techta",
    "tecta america" : "Techta"
};

const SEVERITY_MAP = {
    "1": "S1", "2": "S2", "3": "S3",
    "4": "S4", "5": "S5",
    "s1": "S1", "s2": "S2", "s3": "S3",
    "s4": "S4", "s5": "S5",
    "rep": "REP", "repaired": "REP"
};

const CHANGE = {
    NEW        : "🆕 New Record",
    SEV_CHANGE : "⚠️ Severity Changed",
    STATUS_REP : "✅ Now Repaired",
    NOTES_ADDED: "📝 Notes Added",
    NO_CHANGE  : "— No Change"
};

// ── FILE INPUT LISTENERS ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("excel-file-input");
    const dropZone  = document.getElementById("drop-zone");

    fileInput.addEventListener("change", (e) => {
        if (e.target.files[0]) processFile(e.target.files[0]);
    });

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drag-over");
    });
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        if (e.dataTransfer.files[0])
            processFile(e.dataTransfer.files[0]);
    });
});

// ── PROCESS FILE ─────────────────────────────────────────────
function processFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
        alert("Please upload an Excel (.xlsx, .xls) or CSV file");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data     = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {
                type     : "array",
                cellDates: true,
                raw      : false
            });

            const sheet    =
                workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, {
                raw    : false,
                dateNF : "mm/dd/yyyy",
                defval : ""
            });

            if (jsonData.length === 0) {
                alert("The file appears to be empty.");
                return;
            }

            importedRows = jsonData;
            validateAndPreview(jsonData);
        } catch (err) {
            console.error("Parse error:", err);
            alert("Could not read the file. " +
                  "Please check the format.");
        }
    };
    reader.readAsArrayBuffer(file);
}

// ── NORMALIZE HELPERS ─────────────────────────────────────────
function normalizeSeverity(raw) {
    if (!raw) return "";
    const key = String(raw).trim().toLowerCase();
    return SEVERITY_MAP[key] || String(raw).trim().toUpperCase();
}

function isRepaired(comments) {
    if (!comments) return false;
    return /\brepaired\b/i.test(comments) ||
           /\brepared\b/i.test(comments)  ||
           /\brepaied\b/i.test(comments);
}

function normalizeContractor(raw) {
    if (!raw) return "";
    const key = String(raw).trim().toLowerCase();
    return CONTRACTOR_MAP[key] || raw.trim();
}

// ── FLEXIBLE HEADER MAP ───────────────────────────────────────
function buildHeaderMap(firstRow) {
    const normalize = (s) =>
        String(s).toLowerCase()
                 .replace(/\s+/g, "")
                 .replace(/[^a-z]/g, "");
    const map = {};
    Object.keys(firstRow).forEach(k => { map[normalize(k)] = k; });
    return map;
}

function mapRow(row, headerMap) {
    const get = (...keys) => {
        for (const k of keys) {
            if (headerMap[k] !== undefined) {
                return String(row[headerMap[k]] || "").trim();
            }
        }
        return "";
    };

    return {
        area       : get("area"),
        bay        : get("bay","baylocation","bays","location"),
        building   : get("building"),
        workingOn  : get("currentlybeingworkedon",
                         "workedon","working"),
        callInDate : get("callindate","calldate",
                         "datecalledin","date"),
        severity   : get("severity"),
        repairDate : get("repairdate","daterepaired"),
        contractor : get("roofingcontractor",
                         "contractor","company"),
        tarped     : get("tarped","tarp"),
        comments   : get("comments","notes","comment",
                         "description","possiblesource","source"),
        _status    : "",
        _changes   : [],
        _rowIndex  : -1
    };
}

// ── FIND MATCHING EXISTING LEAK ───────────────────────────────
// Match on Bay + Building + Call In Date
function findExistingLeak(mapped) {
    if (!allLeaks || allLeaks.length === 0) return null;
    return allLeaks.find(l =>
        l.bay.trim().toLowerCase() ===
            mapped.bay.trim().toLowerCase() &&
        l.building.trim().toLowerCase() ===
            mapped.building.trim().toLowerCase() &&
        l.callInDate === mapped.callInDate
    ) || null;
}

// ── VALIDATE AND PREVIEW ─────────────────────────────────────
function validateAndPreview(rows) {
    validatedRows = [];
    const warnings = [];

    let countNew      = 0;
    let countChanged  = 0;
    let countRepaired = 0;
    let countNoChange = 0;

    const headerMap = buildHeaderMap(rows[0]);

    rows.forEach((row, i) => {
        const rowNum = i + 2;
        const mapped = mapRow(row, headerMap);

        // ── 1. NORMALIZE SEVERITY ─────────────────────────────
        mapped.severity = normalizeSeverity(mapped.severity);

        // ── 2. DETECT REPAIRED FROM COMMENTS ─────────────────
        if (isRepaired(mapped.comments) &&
            mapped.severity !== "REP") {
            mapped._changes.push(
                "Status changed to REP (detected in comments)");
            mapped.severity = "REP";
        }

        // ── 3. NORMALIZE CONTRACTOR ───────────────────────────
        const rawContractor = mapped.contractor;
        mapped.contractor   = normalizeContractor(rawContractor);
        if (rawContractor &&
            rawContractor.trim() !== mapped.contractor) {
            mapped._changes.push(
                `Contractor: "${rawContractor}" 
                 → "${mapped.contractor}"`);
        }

        // ── 4. CHANGE DETECTION ───────────────────────────────
        const existing = findExistingLeak(mapped);

        if (!existing) {
            mapped._rowIndex = -1;
            mapped._status   = CHANGE.NEW;
            countNew++;
        } else {
            mapped._rowIndex   = existing.index;
            const rowChanges   = [...mapped._changes];

            if (existing.severity !== mapped.severity) {
                rowChanges.push(
                    `Severity: ${existing.severity || "blank"} 
                     → ${mapped.severity}`);
            }
            if (mapped.comments &&
                mapped.comments !== existing.comments) {
                rowChanges.push("Notes updated");
            }
            if (mapped.repairDate &&
                mapped.repairDate !== existing.repairDate) {
                rowChanges.push(
                    `Repair date: ${existing.repairDate || "blank"} 
                     → ${mapped.repairDate}`);
            }

            if (rowChanges.length > 0) {
                mapped._changes = rowChanges;
                if (mapped.severity === "REP" &&
                    existing.severity !== "REP") {
                    mapped._status = CHANGE.STATUS_REP;
                    countRepaired++;
                } else if (existing.severity !== mapped.severity) {
                    mapped._status = CHANGE.SEV_CHANGE;
                    countChanged++;
                } else {
                    mapped._status = CHANGE.NOTES_ADDED;
                    countChanged++;
                }
            } else {
                mapped._status = CHANGE.NO_CHANGE;
                countNoChange++;
            }
        }

        // ── 5. BASIC VALIDATION ───────────────────────────────
        if (!mapped.bay) {
            warnings.push(
                `Row ${rowNum}: Missing BAY — ` +
                `please add the Bay column (A09, B12 etc)`);
        }
        if (!mapped.callInDate) {
            warnings.push(
                `Row ${rowNum} (Bay: ${mapped.bay}): ` +
                `Missing Call In Date`);
        }
        if (mapped.severity &&
            !VALID_SEVERITIES.includes(mapped.severity)) {
            warnings.push(
                `Row ${rowNum} (Bay: ${mapped.bay}): ` +
                `Unrecognized severity "${mapped.severity}"`);
        }

        validatedRows.push(mapped);
    });

    // ── SUMMARY ───────────────────────────────────────────────
    document.getElementById("preview-count").innerHTML = `
        <strong>${validatedRows.length}</strong> records
        &nbsp;|&nbsp;
        🆕 <strong>${countNew}</strong> New
        &nbsp;|&nbsp;
        ⚠️ <strong>${countChanged}</strong> Changed
        &nbsp;|&nbsp;
        ✅ <strong>${countRepaired}</strong> Now Repaired
        &nbsp;|&nbsp;
        — <strong>${countNoChange}</strong> No Change
    `;

    // ── WARNINGS ──────────────────────────────────────────────
    const warnSection =
        document.getElementById("import-warnings");
    const warnList    =
        document.getElementById("warnings-list");

    if (warnings.length > 0) {
        warnSection.classList.remove("hidden");
        warnList.innerHTML =
            warnings.map(w => `<li>${w}</li>`).join("");
    } else {
        warnSection.classList.add("hidden");
    }

    // ── PREVIEW TABLE ─────────────────────────────────────────
    const tbody = document.getElementById("preview-tbody");
    tbody.innerHTML = validatedRows.map((r, i) => {
        const changeClass = getChangeClass(r._status);
        const changeTip   = r._changes.join(" | ");
        return `
        <tr class="${getSeverityClass(r.severity)} ${changeClass}">
            <td>${i + 1}</td>
            <td>${r.area}</td>
            <td><strong>${r.bay}</strong></td>
            <td>${r.building}</td>
            <td>${r.workingOn}</td>
            <td>${r.callInDate}</td>
            <td>
                <span class="severity-badge
                      ${getSeverityClass(r.severity)}">
                    ${r.severity || "—"}
                </span>
            </td>
            <td>${r.repairDate}</td>
            <td>${r.contractor}</td>
            <td>${r.tarped}</td>
            <td class="comments-cell" title="${r.comments}">
                ${r.comments}
            </td>
            <td>
                <span class="change-badge ${changeClass}"
                      title="${changeTip}">
                    ${r._status}
                </span>
                ${changeTip
                    ? `<div class="change-details">
                           ${changeTip}
                       </div>`
                    : ""}
            </td>
        </tr>`;
    }).join("");

    document.getElementById("import-preview")
            .classList.remove("hidden");
    document.getElementById("drop-zone")
            .classList.add("hidden");
}

// ── CHANGE CLASS HELPER ───────────────────────────────────────
function getChangeClass(status) {
    if (status === CHANGE.NEW)         return "change-new";
    if (status === CHANGE.STATUS_REP)  return "change-repaired";
    if (status === CHANGE.SEV_CHANGE)  return "change-severity";
    if (status === CHANGE.NOTES_ADDED) return "change-notes";
    return "change-none";
}

// ── CONFIRM IMPORT ────────────────────────────────────────────
async function confirmImport() {
    if (validatedRows.length === 0) return;

    document.getElementById("import-preview")
            .classList.add("hidden");
    document.getElementById("import-progress")
            .classList.remove("hidden");

    const total       = validatedRows.length;
    let   uploaded    = 0;
    let   updated     = 0;
    let   skipped     = 0;
    let   failed      = 0;
    const BATCH_SIZE  = 5;
    const progressBar =
        document.getElementById("progress-bar");
    const progressText =
        document.getElementById("progress-text");

    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = validatedRows.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (row) => {
            try {
                const rowData = [
                    row.area,
                    row.bay,
                    row.building,
                    row.workingOn,
                    row.callInDate,
                    row.severity,
                    row.repairDate,
                    row.contractor,
                    row.tarped,
                    row.comments
                ];

                if (row._status === CHANGE.NO_CHANGE) {
                    skipped++;
                } else if (row._rowIndex >= 0) {
                    await updateLeakRow(row._rowIndex, rowData);
                    updated++;
                } else {
                    await addLeakRow(rowData);
                    uploaded++;
                }
            } catch (e) {
                console.error("Row error:", e);
                failed++;
            }
        }));

        const done = uploaded + updated + skipped + failed;
        const pct  = Math.round((done / total) * 100);
        progressBar.style.width  = `${pct}%`;
        progressText.textContent =
            `${done} of ${total} — ` +
            `${uploaded} added, ${updated} updated, ` +
            `${skipped} skipped, ${failed} failed`;

        if (i + BATCH_SIZE < total) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    await loadLeaks();

    document.getElementById("import-progress")
            .classList.add("hidden");
    document.getElementById("import-complete")
            .classList.remove("hidden");

    document.getElementById("complete-text").innerHTML = `
        <strong>${uploaded}</strong> new records added
        &nbsp;|&nbsp;
        <strong>${updated}</strong> records updated
        &nbsp;|&nbsp;
        <strong>${skipped}</strong> unchanged (skipped)
        &nbsp;|&nbsp;
        <strong>${failed}</strong> failed
    `;
}

// ── CLEAR IMPORT ──────────────────────────────────────────────
function clearImport() {
    importedRows  = [];
    validatedRows = [];

    document.getElementById("excel-file-input").value = "";
    document.getElementById("import-preview")
            .classList.add("hidden");
    document.getElementById("import-progress")
            .classList.add("hidden");
    document.getElementById("import-complete")
            .classList.add("hidden");
    document.getElementById("drop-zone")
            .classList.remove("hidden");
    document.getElementById("import-warnings")
            .classList.add("hidden");
    document.getElementById("preview-tbody").innerHTML = "";
    document.getElementById("progress-bar").style.width = "0%";
}
