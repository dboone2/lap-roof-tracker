// ============================================================
// LAP ROOF TRACKER — EXCEL IMPORT
// ============================================================

let importedRows   = [];
let validatedRows  = [];

const VALID_AREAS       = ["Body", "Paint", "Final", "Facilities"];
const VALID_SEVERITIES  = ["S1","S2","S3","S4","S5","REP"];
const VALID_CONTRACTORS = ["Schriber","Royal","Techta"];

// ── FILE INPUT LISTENERS ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

    const fileInput = document.getElementById("excel-file-input");
    const dropZone  = document.getElementById("drop-zone");

    // Browse button
    fileInput.addEventListener("change", (e) => {
        if (e.target.files[0]) processFile(e.target.files[0]);
    });

    // Drag and drop
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
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });
});

// ── PROCESS FILE ─────────────────────────────────────────────
function processFile(file) {
    const validTypes = [
        "application/vnd.openxmlformats-officedocument"
            + ".spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv"
    ];

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
        alert("Please upload an Excel file (.xlsx, .xls) or CSV file");
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data     = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });

            // Use first sheet
            const sheetName = workbook.SheetNames[0];
            const sheet     = workbook.Sheets[sheetName];

            // Convert to JSON — first row as headers
            const jsonData  = XLSX.utils.sheet_to_json(sheet, {
                raw:        false,
                dateNF:     "mm/dd/yyyy",
                defval:     ""
            });

            if (jsonData.length === 0) {
                alert("The Excel file appears to be empty.");
                return;
            }

            importedRows = jsonData;
            validateAndPreview(jsonData);

        } catch (err) {
            console.error("Parse error:", err);
            alert("Could not read the file. Please check the format.");
        }
    };

    reader.readAsArrayBuffer(file);
}

// ── VALIDATE AND PREVIEW ─────────────────────────────────────
function validateAndPreview(rows) {
    validatedRows = [];
    const warnings = [];

    // Map column headers flexibly
    // handles variations in spacing/caps
    const headerMap = buildHeaderMap(rows[0]);

    rows.forEach((row, i) => {
        const rowNum    = i + 2; // Excel row number (1=header)
        const mapped    = mapRow(row, headerMap);
        let   rowIssues = [];

        // Validate Area
        if (!mapped.area) {
            rowIssues.push(`Row ${rowNum}: Missing AREA`);
            mapped._status = "⚠️ Missing Area";
        } else if (!VALID_AREAS.includes(capitalize(mapped.area))) {
            rowIssues.push(
                `Row ${rowNum}: Unknown area "${mapped.area}" 
                 — will import as-is`);
            mapped._status = "⚠️ Unknown Area";
        }

        // Validate Severity
        if (!mapped.severity) {
            rowIssues.push(`Row ${rowNum}: Missing Severity`);
            mapped._status = (mapped._status || "") + " ⚠️ Missing Severity";
        } else if (!VALID_SEVERITIES.includes(
                        mapped.severity.toUpperCase())) {
            rowIssues.push(
                `Row ${rowNum}: Unknown severity "${mapped.severity}"`);
            mapped._status = "⚠️ Unknown Severity";
        } else {
            mapped.severity = mapped.severity.toUpperCase();
        }

        // Validate Contractor
        if (mapped.contractor &&
            !VALID_CONTRACTORS.includes(capitalize(mapped.contractor))) {
            rowIssues.push(
                `Row ${rowNum}: Unknown contractor "${mapped.contractor}" 
                 — will import as-is`);
        }

        // Normalize area capitalization
        if (mapped.area) {
            mapped.area = capitalize(mapped.area);
        }

        if (!mapped._status) mapped._status = "✅ Ready";

        warnings.push(...rowIssues);
        validatedRows.push(mapped);
    });

    // Show warnings
    const warnSection = document.getElementById("import-warnings");
    const warnList    = document.getElementById("warnings-list");

    if (warnings.length > 0) {
        warnSection.classList.remove("hidden");
        warnList.innerHTML = warnings.map(w =>
            `<li>${w}</li>`).join("");
    } else {
        warnSection.classList.add("hidden");
    }

    // Show preview count
    document.getElementById("preview-count").textContent =
        `${validatedRows.length} records found — 
         review below then click Import`;

    // Render preview table
    const tbody = document.getElementById("preview-tbody");
    tbody.innerHTML = validatedRows.map((r, i) => `
        <tr class="${getSeverityClass(r.severity)}">
            <td>${i + 1}</td>
            <td>${r.area}</td>
            <td>${r.building}</td>
            <td>${r.workingOn}</td>
            <td>${r.callInDate}</td>
            <td>
                <span class="severity-badge 
                      ${getSeverityClass(r.severity)}">
                    ${r.severity}
                </span>
            </td>
            <td>${r.repairDate}</td>
            <td>${r.contractor}</td>
            <td>${r.tarped}</td>
            <td class="comments-cell">${r.comments}</td>
            <td>${r._status}</td>
        </tr>
    `).join("");

    // Show preview, hide upload box
    document.getElementById("import-preview").classList.remove("hidden");
    document.getElementById("drop-zone").classList.add("hidden");
}

