const resetForm = document.querySelector("#reset-password-form");
const resetStatus = document.querySelector("#reset-status");
const updateButton = resetForm.querySelector('button[type="submit"]');
const defaultButtonText = updateButton.textContent;
let recoverySessionReady = false;

resetForm.querySelectorAll("input, button").forEach((control) => {
  control.disabled = true;
});

const showResetError = (message) => {
  resetForm.hidden = true;
  resetStatus.textContent = message;
  resetStatus.hidden = false;
};

const processRecoveryCallback = async () => {
  const callbackUrl = new URL(window.location.href);
  const query = callbackUrl.searchParams;
  const hash = new URLSearchParams(callbackUrl.hash.slice(1));
  const callbackError =
    query.get("error_description") ||
    query.get("error") ||
    hash.get("error_description") ||
    hash.get("error");

  if (callbackError) {
    throw new Error(callbackError);
  }

  const existingSession = await window.supabaseClient.auth.getSession();
  if (existingSession.error) {
    throw existingSession.error;
  }
  if (existingSession.data.session) {
    return existingSession.data.session;
  }

  const code = query.get("code");
  if (code) {
    const { data, error } =
      await window.supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return data.session;
  }

  const tokenHash = query.get("token_hash");
  const type = query.get("type") || hash.get("type");
  if (tokenHash && type === "recovery") {
    const { data, error } = await window.supabaseClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      throw error;
    }
    return data.session;
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (type === "recovery" && accessToken && refreshToken) {
    const { data, error } = await window.supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    return data.session;
  }

  return null;
};

const checkRecoverySession = async () => {
  const session = await processRecoveryCallback();
  if (!session) {
    showResetError(
      "No valid password reset session was found. Request a new reset link and open the newest email link in the same browser.",
    );
    return;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
  recoverySessionReady = true;
  resetStatus.textContent = "Reset link verified. Choose a new password.";
  resetStatus.hidden = false;
  resetForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = false;
  });
};

checkRecoverySession().catch((error) => {
  showResetError(
    `Unable to verify this reset link: ${error.message}. Request a new link if this one has expired.`,
  );
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!recoverySessionReady) {
    return;
  }
  resetStatus.hidden = true;

  const password = resetForm.elements.password.value;
  if (password !== resetForm.elements.confirmPassword.value) {
    resetStatus.textContent = "The passwords do not match. Please try again.";
    resetStatus.hidden = false;
    resetForm.elements.confirmPassword.focus();
    return;
  }

  updateButton.disabled = true;
  updateButton.textContent = "Updating…";
  try {
    const { error } = await window.supabaseClient.auth.updateUser({ password });
    if (error) {
      resetStatus.textContent = `Unable to update your password: ${error.message}`;
      resetStatus.hidden = false;
      return;
    }

    const { error: signOutError } =
      await window.supabaseClient.auth.signOut({ scope: "local" });
    if (signOutError) {
      throw new Error(`Password updated, but unable to finish reset: ${signOutError.message}`);
    }

    resetForm.reset();
    resetForm.hidden = true;
    resetStatus.textContent = "Password updated successfully. You can now sign in.";
    resetStatus.hidden = false;
  } catch (error) {
    resetStatus.textContent = `Unable to update your password: ${error.message}`;
    resetStatus.hidden = false;
  } finally {
    updateButton.disabled = false;
    updateButton.textContent = defaultButtonText;
  }
});
