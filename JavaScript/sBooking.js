console.log("sBooking JS Loaded");

// ============================================
// SUPABASE
// ============================================

const db = window.supabaseClient;

if (!db) {

  alert("Supabase client not loaded.");

}


// ============================================
// USER SESSION
// ============================================

const currentUser =
  JSON.parse(
    localStorage.getItem(
      "uniclinic_user"
    )
  );

if (!currentUser) {

  showToast(
    "Please login first.",
    true
  );

  setTimeout(() => {

    window.location.href =
      "login.html";

  }, 1500);

}


// ============================================
// USER UI
// ============================================

document.getElementById(
  "studentName"
).innerText =
  currentUser.full_name || "Student";

document.getElementById(
  "summaryPatient"
).innerText =
  currentUser.full_name || "Student";

const initial =
  currentUser.full_name
  ? currentUser.full_name.charAt(0)
  : "U";

document.getElementById(
  "avatarInitial"
).innerText = initial;

document.getElementById(
  "topAvatar"
).innerText = initial;


// ============================================
// GLOBALS
// ============================================

let selectedServices = [];

let appointmentsCache = [];

let editingAppointmentId = null;

let selectedTime = null;

let servicesData = [];

const timeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00"
];


// ============================================
// LOAD SERVICES
// ============================================

async function loadServices() {

  const chips =
    document.getElementById(
      "chips"
    );

  try {

    const { data, error } =
      await db
      .from("clinic_services")
      .select("*")
      .eq("is_active", true)
      .order("service_name");

    if (error) throw error;

    servicesData = data;

    chips.innerHTML = "";

    data.forEach(service => {

      const chip =
        document.createElement("div");

      chip.className = "chip";

      chip.innerText =
        service.service_name;

      chip.addEventListener(
        "click",
        () => {

          chip.classList.toggle(
            "selected"
          );

          const existing =
            selectedServices.find(
              s =>
                s.service_id ===
                service.service_id
            );

          if (existing) {

            selectedServices =
              selectedServices.filter(
                s =>
                  s.service_id !==
                  service.service_id
              );

          }

          else {

            selectedServices.push({
              service_id:
                service.service_id,

              service_name:
                service.service_name
            });

          }

          updateSummary();

        }
      );

      chips.appendChild(chip);

    });

  }

  catch(err){

    console.error(err);

    showToast(
      "Failed to load services.",
      true
    );

  }

}


// ============================================
// LOAD TIME SLOTS
// ============================================

function loadTimeSlots() {

  const grid =
    document.getElementById(
      "timeGrid"
    );

  const selectedDateValue =
    document.getElementById(
      "dateInput"
    ).value;

  grid.innerHTML = "";

  let friday = false;

  // =====================================
  // CHECK SELECTED DATE
  // =====================================

  if(selectedDateValue){

    const selectedDate =
      new Date(
        selectedDateValue + "T00:00:00"
      );

    const day =
      selectedDate.getDay();

    // Friday = 5
    friday = day === 5;

  }

  timeSlots.forEach(slot => {

    const div =
      document.createElement("div");

    div.className =
      "time-slot";

    div.innerText = slot;

    let unavailable = false;

    // =====================================
    // LUNCH TIME
    // =====================================

    if(slot === "12:00"){

      unavailable = true;

    }

    // =====================================
    // FRIDAY RULE
    // Friday ends at 13:00
    // =====================================

    if(
      friday &&
      (
        slot === "14:00" ||
        slot === "15:00"
      )
    ){

      unavailable = true;

    }

    // =====================================
    // APPLY UNAVAILABLE STYLE
    // =====================================

    if(unavailable){

      div.classList.add(
        "unavail"
      );

    }

    // =====================================
    // CLICK EVENT
    // =====================================

    else {

      div.addEventListener(
        "click",
        () => {

          document
          .querySelectorAll(
            ".time-slot"
          )
          .forEach(t =>
            t.classList.remove(
              "selected"
            )
          );

          div.classList.add(
            "selected"
          );

          selectedTime = slot;

          updateSummary();

        }
      );

    }

    grid.appendChild(div);

  });

}


// ============================================
// UPDATE SUMMARY
// ============================================

