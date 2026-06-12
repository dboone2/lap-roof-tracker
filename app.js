// ============================================================
// LAP ROOF TRACKER — MAIN APPLICATION
// Column Order: Area | Bay | Building | Working On |
//               Call In Date | Severity | Repair Date |
//               Contractor | Tarped | Comments
// ============================================================

let msalInstance;
let currentUser = null;
let allLeaks    = [];

// ── INITIALIZE ───────────────────────────────────────────────
window.onload = async () => {
    msalInstance = new msal.PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    await msalInstance.handleRedirectPromise();

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        await initializeApp();
    } else {
        showPage("login-page");
    }
};

// ── AUTH ─────────────────────────────────────────────────────
document.getElementById("login-btn")
    .addEventListener("click", async () => {
    try {
        await msalInstance.loginRedirect(loginRequest);
    } catch (e) {
        console.error("Login error:", e);
    }
});

document.getElementById("logout-btn")
    .addEventListener("click", () => {
    msalInstance.logoutRedirect();
});

async function initializeApp() {
    showLoading(true);
    try {
        const profile = await getUserProfile();
        currentUser   = profile;
        document.getElementById("user-name").textContent =
            profile.displayName;
        showPage("main-app");
        await loadLeaks();
        showView("dashboard");
    } catch (e) {
        console.error("Init error:", e);
        alert("Error loading app: " + e.message);
    }
    showLoading(false);
}

// ── DATA ─────────────────────────────────────────────────────
async function loadLeaks() {
    showLoading(true);
    try {
        const rows = await getLeakRows();
        allLeaks   = rows.map((row, index) => ({
            index,
            area       : String(row.values[0][0] || ""),
            bay        : String(row.values[0][1] || ""),
            building   : String(row.values[0][2] || ""),
            workingOn  : String(row.values[0][3] || ""),
            callInDate : String(row.values[0][4] || ""),
            severity   : String(row.values[0][5] || ""),
            repairDate : String(row.values[0][6] || ""),
            contractor : String(row.values[0][7] || ""),
            tarped     : String(row.values[0][8] || ""),
            comments   : String(row.values[0][9] || "")
        }));
    } catch (e) {
        console.warn("Could not load from SharePoint:", e.message);
        allLeaks = [];
    }
    renderDashboard();
    renderLeaksTable(allLeaks);
    showLoading(false);
}

// ── DASHBOARD ────────────────────────────────────────────────
function renderDashboard() {
    const activeLeaks = allLeaks.filter(l => l.severity !== "REP");
    const now         = new Date();

    // Summary counts
    document.getElementById("total-count").textContent =
        activeLeaks.length;
    document.getElementById("s5-count").textContent =
        allLeaks.filter(l => l.severity === "S5").length;
    document.getElementById("s4-count").textContent =
        allLeaks.filter(l => l.severity === "S4").length;
    document.getElementById("rep-count").textContent =
        allLeaks.filter(l => {
            if (l.severity !== "REP" || !l.repairDate) return false;
            const d = new Date(l.repairDate);
            return d.getMonth()    === now.getMonth() &&
                   d.getFullYear() === now.getFullYear();
        }).length;

    // Critical Alerts (S4 and S5)
    const critical      = allLeaks.filter(l =>
        l.severity === "S4" || l.severity === "S5");
    const alertsSection =
        document.getElementById("critical-alerts");
    const alertsList    =
        document.getElementById("alerts-list");

    if (critical.length > 0) {
        alertsSection.classList.remove("hidden");
        alertsList.innerHTML = critical.map(l => `
            <div class="alert-item ${l.severity === "S5"
                ? "alert-s5" : "alert-s4"}">
                <strong>${l.severity}</strong>
                — ${l.area} | Bay: ${l.bay}
                | Building: ${l.building}
                | Called In: ${l.callInDate}
                | Contractor: ${l.contractor || "Unassigned"}
                <br><small>${l.comments}</small>
            </div>
        `).join("");
    } else {
        alertsSection.classList.add("hidden");
    }

    // By Area
    const areas    = ["Body", "Paint", "Final", "Facilities"];
    const areaGrid = document.getElementById("area-grid");
    areaGrid.innerHTML = areas.map(area => {
        const count    = activeLeaks.filter(
            l => l.area === area).length;
        const s4s5     = allLeaks.filter(l =>
            l.area === area &&
            (l.severity === "S4" || l.severity === "S5")).length;
        const repaired = allLeaks.filter(l =>
            l.area === area && l.severity === "REP").length;
        return `
            <div class="area-card ${s4s5 > 0 ? "has-critical" : ""}">
                <div class="area-name">${area}</div>
                <div class="area-count">${count}</div>
                <div class="area-label">Active Leaks</div>
                <div class="area-repaired">
                    ✅ ${repaired} Repaired
                </div>
                ${s4s5 > 0
                    ? `<div class="area-critical">
                           ⚠️ ${s4s5} Critical
                       </div>`
                    : ""}
            </div>`;
    }).join("");

    // By Contractor
    const contractors    = ["Schriber", "Royal", "Techta"];
    const contractorGrid =
        document.getElementById("contractor-grid");
    contractorGrid.innerHTML = contractors.map(c => {
        const total    = allLeaks.filter(
            l => l.contractor === c).length;
        const active   = allLeaks.filter(l =>
            l.contractor === c && l.severity !== "REP").length;
        const repaired = allLeaks.filter(l =>
            l.contractor === c && l.severity === "REP").length;
        return `
            <div class="contractor-card">
                <div class="contractor-name">🏗️ ${c}</div>
                <div class="contractor-stats">
                    <div class="stat">
                        <span class="stat-num">${total}</span>
                        <span class="stat-label">Total</span>
                    </div>
                    <div class="stat">
                        <span class="stat-num">${active}</span>
                        <span class="stat-label">Active</span>
                    </div>
                    <div class="stat">
                        <span class="stat-num">${repaired}</span>
                        <span class="stat-label">Repaired</span>
                    </div>
                </div>
            </div>`;
    }).join("");
}

