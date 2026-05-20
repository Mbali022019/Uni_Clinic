import {
  getAppointments,
  getPatients,
  updateAppointment
} from "./adminApi.js";

// ===============================
// LOAD APPOINTMENTS
// ===============================
async function loadAppointments() {
  const table = document.getElementById("appointmentsTable");

  const data = await getAppointments();

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