function updateSummary() {

  const date =
    document.getElementById(
      "dateInput"
    ).value;

  const notes =
    document.getElementById(
      "notesInput"
    ).value;

  const summaryBox =
    document.getElementById(
      "summary-box"
    );

  const summaryEmpty =
    document.getElementById(
      "summary-empty"
    );

  if(
    selectedServices.length > 0 ||
    selectedTime ||
    date
  ){

    summaryEmpty.style.display =
      "none";

    summaryBox.style.display =
      "block";

    summaryBox.innerHTML = `

      <div class="confirm-row">
        <span class="confirm-key">
          Student
        </span>

        <span class="confirm-val">
          ${currentUser.full_name}
        </span>
      </div>

      <div class="confirm-row">
        <span class="confirm-key">
          Services
        </span>

        <span class="confirm-val">
          ${
            selectedServices.length > 0
            ? selectedServices
                .map(
                  s => s.service_name
                )
                .join(", ")
            : "—"
          }
        </span>
      </div>

      <div class="confirm-row">
        <span class="confirm-key">
          Appointment Date
        </span>

        <span class="confirm-val">
          ${date || "—"}
        </span>
      </div>

      <div class="confirm-row">
        <span class="confirm-key">
          Appointment Time
        </span>

        <span class="confirm-val">
          ${selectedTime || "—"}
        </span>
      </div>

      <div class="confirm-row">
        <span class="confirm-key">
          Notes
        </span>

        <span class="confirm-val">
          ${notes || "No notes"}
        </span>
      </div>

    `;

  }

  const btn =
    document.getElementById(
      "bookBtn"
    );

  if(
    selectedServices.length > 0 &&
    selectedTime &&
    date
  ){

    btn.disabled = false;

    btn.style.opacity = "1";

    btn.style.cursor =
      "pointer";

  }

  else{

    btn.disabled = true;

    btn.style.opacity = ".45";

    btn.style.cursor =
      "not-allowed";

  }

}


// ============================================
// DATE CHANGE
// ============================================

document
.getElementById("dateInput")
.addEventListener(
  "change",
  () => {

    selectedTime = null;

    loadTimeSlots();

    updateSummary();

  }
);


// ============================================
// NOTES CHANGE
// ============================================

document
.getElementById("notesInput")
.addEventListener(
  "input",
  updateSummary
);


// ============================================
// BOOK APPOINTMENT
// ============================================

document
.getElementById("bookBtn")
.addEventListener(
  "click",
  async () => {

    try {

      const date =
        document
        .getElementById(
          "dateInput"
        )
        .value;

      const notes =
        document
        .getElementById(
          "notesInput"
        )
        .value;

      if(
        selectedServices.length === 0
      ){

        showToast(
          "Select at least one service.",
          true
        );

        return;

      }

      if(!date){

        showToast(
          "Please select a date.",
          true
        );

        return;

      }

      if(!selectedTime){

        showToast(
          "Please select a time slot.",
          true
        );

        return;

      }

      const btn =
        document.getElementById(
          "bookBtn"
        );

      btn.disabled = true;

      btn.innerText =
        editingAppointmentId
        ? "Updating..."
        : "Booking...";

      // =====================================
      // EDIT BOOKING
      // =====================================

      if(editingAppointmentId){

        const { error } =
          await db
          .from("appointments")
          .update({

            appointment_date:
              date,

            appointment_time:
              selectedTime,

            notes:
              notes

          })
          .eq(
            "appointment_id",
            editingAppointmentId
          );

        if(error) throw error;

        showToast(
          "Appointment updated successfully!"
        );

        editingAppointmentId = null;

      }

      // =====================================
      // CREATE BOOKING
      // =====================================

      else {

        const appointmentsToInsert =
          selectedServices.map(service => ({

            student_id:
              currentUser.user_id,

            appointment_date:
              date,

            appointment_time:
              selectedTime,

            service_id:
              service.service_id,

            notes:
              notes,

            status:
              "Booked"

          }));

        const { error } =
          await db
          .from("appointments")
          .insert(
            appointmentsToInsert
          );

        if(error) throw error;

        showToast(
          "Appointment booked successfully!"
        );

      }

      btn.innerText =
        "Book Appointment";

      btn.disabled = false;

      // RESET

      selectedServices = [];

      selectedTime = null;

      document
      .getElementById(
        "dateInput"
      ).value = "";

      document
      .getElementById(
        "notesInput"
      ).value = "";

      document
      .querySelectorAll(".chip")
      .forEach(chip =>
        chip.classList.remove(
          "selected"
        )
      );

      loadTimeSlots();

      updateSummary();

      loadHistory();

    }

    catch(err){

      console.error(err);

      showToast(
        "Booking failed.",
        true
      );

      const btn =
        document.getElementById(
          "bookBtn"
        );

      btn.disabled = false;

      btn.innerText =
        "Book Appointment";

    }

  }
);




// ============================================
// LOAD HISTORY
// ============================================

async function loadHistory() {

  const history =
    document.getElementById(
      "historyList"
    );

  try {

    const { data, error } =
      await db
      .from("appointments")
      .select(`
        *,
        clinic_services!fk_appointments_service (
          service_name
        )
      `)
      .eq(
        "student_id",
        currentUser.user_id
      )
      .order(
        "created_at",
        {
          ascending:false
        }
      );

    if(error) throw error;

    appointmentsCache = data;

    renderAppointments(data);

  }

  catch(err){

    console.error(err);

    showToast(
      "Failed to load history.",
      true
    );

  }

}


