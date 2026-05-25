const db = window.supabaseClient;

// ===============================
// GET ALL APPOINTMENTS
// ===============================
export async function getAppointments() {
  const { data, error } = await db
    .from("appointments")
    .select(`
      *,
      clinic_services(service_name),
      users(full_name, student_number)
    `)
    .order("appointment_date", { ascending: false });
    console.log("RAW appointments data:", data);  // 👈 add this
  console.log("RAW appointments error:", error); // 👈 add this

  if (error) {
    console.error("Supabase Error:", error);
    return [];
  }

  return data;
}
//===============================
//GET NURSES
//===============================
export async function getNurses() {
  const { data, error } = await db
    .from("users")
    .select(`
      *,
      staff_profiles(staff_number, department, job_title)
    `)
    .eq("role_id", 3)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
    return [];
  }

  return data;
}

// ===============================
// GET PATIENTS
// ===============================
export async function getPatients() {

  const { data, error } = await db
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
    throw error;
  }

  return data;
}

// ===============================
//GET MEDICAL RECORDS
// ===============================
export async function getMedicalRecords() {
  const { data, error } = await db
    .from("consultations")
    .select(`
      *,
      student:student_id(full_name, student_number),
      nurse:nurse_id(full_name)
    `)
    .order("consultation_date", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
    return [];
  }

  return data;
}
// ===============================
// GET INVENTORY
// ===============================
export async function getInventory() {
  const { data, error } = await db
    .from("inventory")
    .select(`
      *,
      updated_by:updated_by(full_name)
    `)
    .order("product_name", { ascending: true });

  if (error) {
    console.error("Supabase Error:", error);
    return [];
  }

  return data;
}

// ==============================
// GET SENSOR CHECKINS
// ==============================
export async function getCheckIns() {
  const { data, error } = await db
    .from("check_ins")
    .select(`
      *,
      student:student_id(full_name, student_number),
      appointment:appointment_id(appointment_date, appointment_time)
    `)
    .order("checkin_time", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
    return [];
  }

  return data;
}

// ===============================
// UPDATE APPOINTMENT (APPROVE / REJECT)
// ===============================
export async function updateAppointment(id, status) {
  const { data, error } = await db
    .from("appointments")
    .update({ status })
    .eq("appointment_id", id);

  if (error) {
  console.error("Supabase Error:", error);
  return [];
}
}

// ===============================
// GET STATS
// ===============================
export async function getStats() {
  const { data: users } = await db
    .from("users")
    .select("user_id");

  const { data: appointments } = await db
    .from("appointments")
    .select("appointment_id, status");

  const { data: staff } = await db
    .from("users")
    .select("user_id")
    .in("role_id", [2, 3, 4]);

  const today = new Date().toISOString().split("T")[0];

  const { data: todayAppointments } = await db
    .from("appointments")
    .select("appointment_id")
    .eq("appointment_date", today);

  const { data: todayCheckIns } = await db
    .from("check_ins")
    .select("checkin_id")
    .gte("checkin_time", `${today}T00:00:00`)
    .lte("checkin_time", `${today}T23:59:59`);

  return {
    totalPatients: users?.length || 0,
    totalAppointments: appointments?.length || 0,
    booked: appointments?.filter(a => a.status === "Booked").length || 0,
    cancelled: appointments?.filter(a => a.status === "Cancelled").length || 0,
    waitlisted: appointments?.filter(a => a.status === "Waitlisted").length || 0,
    totalCheckins: todayCheckIns?.length || 0,
    todayAppointments: todayAppointments?.length || 0,
    totalStaff: staff?.length || 0  // ✅ added
  };
}