// ── TABLE ────────────────────────────────────────────────────
function renderLeaksTable(leaks) {
    const tbody = document.getElementById("leaks-tbody");

    if (leaks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="no-data">
                    No leak records found
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = leaks.map(l => `
        <tr class="${getSeverityClass(l.severity)}">
            <td>${l.area}</td>
            <td><strong>${l.bay}</strong></td>
            <td>${l.building}</td>
            <td>${l.workingOn}</td>
            <td>${l.callInDate}</td>
            <td>
                <span class="severity-badge
                      ${getSeverityClass(l.severity)}">
                    ${l.severity}
                </span>
            </td>
            <td>${l.repairDate}</td>
            <td>${l.contractor}</td>
            <td>${l.tarped}</td>
            <td class="comments-cell"
                title="${l.comments}">
                ${l.comments}
            </td>
            <td>
                <button class="btn-small"
                        onclick="editLeak(${l.index})">
                    ✏️ Edit
                </button>
            </td>
        </tr>
    `).join("");
}

function getSeverityClass(severity) {
    const map = {
        S5: "sev-s5", S4: "sev-s4", S3: "sev-s3",
        S2: "sev-s2", S1: "sev-s1", REP: "sev-rep"
    };
    return map[severity] || "";
}

// ── FILTERS ──────────────────────────────────────────────────
function applyFilters() {
    const area       =
        document.getElementById("filter-area").value;
    const bay        =
        document.getElementById("filter-bay").value.trim()
                                                    .toLowerCase();
    const severity   =
        document.getElementById("filter-severity").value;
    const contractor =
        document.getElementById("filter-contractor").value;

    let filtered = [...allLeaks];

    if (area)
        filtered = filtered.filter(l => l.area === area);
    if (bay)
        filtered = filtered.filter(l =>
            l.bay.toLowerCase().includes(bay));
    if (severity)
        filtered = filtered.filter(l => l.severity === severity);
    if (contractor)
        filtered = filtered.filter(l => l.contractor === contractor);

    renderLeaksTable(filtered);
}

function clearFilters() {
    document.getElementById("filter-area").value       = "";
    document.getElementById("filter-bay").value        = "";
    document.getElementById("filter-severity").value   = "";
    document.getElementById("filter-contractor").value = "";
    renderLeaksTable(allLeaks);
}

// ── FORM ─────────────────────────────────────────────────────
document.getElementById("leak-form")
    .addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading(true);

    const rowData = [
        document.getElementById("f-area").value,
        document.getElementById("f-bay").value,
        document.getElementById("f-building").value,
        document.getElementById("f-working").value,
        document.getElementById("f-callin-date").value,
        document.getElementById("f-severity").value,
        document.getElementById("f-repair-date").value,
        document.getElementById("f-contractor").value,
        document.getElementById("f-tarped").value,
        document.getElementById("f-comments").value
    ];

    const editIndex =
        document.getElementById("edit-row-index").value;

    try {
        if (editIndex !== "") {
            await updateLeakRow(parseInt(editIndex), rowData);
        } else {
            await addLeakRow(rowData);
        }
        await loadLeaks();
        resetForm();
        showView("leaks");
    } catch (e) {
        console.error("Save error:", e);
        alert("Error saving record: " + e.message);
    }
    showLoading(false);
});

function editLeak(index) {
    const leak = allLeaks.find(l => l.index === index);
    if (!leak) return;

    document.getElementById("form-title").textContent =
        "Edit Leak Record";
    document.getElementById("edit-row-index").value   = index;
    document.getElementById("f-area").value           = leak.area;
    document.getElementById("f-bay").value            = leak.bay;
    document.getElementById("f-building").value       = leak.building;
    document.getElementById("f-working").value        = leak.workingOn;
    document.getElementById("f-callin-date").value    = leak.callInDate;
    document.getElementById("f-severity").value       = leak.severity;
    document.getElementById("f-repair-date").value    = leak.repairDate;
    document.getElementById("f-contractor").value     = leak.contractor;
    document.getElementById("f-tarped").value         = leak.tarped;
    document.getElementById("f-comments").value       = leak.comments;

    showView("add");
}

function resetForm() {
    document.getElementById("form-title").textContent =
        "Report New Leak";
    document.getElementById("edit-row-index").value = "";
    document.getElementById("leak-form").reset();
}

// ── NAVIGATION ───────────────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        showView(btn.dataset.view);
        if (btn.dataset.view === "add") resetForm();
    });
});

function showView(viewName) {
    document.querySelectorAll(".view")
        .forEach(v => v.classList.add("hidden"));
    document.getElementById(`${viewName}-view`)
        .classList.remove("hidden");
}

function showPage(pageId) {
    document.querySelectorAll(".page")
        .forEach(p => p.classList.add("hidden"));
    document.getElementById(pageId).classList.remove("hidden");
}

function showLoading(show) {
    document.getElementById("loading")
        .classList.toggle("hidden", !show);
}
