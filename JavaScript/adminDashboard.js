import {
  getAppointments,
  getPatients,
  getStats,
  updateAppointment
} from "./adminApi.js";
// ===============================
// LOAD STATS  ← move this UP first
// ===============================
async function loadStats() {
  const stats = await getStats();

  document.getElementById("totalPatients").innerText = stats.totalPatients;
  document.getElementById("totalAppointments").innerText = stats.totalAppointments;
  document.getElementById("bookedCount").innerText = stats.booked;
  document.getElementById("cancelledCount").innerText = stats.cancelled;
  document.getElementById("waitlistedCount").innerText = stats.waitlisted;
}
window.loadStats = loadStats;
window.getStats = getStats; // optional for console testing
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

async function loadPatients() {

  const table =
    document.getElementById("patientsTable");

  const patients =
    await getPatients();

  table.innerHTML = "";

  patients.forEach(patient => {

    table.innerHTML += `
      <tr>
        <td>${patient.full_name}</td>
        <td>${patient.email}</td>
        <td>${patient.phone || "N/A"}</td>
        <td>${patient.patient_type || "student"}</td>
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
loadPatients();



window.loadStats = loadStats;
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
});