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

  if (error) throw error;
  return data;
}

// ===============================
// GET ALL PATIENTS
// ===============================
export async function getPatients() {
  const { data, error } = await db
    .from("Patient")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
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

  if (error) throw error;
  return data;
}