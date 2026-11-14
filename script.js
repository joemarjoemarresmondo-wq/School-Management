const passwordInput = document.querySelector("#password");
const loginForm = document.querySelector("#login-form");
const loginLoader = document.querySelector("#login-loader");
const loginStatus = document.querySelector("#login-status");
const resendVerificationButton = document.querySelector("#resend-verification");
const forgotPasswordButton = document.querySelector("#forgot-password");
const showDeveloperEmailButton = document.querySelector("#show-developer-email");
const developerEmail = document.querySelector("#developer-email");
const loginView = document.querySelector("#login-view");
const registerView = document.querySelector("#register-view");
const registerForm = document.querySelector("#register-form");
const registerStatus = document.querySelector("#register-status");

if (new URLSearchParams(window.location.search).get("verification") === "required") {
  loginStatus.textContent = "Verify your Gmail before signing in.";
  loginStatus.hidden = false;
}
if (new URLSearchParams(window.location.search).get("logoutLog") === "failed") {
  loginStatus.textContent =
    "You are signed out, but Supabase could not save the logout activity log.";
  loginStatus.hidden = false;
}

const showView = (view) => {
  const isRegisterView = view === "register";
  loginView.hidden = isRegisterView;
  registerView.hidden = !isRegisterView;
  (isRegisterView
    ? document.querySelector("#register-name")
    : document.querySelector("#email")
  ).focus();
};

const setFormLoading = (form, isLoading, label) => {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = isLoading;
  button.textContent = isLoading ? label : button.dataset.defaultLabel;
};

