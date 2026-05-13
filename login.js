const supabaseUrl = "https://ysamkffddeirimjftpxh.supabase.co";
const supabaseKey = "sb_publishable_g8RODryJUVcR6c-inXVorQ_PQdE_pTK";

const supabaseClient = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

async function handleSignIn() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("pw").value;

  // Validation
  if (!email || !password) {
    alert("Please fill in all fields");
    return;
  }

  // Supabase login
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  // Error handling
  if (error) {
    alert(error.message);
    return;
  }

  // Role checking
  const role = document.querySelector('input[name="role"]:checked').value;

  alert("Login successful!");

  // Redirect by role
  if (role === "nurse") {
    window.location.href = "nurseDash.html";
  }
  else if (role === "admin") {
    window.location.href = "adminDash.html";
  }
  else {
    window.location.href = "dashboard.html";
  }

}