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
// SIGNUP FORM
// ============================================

const signupForm = document.getElementById("signupForm");

const signupBtn = document.getElementById("signupBtn");


signupForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  signupBtn.disabled = true;

  signupBtn.innerText = "Creating Account...";

  try {

    // ============================================
    // GET VALUES
    // ============================================

    const full_name =
      document.getElementById("full_name").value.trim();

    const student_number =
      document.getElementById("student_number").value.trim();

    const email =
      document.getElementById("email").value.trim();

    const phone =
      document.getElementById("phone").value.trim();

    const password =
      document.getElementById("password").value;

    const confirm_password =
      document.getElementById("confirm_password").value;

    const selectedRole =
      document.querySelector('input[name="role"]:checked');

    const role_name = selectedRole.value;

    const patient_type =
      selectedRole.dataset.patientType;


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
      throw new Error("Please fill in all required fields.");
    }

    if (password !== confirm_password) {
      throw new Error("Passwords do not match.");
    }

    if (password.length < 6) {
      throw new Error(
        "Password must be at least 6 characters."
      );
    }

    if (!email.includes("@")) {
      throw new Error("Invalid email address.");
    }


    // ============================================
    // CHECK IF EMAIL EXISTS
    // ============================================

    const { data: existingUser } =
      await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

    if (existingUser) {
      throw new Error(
        "An account with this email already exists."
      );
    }


    // ============================================
    // GET ROLE ID
    // ============================================

    const { data: roleData, error: roleError } =
      await supabase
        .from("roles")
        .select("role_id")
        .eq("role_name", role_name)
        .single();

    if (roleError) {
      throw new Error("Failed to get role.");
    }


    // ============================================
    // INSERT USER
    // ============================================

    const { error: insertError } =
      await supabase
        .from("users")
        .insert([{
          role_id: roleData.role_id,
          student_number,
          full_name,
          email,
          password,
          phone,
          patient_type
        }]);

    if (insertError) {

      console.error(insertError);

      throw new Error(
        insertError.message || "Failed to create account."
      );
    }


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

    console.error(err);

    showPopup(
      err.message || "Signup failed.",
      "error"
    );

  }

  finally {

    signupBtn.disabled = false;

    signupBtn.innerText = "Create Account";

  }




  const { data, error: insertError } =
  await supabase
    .from("users")
    .insert([{
      role_id: roleData.role_id,
      student_number,
      full_name,
      email,
      password,
      phone,
      patient_type
    }])
    .select();

console.log(data);

});