const db = window.supabaseClient;

// ===============================
// FETCH DATA FOR PREDICTIONS
// ===============================
async function fetchAppointmentHistory() {
  const { data, error } = await db
    .from("appointments")
    .select("appointment_id, appointment_date, appointment_time, status");

  if (error) {
    console.error("AI Prediction Error:", error);
    return [];
  }

  return data;
}

// ===============================
// PREDICT BUSIEST DAYS OF THE WEEK
// ===============================
export function predictBusiestDays(appointments) {
  const dayCounts = {
    Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0,
    Thursday: 0, Friday: 0, Saturday: 0
  };

  appointments.forEach(app => {
    const day = new Date(app.appointment_date).toLocaleDateString("en-ZA", { weekday: "long" });
    if (dayCounts[day] !== undefined) dayCounts[day]++;
  });

  // sort by count descending
  const sorted = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([day, count]) => ({ day, count }));

  return sorted;
}

// ===============================
// PREDICT BUSIEST HOURS
// ===============================
export function predictBusiestHours(appointments) {
  const hourCounts = {};

  appointments.forEach(app => {
    const hour = app.appointment_time?.slice(0, 2) + ":00";
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sorted = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([hour, count]) => ({ hour, count }));

  return sorted;
}

// ===============================
// PREDICT QUEUE CONGESTION RISK
// ===============================
export function predictCongestionRisk(appointments) {
  const today = new Date().toISOString().split("T")[0];

  const todayAppointments = appointments.filter(
    a => a.appointment_date === today
  );

  let risk = "Low";
  let message = "Clinic is running smoothly today.";

  if (todayAppointments.length >= 10) {
    risk = "High";
    message = "High congestion expected today. Consider adding more staff.";
  } else if (todayAppointments.length >= 5) {
    risk = "Medium";
    message = "Moderate traffic expected today. Monitor queue closely.";
  }

  return { risk, message, count: todayAppointments.length };
}

// ===============================
// PREDICT HIGH BOOKING DAYS
// ===============================
export function predictHighBookingDays(appointments) {
  const dateCounts = {};

  appointments.forEach(app => {
    const date = app.appointment_date;
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  });

  const sorted = Object.entries(dateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // top 5 busiest dates
    .map(([date, count]) => ({ date, count }));

  return sorted;
}

// ===============================
// MAIN — RUN ALL PREDICTIONS
// ===============================
export async function runPredictions() {
  const appointments = await fetchAppointmentHistory();

  const busiestDays    = predictBusiestDays(appointments);
  const busiestHours   = predictBusiestHours(appointments);
  const congestionRisk = predictCongestionRisk(appointments);
  const highBookingDays = predictHighBookingDays(appointments);

  return {
    busiestDays,
    busiestHours,
    congestionRisk,
    highBookingDays
  };
}