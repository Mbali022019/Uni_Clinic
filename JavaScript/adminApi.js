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
// GET ALL PATIENTS
// ===============================
export async function getPatients() {
  const { data, error } = await db
    .from("Patient")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
  console.error("Supabase Error:", error);
  return [];
}
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

//Get Stats
export async function getStats() {

  const { data: patients } = await db
    .from("patient")
    .select("patient_id");

  const { data: appointments } = await db
    .from("appointments")
    .select("appointment_id, status");

  const totalPatients = patients?.length || 0;
  const totalAppointments = appointments?.length || 0;

  const approved = appointments?.filter(a => a.status === "Approved").length || 0;
  const rejected = appointments?.filter(a => a.status === "Rejected").length || 0;
  const booked = appointments?.filter(a => a.status === "Booked").length || 0;

  return {
    totalPatients,
    totalAppointments,
    approved,
    rejected,
    booked
  };
}
