import {
  getAppointments,
  getPatients,
  getStats,
  updateAppointment
} from "./adminApi.js";

// ===============================
// LOAD APPOINTMENTS
// ===============================
async function loadAppointments() {
  const table = document.getElementById("appointmentsTable");

  const data = await getAppointments() || [];

  table.innerHTML = "";

  data.forEach(app => {
    table.innerHTML += `
      <tr>
        <td>${app.appointment_id}</td>
        <td>${app.patient_id}</td>
        <td>${app.appointment_date}</td>
        <td>${app.appointment_time}</td>
        <td>${app.clinic_services?.service_name || "N/A"}</td>
        <td>${app.status}</td>
        <td>
          <button onclick="approve(${app.appointment_id})">Approve</button>
          <button onclick="reject(${app.appointment_id})">Reject</button>
        </td>
      </tr>
    `;
  });
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
  loadAppointments();
};

// ===============================
// INIT
// ===============================
loadAppointments();
//==============================
//loadpatients

let patientsCache = [];

async function loadPatients() {
  const table = document.getElementById("patientsTable");

  const data = await getPatients();

  patientsCache = data;

  renderPatients(data);

  // search + filter listeners
  document.getElementById("patientSearch").addEventListener("input", filterPatients);
  document.getElementById("patientFilter").addEventListener("change", filterPatients);
}

//Render Patients
function renderPatients(data) {
  const table = document.getElementById("patientsTable");

  table.innerHTML = "";

  data.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.patient_id}</td>
        <td>${p.full_name}</td>
        <td>${p.email}</td>
        <td>${p.patient_type}</td>
        <td>${p.phone || "N/A"}</td>
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
loadPatients();

//loadStats
async function loadStats() {
  const stats = await getStats();

  document.getElementById("totalPatients").innerText = stats.totalPatients;
  document.getElementById("totalAppointments").innerText = stats.totalAppointments;
  document.getElementById("approvedCount").innerText = stats.approved;
  document.getElementById("rejectedCount").innerText = stats.rejected;
  document.getElementById("bookedCount").innerText = stats.booked;
}

loadStats();