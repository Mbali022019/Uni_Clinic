console.log("LOGIN JS LOADED");

// ============================================
// SUPABASE CLIENT
// ============================================
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
  popup.innerHTML = `<div class="popup-content">${message}</div>`;
  document.body.appendChild(popup);

  setTimeout(() => popup.classList.add("show"), 100);
  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => popup.remove(), 300);
  }, 3000);
}

// ============================================
// PASSWORD TOGGLE (WORKING)
// ============================================

const togglePasswordBtn = document.getElementById("togglePassword");

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", () => {
    const passwordInput = document.getElementById("password");
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    
    // Update eye icon
    const eyeIcon = togglePasswordBtn.querySelector("svg");
    if (eyeIcon) {
      if (!isHidden) {
        eyeIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        `;
      } else {
        eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        `;
      }
    }
  });
}

// ============================================
// GET SELECTED ROLE FROM CARDS
// ============================================

function getSelectedRole() {
  const selectedRadio = document.querySelector('input[name="role"]:checked');
  if (selectedRadio) {
    return selectedRadio.value;
  }
  return "";
}

function setActiveRoleCard() {
  const cards = document.querySelectorAll('.role-card');
  cards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.checked) {
      card.classList.add('active-role');
    } else {
      card.classList.remove('active-role');
    }
  });
}

// ============================================
// LOAD ROLES (Updated for role cards)
// ============================================

async function loadRoles() {
  if (!db || typeof db.from !== "function") {
    console.error("Invalid Supabase client:", db);
    return;
  }

  try {
    console.log("Loading roles...");
    const { data, error } = await db
      .from("roles")
      .select("role_name")
      .order("role_name");

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log("No roles found");
      return;
    }

    // Map database roles to our role card values
    const roleMap = {
      'student': 'student',
      'patient': 'student',
      'nurse': 'nurse',
      'admin': 'admin'
    };

    // Check which roles exist in DB and enable corresponding cards
    const dbRoleNames = data.map(r => r.role_name.toLowerCase());
    
    const roleCards = document.querySelectorAll('.role-card');
    roleCards.forEach(card => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        const roleValue = radio.value;
        // Check if this role exists in database
        const roleExists = dbRoleNames.includes(roleValue) || 
                          (roleValue === 'student' && dbRoleNames.includes('patient'));
        
        if (!roleExists) {
          card.style.opacity = '0.5';
          card.style.cursor = 'not-allowed';
          radio.disabled = true;
        } else {
          card.style.opacity = '1';
          card.style.cursor = 'pointer';
          radio.disabled = false;
        }
      }
    });

    console.log("Roles loaded successfully.");
  }
  catch (err) {
    console.error("loadRoles error:", err);
  }
}

// ============================================
// LOGIN (UPDATED for role cards)
// ============================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const loginBtn = document.getElementById("loginBtn");
    loginBtn.disabled = true;
    loginBtn.innerText = "Signing In...";

    try {
      if (!db || typeof db.from !== "function") {
        throw new Error("Database connection failed.");
      }

      const loginInput = document.getElementById("loginInput").value.trim();
      const password = document.getElementById("password").value;
      const role = getSelectedRole();

      if (!loginInput || !password || !role) {
        throw new Error("Please fill in all fields and select a role.");
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
        .or(`email.eq.${loginInput},student_number.eq.${loginInput}`)
        .eq("password", password)
        .single();

      if (error || !data) {
        throw new Error("Account not found. Please create an account.");
      }

      // ========================================
      // CHECK ROLE
      // ========================================

      if (!data.roles || data.roles.role_name.toLowerCase() !== role.toLowerCase()) {
        throw new Error("Incorrect role selected.");
      }

      // ========================================
      // SAVE USER
      // ========================================

      localStorage.setItem("uniclinic_user", JSON.stringify(data));

      showPopup("Login successful!", "success");

      setTimeout(() => {
        const userRole = data.roles.role_name.toLowerCase();
        
        if (userRole === "admin") {
          window.location.href = "adminDash.html";
        } else if (userRole === "nurse") {
          window.location.href = "nurseDash.html";
        } else {
          window.location.href = "sDashboard.html";
        }
      }, 1500);
    }
    catch (err) {
      console.error("Login error:", err);
      showPopup(err.message || "Login failed.", "error");
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
  setActiveRoleCard();
  
  // Add click handlers for role cards
  const roleCards = document.querySelectorAll('.role-card');
  roleCards.forEach(card => {
    card.addEventListener('click', function(e) {
      const radio = this.querySelector('input[type="radio"]');
      if (radio && !radio.disabled) {
        radio.checked = true;
        setActiveRoleCard();
      }
    });
  });
});