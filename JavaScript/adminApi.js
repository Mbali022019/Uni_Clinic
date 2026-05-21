const db = window.supabaseClient;

// ===============================
// GET ALL APPOINTMENTS
// ===============================
export async function getAppointments() {
  const { data, error } = await db
    .from("appointments")
    .select(`
      *,
      clinic_services(service_name)
    `)
    .order("appointment_date", { ascending: false });

  if (error) {
  console.error("Supabase Error:", error);
  return [];
}
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

  return {
  totalPatients: users?.length || 0,
  totalAppointments: appointments?.length || 0,
  booked: appointments?.filter(a => a.status === "Booked").length || 0,
  cancelled: appointments?.filter(a => a.status === "Cancelled").length || 0,
  waitlisted: appointments?.filter(a => a.status === "Waitlisted").length || 0
};
}