const getDashboardUrl = async (user) => {
  const { data: profile, error } = await window.supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load your account role: ${error.message}`);
  }
  if (!profile || !["admin", "student"].includes(profile.role)) {
    throw new Error("Unable to find a valid dashboard for your account.");
  }

  return profile.role === "admin" ? "dashboard.html" : "student-dashboard.html";
};

for (const form of [loginForm, registerForm]) {
  const button = form.querySelector('button[type="submit"]');
  button.dataset.defaultLabel = button.textContent;
}

document
  .querySelector("#show-register")
  .addEventListener("click", () => showView("register"));
document
  .querySelector("#switch-to-register")
  .addEventListener("click", () => showView("register"));
document
  .querySelector("#switch-to-login")
  .addEventListener("click", () => showView("login"));

showDeveloperEmailButton.addEventListener("click", () => {
  const isExpanded = showDeveloperEmailButton.getAttribute("aria-expanded") === "true";
  showDeveloperEmailButton.setAttribute("aria-expanded", String(!isExpanded));
  developerEmail.hidden = isExpanded;
});

document.querySelectorAll(".show-password").forEach((button) => {
  const input = document.getElementById(button.getAttribute("aria-controls"));
  if (!input) {
    throw new Error(`Password toggle target not found: ${button.getAttribute("aria-controls")}`);
  }

  button.addEventListener("click", () => {
    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    button.textContent = isVisible ? "Show" : "Hide";
    button.setAttribute("aria-pressed", String(!isVisible));
  });
});

const redirectIfSignedIn = async () => {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error) {
    loginStatus.textContent = `Unable to check your sign-in status: ${error.message}`;
    loginStatus.hidden = false;
    return;
  }
  if (data.session) {
    window.location.replace(await getDashboardUrl(data.session.user));
  }
};

redirectIfSignedIn().catch((error) => {
  loginStatus.textContent = `Unable to connect to the sign-in service: ${error.message}`;
  loginStatus.hidden = false;
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.hidden = true;
  resendVerificationButton.hidden = true;
  setFormLoading(loginForm, true, "Signing in…");
  loginLoader.hidden = false;

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: loginForm.elements.email.value.trim(),
      password: loginForm.elements.password.value,
    });

    if (error) {
      const needsVerification =
        error.code === "email_not_confirmed" ||
        error.message.toLowerCase().includes("email not confirmed");
      loginStatus.textContent = needsVerification
        ? "Your Gmail is not verified yet. Check your inbox or resend the verification email."
        : error.message;
      loginStatus.hidden = false;
      resendVerificationButton.hidden = !needsVerification;
      loginLoader.hidden = true;
      return;
    }

    const sessionId = window.crypto.randomUUID();
    sessionStorage.setItem("activitySessionId", sessionId);

    const { error: logError } = await window.supabaseClient
      .from("activity_logs")
      .insert({
        user_id: data.user.id,
        event_type: "login",
        session_id: sessionId,
      });

    const dashboardUrl = await getDashboardUrl(data.user);
    window.location.assign(
      logError ? `${dashboardUrl}?loginLog=failed` : dashboardUrl,
    );
  } catch (error) {
    loginStatus.textContent = `Unable to connect to the sign-in service: ${error.message}`;
    loginStatus.hidden = false;
    loginLoader.hidden = true;
  } finally {
    setFormLoading(loginForm, false);
  }
});

forgotPasswordButton.addEventListener("click", async () => {
  const emailInput = loginForm.elements.email;
  if (!emailInput.reportValidity()) {
    loginStatus.textContent = "Enter your Gmail address first so we can send a password reset link.";
    loginStatus.hidden = false;
    emailInput.focus();
    return;
  }

  forgotPasswordButton.disabled = true;
  loginStatus.hidden = true;
  try {
    if (!["http:", "https:"].includes(window.location.protocol)) {
      throw new Error(
        "Open the portal from its deployed website or a local web server before requesting a password reset.",
      );
    }

    const redirectTo = new URL("reset-password.html", window.location.href).href;
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(
      emailInput.value.trim(),
      { redirectTo },
    );

    if (error) {
      const redirectError =
        error.message.toLowerCase().includes("redirect") ||
        error.message.toLowerCase().includes("not allowed");
      loginStatus.textContent = redirectError
        ? `Supabase blocked the reset redirect (${redirectTo}). Add this exact URL or its site path to Authentication → URL Configuration → Redirect URLs, then try again.`
        : `Unable to send a password reset link: ${error.message}`;
    } else {
      loginStatus.textContent =
        "If an account exists for this Gmail, a password reset link has been sent. Open the latest link in this same browser and check your spam folder.";
    }
    loginStatus.hidden = false;
  } catch (error) {
    loginStatus.textContent = `Unable to send a password reset link: ${error.message}`;
    loginStatus.hidden = false;
  } finally {
    forgotPasswordButton.disabled = false;
  }
});

resendVerificationButton.addEventListener("click", async () => {
  const emailInput = loginForm.elements.email;
  if (!emailInput.reportValidity()) {
    return;
  }

  resendVerificationButton.disabled = true;
  loginStatus.hidden = true;
  try {
    const options = {};
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      options.emailRedirectTo = new URL(
        "verify.html?confirmation=signup",
        window.location.href,
      ).href;
    }

    const { error } = await window.supabaseClient.auth.resend({
      type: "signup",
      email: emailInput.value.trim(),
      options,
    });

    if (error) {
      loginStatus.textContent = `Unable to resend verification: ${error.message}`;
    } else {
      loginStatus.textContent =
        "If this Gmail has an unverified account, a new verification email has been sent.";
    }
    loginStatus.hidden = false;
  } catch (error) {
    loginStatus.textContent = `Unable to resend verification: ${error.message}`;
    loginStatus.hidden = false;
  } finally {
    resendVerificationButton.disabled = false;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerStatus.hidden = true;

  const password = registerForm.elements.password.value;
  const confirmPassword = registerForm.elements.confirmPassword.value;
  if (password !== confirmPassword) {
    registerStatus.textContent =
      "The passwords do not match. Please check and try again.";
    registerStatus.hidden = false;
    registerForm.elements.confirmPassword.focus();
    return;
  }

  const signupOptions = {
    data: {
      full_name: registerForm.elements.name.value.trim(),
    },
  };
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    signupOptions.emailRedirectTo = new URL(
      "verify.html?confirmation=signup",
      window.location.href,
    ).href;
  }

  setFormLoading(registerForm, true, "Registering…");
  try {
    const { data, error } = await window.supabaseClient.auth.signUp({
      email: registerForm.elements.email.value.trim(),
      password,
      options: signupOptions,
    });

    if (error) {
      registerStatus.textContent = error.message;
      registerStatus.hidden = false;
      return;
    }

    if (data.session) {
      window.location.assign(await getDashboardUrl(data.session.user));
      return;
    }

    const isEmailVerified = Boolean(
      data.user?.email_confirmed_at || data.user?.confirmed_at,
    );
    registerStatus.textContent = isEmailVerified
      ? "Successfully Registered. Your Gmail is already verified."
      : "Successfully Registered. Check Gmail For Verification.";
    registerStatus.hidden = false;
    registerForm.reset();
  } catch (error) {
    registerStatus.textContent = `Unable to connect to the registration service: ${error.message}`;
    registerStatus.hidden = false;
  } finally {
    setFormLoading(registerForm, false);
  }
});