// ── FLEXIBLE HEADER MAPPING ───────────────────────────────────
function buildHeaderMap(firstRow) {
    // Normalize: lowercase, remove spaces
    const normalize = (s) => String(s).toLowerCase()
        .replace(/\s+/g, "").replace(/[^a-z]/g, "");

    const map = {};
    Object.keys(firstRow).forEach(key => {
        map[normalize(key)] = key;
    });
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
        area:        get("area"),
        building:    get("building"),
        workingOn:   get("currentlybeingworkedon","workedon","working"),
        callInDate:  get("callindate","calldate","datecalledin","date"),
        severity:    get("severity"),
        repairDate:  get("repairdate","daterepaired"),
        contractor:  get("roofingcontractor","contractor","company"),
        tarped:      get("tarped","tarp"),
        comments:    get("comments","notes","comment","description",
                         "possiblesource","source"),
        _status:     ""
    };
}

function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── CONFIRM IMPORT ────────────────────────────────────────────
async function confirmImport() {
    if (validatedRows.length === 0) return;

    // Hide preview, show progress
    document.getElementById("import-preview").classList.add("hidden");
    document.getElementById("import-progress").classList.remove("hidden");

    const total      = validatedRows.length;
    let   uploaded   = 0;
    let   failed     = 0;
    const progressBar  = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");

    // Upload in batches of 5 to avoid throttling
    const BATCH_SIZE = 5;

    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = validatedRows.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (row) => {
            try {
                const rowData = [
                    row.area,
                    row.building,
                    row.workingOn,
                    row.callInDate,
                    row.severity,
                    row.repairDate,
                    row.contractor,
                    row.tarped,
                    row.comments
                ];
                await addLeakRow(rowData);
                uploaded++;
            } catch (e) {
                console.error("Row upload failed:", e);
                failed++;
            }
        });

        await Promise.all(batchPromises);

        // Update progress
        const pct = Math.round(((uploaded + failed) / total) * 100);
        progressBar.style.width  = `${pct}%`;
        progressText.textContent =
            `${uploaded + failed} of ${total} records uploaded`;

        // Small delay between batches
        if (i + BATCH_SIZE < total) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    // Reload all leaks data
    await loadLeaks();

    // Show complete
    document.getElementById("import-progress").classList.add("hidden");
    document.getElementById("import-complete").classList.remove("hidden");

    const msg = failed === 0
        ? `Successfully imported all ${uploaded} leak records!`
        : `Imported ${uploaded} records. ${failed} records failed.`;

    document.getElementById("complete-text").textContent = msg;
}

// ── CLEAR IMPORT ──────────────────────────────────────────────
function clearImport() {
    importedRows  = [];
    validatedRows = [];

    document.getElementById("excel-file-input").value = "";
    document.getElementById("import-preview").classList.add("hidden");
    document.getElementById("import-progress").classList.add("hidden");
    document.getElementById("import-complete").classList.add("hidden");
    document.getElementById("drop-zone").classList.remove("hidden");
    document.getElementById("import-warnings").classList.add("hidden");
    document.getElementById("preview-tbody").innerHTML = "";
    document.getElementById("progress-bar").style.width = "0%";
}
