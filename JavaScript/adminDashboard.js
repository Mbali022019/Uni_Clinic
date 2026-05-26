import {
  getAppointments,
  getNurses,
  getPatients,
  getMedicalRecords,
  getInventory,
  getStats,
  getCheckIns,
  updateAppointment
} from "./adminApi.js";
// ===============================
// LOAD STATS  ← move this UP first
// ===============================
async function loadStats() {
  const stats = await getStats();

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
    else console.warn(`Element not found: #${id}`);
  };

  set("totalPatients", stats.totalPatients);
  set("totalAppointments", stats.totalAppointments);
  set("clinicStaff", stats.totalStaff);

  if (window.admState) {
    window.admState.apptTotal = stats.todayAppointments;
window.admState.apptCheckedIn = stats.totalCheckins;         // ✅ booked ones
    window.updateAdmUI();
  }
}
// ===============================
// LOAD APPOINTMENTS
// ===============================
async function loadAppointments() {
  const table = document.getElementById("apptBody"); // ✅ targets the right table
  

  const data = await getAppointments() || [];
  

  table.innerHTML = "";

  data.forEach(app => {
    table.innerHTML += `
      <tr data-id="${app.appointment_id}">
        <td>${app.users?.full_name || "N/A"}</td>
        <td>${app.users?.student_number || "N/A"}</td>
        <td>${app.clinic_services?.service_name || "N/A"}</td>
        <td>${app.appointment_date}</td>
        <td>${app.appointment_time}</td>
        <td>N/A</td>
        <td><span class="badge ${getStatusBadge(app.status)}">${app.status}</span></td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn edit" onclick="editRow(this)">Edit</button>
            <button class="tbl-btn del" onclick="delRow(this)">Del</button>
          </div>
        </td>
      </tr>
    `;
  });
}
//=========================
//Function load nurses
//========================
async function loadNurses() {
  const table = document.getElementById("nurseBody");
  const data = await getNurses() || [];

  table.innerHTML = "";

  data.forEach(nurse => {
    table.innerHTML += `
      <tr data-id="${nurse.user_id}">
        <td>${nurse.full_name}</td>
        <td>${nurse.staff_profiles?.staff_number || "N/A"}</td>
        <td>${nurse.staff_profiles?.job_title || "General"}</td>
        <td><span class="inv-badge ok">Active</span></td>
        <td>Morning</td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn edit" onclick="editRow(this)">Edit</button>
            <button class="tbl-btn del" onclick="delRow(this)">Del</button>
          </div>
        </td>
      </tr>
    `;
  });
}

// ================================
//FUNCTION LOAD MEDICAL RECORDS
// ================================
async function loadMedicalRecords() {
  const table = document.getElementById("recordsBody");
  const data = await getMedicalRecords() || [];

  table.innerHTML = "";

  data.forEach(record => {
    const date = new Date(record.consultation_date).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", year: "numeric"
    });

    table.innerHTML += `
      <tr data-id="${record.consultation_id}">
        <td>${record.student?.full_name || "N/A"}</td>
        <td>${record.student?.student_number || "N/A"}</td>
        <td>${record.diagnosis || "N/A"}</td>
        <td>${record.notes || "N/A"}</td>
        <td>${record.nurse?.full_name || "N/A"}</td>
        <td>${date}</td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn edit" 
              style="background:var(--teal-100);color:var(--teal-700);" 
              onclick="viewRecord(this)">View</button>
            <button class="tbl-btn save" 
              onclick="sendToNurse(this)">Send to Nurse</button>
          </div>
        </td>
      </tr>
    `;
  });
}
// =========================
//Function load INVENTORY
// =========================
async function loadInventory() {
  const table = document.getElementById("invBody");
  const data = await getInventory() || [];

  table.innerHTML = "";

  data.forEach(item => {
    // determine stock status based on quantity
    let statusBadge = "";
    if (item.quantity === 0) {
      statusBadge = `<span class="inv-badge out">Out of Stock</span>`;
    } else if (item.quantity <= 20) {
      statusBadge = `<span class="inv-badge low">Low Stock</span>`;
    } else {
      statusBadge = `<span class="inv-badge ok">In Stock</span>`;
    }

    table.innerHTML += `
      <tr data-id="${item.inventory_id}">
        <td>${item.product_name}</td>
        <td>Medical Supply</td>
        <td>${item.quantity}</td>
        <td>Units</td>
        <td>${statusBadge}</td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn edit" onclick="editRow(this)">Edit</button>
            <button class="tbl-btn del" onclick="delRow(this)">Del</button>
          </div>
        </td>
      </tr>
    `;
  });
}
// ================================
//FUNCTION LOAD CHECKINS
// ================================
async function loadCheckIns() {
  const table = document.getElementById("checkinsBody");
  const data = await getCheckIns() || [];

  table.innerHTML = "";

  if (data.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;color:var(--slate-400);padding:20px;">
          No check-ins recorded yet today.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(checkin => {
    const checkinTime = new Date(checkin.checkin_time).toLocaleTimeString("en-ZA", {
      hour: "2-digit", minute: "2-digit"
    });

    table.innerHTML += `
      <tr>
        <td><span class="badge badge-teal">${checkin.queue_number || "N/A"}</span></td>
        <td>${checkin.student?.full_name || "N/A"}</td>
        <td>${checkin.student?.student_number || "N/A"}</td>
        <td>${checkin.appointment?.appointment_date || "N/A"}</td>
        <td>${checkin.appointment?.appointment_time || "N/A"}</td>
        <td>${checkinTime}</td>
      </tr>
    `;
  });
}

function getStatusBadge(status) {
  switch(status) {
    case "Booked":      return "badge-yellow";
    case "Cancelled":   return "badge-red";
    case "Waitlisted":  return "badge-blue";
    default:            return "badge-teal";
  }
}

// ===============================
// APPROVE
// ===============================
window.approve = async (id) => {
  await updateAppointment(id, "Approved");
  loadAppointments();
};

// ===============================
// REJECT
// ===============================
window.reject = async (id) => {
  await updateAppointment(id, "Rejected");
};

// ===============================
// INIT
// ===============================



//==============================
//loadpatients

async function loadPatients() {
  const table = document.getElementById("patientBody"); // ✅ changed
  const patients = await getPatients();

  table.innerHTML = "";

  patients.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.full_name}</td>
        <td>${p.user_id || "N/A"}</td>
        <td>${p.faculty || "N/A"}</td>
        <td>${p.email}</td>
        <td><span class="inv-badge ok">${p.patient_type || "Active"}</span></td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn edit" onclick="editRow(this)">Edit</button>
            <button class="tbl-btn del" onclick="delRow(this)">Del</button>
          </div>
        </td>
      </tr>
    `;
  });
}

//Render Patients
function renderPatients(data) {
  const table = document.getElementById("patientsTable");

  table.innerHTML = "";

  data.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.user_id}</td>
        <td>${p.full_name}</td>
        <td>${p.email}</td>
        <td>${p.phone || "N/A"}</td>
        <td>${p.patient_type}</td>
      </tr>
    `;
  });
}

//search+filter
function filterPatients() {
  const search = document.getElementById("patientSearch").value.toLowerCase();
  const filter = document.getElementById("patientFilter").value;

  const filtered = patientsCache.filter(p => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(search) ||
      p.email.toLowerCase().includes(search);

    const matchesType =
      filter === "All" ? true : p.patient_type === filter;

    return matchesSearch && matchesType;
  });

  renderPatients(filtered);
}




document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadAppointments();
  loadNurses();
  loadPatients();
  loadMedicalRecords();
  loadInventory();
  loadCheckIns(); 
});