// ============================================
// RENDER APPOINTMENTS
// ============================================

function renderAppointments(data){

  const history =
    document.getElementById(
      "historyList"
    );

  history.innerHTML = "";

  if(data.length === 0){

    history.innerHTML = `
      <p>No appointments yet.</p>
    `;

    return;

  }

  data.forEach(appt => {

    const badgeClass =
      appt.status === "Cancelled"
      ? "badge-red"
      : "badge-green";

    history.innerHTML += `

      <div class="appt-item">

        <div class="appt-bar teal"></div>

        <div class="appt-info">

          <div class="appt-service">
            ${
              appt.clinic_services
              ?.service_name ||
              "Clinic Service"
            }
          </div>

          <div class="appt-meta">

            <strong>Date:</strong>
            ${appt.appointment_date}

            <br>

            <strong>Time:</strong>
            ${appt.appointment_time}

            <br>

            <strong>Status:</strong>
            ${appt.status}

            <br>

            <strong>Notes:</strong>
            ${
              appt.notes ||
              "No notes"
            }

          </div>

          <div class="appt-actions">

            ${
              appt.status !== "Cancelled"
              ? `
                <button
                  class="btn btn-sm btn-outline"
                  onclick="editAppointment(
                    '${appt.appointment_id}',
                    '${appt.appointment_date}',
                    '${appt.appointment_time}',
                    \`${appt.notes || ""}\`
                  )"
                >
                  Edit
                </button>

                <button
                  class="btn btn-sm cancel-btn"
                  onclick="cancelAppointment(
                    '${appt.appointment_id}'
                  )"
                >
                  Cancel
                </button>
              `
              : ""
            }

          </div>

        </div>

        <span class="badge ${badgeClass}">
          ${appt.status}
        </span>

      </div>

    `;

  });

}

// ============================================
// EDIT APPOINTMENT
// ============================================

function editAppointment(
  id,
  date,
  time,
  notes
){

  editingAppointmentId = id;

  document
  .getElementById(
    "dateInput"
  ).value = date;

  document
  .getElementById(
    "notesInput"
  ).value = notes;

  selectedTime = time;

  loadTimeSlots();

  setTimeout(() => {

    document
    .querySelectorAll(".time-slot")
    .forEach(slot => {

      if(
        slot.innerText === time
      ){

        slot.classList.add(
          "selected"
        );

      }

    });

  }, 100);

  updateSummary();

  showToast(
    "Editing appointment..."
  );

}

// ============================================
// CANCEL APPOINTMENT
// ============================================

async function cancelAppointment(id){

  const confirmCancel =
    confirm(
      "Cancel this appointment?"
    );

  if(!confirmCancel) return;

  try {

    const { error } =
      await db
      .from("appointments")
      .update({
        status: "Cancelled"
      })
      .eq(
        "appointment_id",
        id
      );

    if(error) throw error;

    showToast(
      "Appointment cancelled."
    );

    loadHistory();

  }

  catch(err){

    console.error(err);

    showToast(
      "Failed to cancel.",
      true
    );

  }

}



// ============================================
// TOAST
// ============================================

function showToast(
  message,
  error = false
){

  const toast =
    document.getElementById(
      "toast"
    );

  toast.innerText = message;

  toast.style.display =
    "block";

  toast.style.background =
    error
    ? "#dc2626"
    : "#15803d";

  setTimeout(() => {

    toast.style.display =
      "none";

  }, 3000);

}


// ============================================
// LOGOUT
// ============================================

document
.getElementById("logoutBtn")
.addEventListener(
  "click",
  () => {

    localStorage.removeItem(
      "uniclinic_user"
    );

  }
);

// ============================================
// SEARCH + FILTER
// ============================================

document
.getElementById(
  "searchAppointment"
)
.addEventListener(
  "input",
  filterAppointments
);

document
.getElementById(
  "filterStatus"
)
.addEventListener(
  "change",
  filterAppointments
);

function filterAppointments(){

  const search =
    document
    .getElementById(
      "searchAppointment"
    )
    .value
    .toLowerCase();

  const status =
    document
    .getElementById(
      "filterStatus"
    )
    .value;

  const filtered =
    appointmentsCache.filter(appt => {

      const service =
        appt.clinic_services
        ?.service_name
        ?.toLowerCase() || "";

      const matchesSearch =
        service.includes(search);

      const matchesStatus =
        status === "All"
        ? true
        : appt.status === status;

      return (
        matchesSearch &&
        matchesStatus
      );

    });

  renderAppointments(filtered);

}


// ============================================
// INIT
// ============================================

loadServices();
const today =
  new Date()
  .toISOString()
  .split("T")[0];

document
.getElementById("dateInput")
.setAttribute("min", today);

loadTimeSlots();

loadHistory();