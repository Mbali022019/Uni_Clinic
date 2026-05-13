console.log("LOGIN JS LOADED");

// ============================================
// SUPABASE CLIENT
// ============================================
// Use "db" instead of "supabase" because the
// Supabase CDN already defines a global object
// named "supabase".
const db = window.supabaseClient;

console.log("Supabase Client:", db);

if (!db) {
  console.error("Supabase client failed to load.");
  alert("Supabase client failed to load. Check your supabase.js path.");
}


// ============================================
// POPUP
// ============================================

function showPopup(message, type = "success") {
  const popup = document.createElement("div");

  popup.className = `popup ${type}`;

  popup.innerHTML = `
    <div class="popup-content">
      ${message}
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
  }, 3000);
}



// PASSWORD TOGGLE
// ============================================

const togglePasswordBtn =
  document.getElementById("togglePassword");

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", () => {
    const passwordInput =
      document.getElementById("password");

    const eyeIcon =
      document.getElementById("eyeIcon");

    const isHidden =
      passwordInput.type === "password";

    // Toggle input type
    passwordInput.type =
      isHidden ? "text" : "password";

    // Update icon
    eyeIcon.innerHTML = isHidden
      ? `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      `
      : `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
  });
}


// ============================================
// LOAD ROLES
// ============================================

async function loadRoles() {
  const roleSelect =
    document.getElementById("roleSelect");

  if (!roleSelect) return;

  // Verify Supabase client is valid
  if (!db || typeof db.from !== "function") {
    console.error("Invalid Supabase client:", db);

    roleSelect.innerHTML =
      `<option value="">Supabase not loaded</option>`;

    return;
  }

  try {
    console.log("Loading roles...");

    const { data, error } = await db
      .from("roles")
      .select("role_name")
      .order("role_name");

    if (error) throw error;

    roleSelect.innerHTML =
      `<option value="">Select Role</option>`;

    if (!data || data.length === 0) {
      roleSelect.innerHTML =
        `<option value="">No roles found</option>`;
      return;
    }

    data.forEach(role => {
      roleSelect.innerHTML += `
        <option value="${role.role_name}">
          ${role.role_name}
        </option>
      `;
    });

    console.log("Roles loaded successfully.");
  }
  catch (err) {
    console.error("loadRoles error:", err);

    roleSelect.innerHTML =
      `<option value="">Failed to load roles</option>`;
  }
}


// ============================================
// LOGIN
// ============================================

const loginForm =
  document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const loginBtn =
      document.getElementById("loginBtn");

    loginBtn.disabled = true;
    loginBtn.innerText = "Signing In...";

    try {
      if (!db || typeof db.from !== "function") {
        throw new Error("Database connection failed.");
      }

      const loginInput =
        document
          .getElementById("loginInput")
          .value
          .trim();

      const password =
        document
          .getElementById("password")
          .value;

      const role =
        document
          .getElementById("roleSelect")
          .value;

      if (!loginInput || !password || !role) {
        throw new Error(
          "Please fill in all fields."
        );
      }

      // ========================================
      // FIND USER
      // ========================================

      const { data, error } = await db
        .from("users")
        .select(`
          *,
          roles (
            role_name
          )
        `)
        .or(
          `email.eq.${loginInput},student_number.eq.${loginInput}`
        )
        .eq("password", password)
        .single();

      if (error || !data) {
        throw new Error(
          "Account not found. Please create an account."
        );
      }

      // ========================================
      // CHECK ROLE
      // ========================================

      if (
        !data.roles ||
        data.roles.role_name.toLowerCase() !==
          role.toLowerCase()
      ) {
        throw new Error(
          "Incorrect role selected."
        );
      }

      // ========================================
      // SAVE USER
      // ========================================

      localStorage.setItem(
        "uniclinic_user",
        JSON.stringify(data)
      );

      showPopup(
        "Login successful!",
        "success"
      );

      setTimeout(() => {
        window.location.href =
          "sDashboard.html";
      }, 1500);
    }
    catch (err) {
      console.error("Login error:", err);

      showPopup(
        err.message || "Login failed.",
        "error"
      );
    }
    finally {
      loginBtn.disabled = false;
      loginBtn.innerText = "Sign In";
    }
  });
}


// ============================================
// INITIALIZE
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadRoles();
});