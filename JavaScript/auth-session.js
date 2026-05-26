async function checkSession() {

  const db =
    window.supabaseClient;

  if (!db) {

    window.location.href =
      "login.html";

    return;

  }

  const {
    data: { session }
  } = await db.auth.getSession();

  if (!session) {

    window.location.href =
      "login.html";

    return;

  }

  return session.user;

}