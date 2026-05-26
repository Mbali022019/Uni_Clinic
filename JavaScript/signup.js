

 supabase = window.supabaseClient;

if (!supabase) {
  console.error("Supabase client not found.");
}


// ============================================
// ROLE CARD ACTIVE UI
// ============================================

const roleCards = document.querySelectorAll(".role-card");

roleCards.forEach(card => {
  card.addEventListener("click", () => {
    roleCards.forEach(c =>
      c.classList.remove("active-role")
    );

    card.classList.add("active-role");
  });
});


// ============================================
// CUSTOM POPUP
// ============================================

function showPopup(message, type = "success") {
  const popup = document.createElement("div");

  popup.className = `popup ${type}`;

  popup.innerHTML = `
    <div class="popup-content">
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add("show");
  }, 100);

  setTimeout(() => {
    popup.classList.remove("show");

    setTimeout(() => {
      popup.remove();
    }, 300);
  }, 3500);
}


// ============================================
// PASSWORD TOGGLE
// ============================================

function togglePw(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);

  if (!input || !icon) return;

  const isHidden = input.type === "password";

  input.type = isHidden ? "text" : "password";

  icon.innerHTML = isHidden
    ? `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    `
    : `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
}


// ============================================
// OPTIONAL REDIRECT FUNCTION
// ============================================

function handleSignUp() {
  const selectedRole =
    document.querySelector('input[name="role"]:checked');

  if (!selectedRole) return;

  const role = selectedRole.value.toLowerCase();

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


// ============================================
// SIGNUP FORM
// ============================================

const signupForm = document.getElementById("signupForm");
const signupBtn = document.getElementById("signupBtn");

// Prevent "Cannot read properties of null"
if (!signupForm || !signupBtn) {
  console.warn("signupForm or signupBtn not found in HTML.");
}
else {

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    signupBtn.disabled = true;
    signupBtn.innerText = "Creating Account...";

    try {

      // ============================================
      // GET VALUES
      // ============================================

      const full_name =
        document.getElementById("full_name")
        ?.value.trim();

      const student_number =
        document.getElementById("student_number")
        ?.value.trim();

      const email =
        document.getElementById("email")
        ?.value.trim();

      const phone =
        document.getElementById("phone")
        ?.value.trim();

      const password =
        document.getElementById("password")
        ?.value;

      const confirm_password =
        document.getElementById("confirm_password")
        ?.value;

      const selectedRole =
        document.querySelector(
          'input[name="role"]:checked'
        );

      if (!selectedRole) {
        throw new Error("Please select a role.");
      }

      const role_name = selectedRole.value;
      const patient_type =
        selectedRole.dataset.patientType || null;

      // ============================================
      // VALIDATION
      // ============================================

      if (
        !full_name ||
        !student_number ||
        !email ||
        !password ||
        !confirm_password
      ) {
        throw new Error(
          "Please fill in all required fields."
        );
      }

      if (password !== confirm_password) {
        throw new Error(
          "Passwords do not match."
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Password must be at least 6 characters."
        );
      }

      if (!email.includes("@")) {
        throw new Error(
          "Invalid email address."
        );
      }

      // ============================================
      // CHECK IF EMAIL EXISTS
      // ============================================

      const {
        data: existingUser,
        error: existingError
      } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingUser) {
        throw new Error(
          "An account with this email already exists."
        );
      }

      // ============================================
      // GET ROLE ID
      // ============================================

      const {
        data: roleData,
        error: roleError
      } = await supabase
        .from("roles")
        .select("role_id")
        .eq("role_name", role_name)
        .single();

      if (roleError || !roleData) {
        throw new Error(
          "Failed to get role."
        );
      }

      // ============================================
      // INSERT USER
      // ============================================

      const {
        data,
        error: insertError
      } = await supabase
        .from("users")
        .insert([
          {
            role_id: roleData.role_id,
            student_number,
            full_name,
            email,
            password,
            phone,
            patient_type
          }
        ])
        .select();

      if (insertError) {
        console.error(insertError);

        throw new Error(
          insertError.message ||
          "Failed to create account."
        );
      }

      console.log("Inserted user:", data);

      // ============================================
      // SUCCESS
      // ============================================

      showPopup(
        "Account created successfully!",
        "success"
      );

      signupForm.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1800);

    }
    catch (err) {
      console.error("Signup error:", err);

      showPopup(
        err.message || "Signup failed.",
        "error"
      );
    }
    finally {
      signupBtn.disabled = false;
      signupBtn.innerText = "Create Account";
    }
  });
}