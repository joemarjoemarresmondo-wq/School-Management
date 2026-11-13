const resetForm = document.querySelector("#reset-password-form");
const resetStatus = document.querySelector("#reset-status");
const updateButton = resetForm.querySelector('button[type="submit"]');
const defaultButtonText = updateButton.textContent;
let recoverySessionReady = false;

resetForm.querySelectorAll("input, button").forEach((control) => {
  control.disabled = true;
});

const checkRecoverySession = async () => {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error) {
    throw error;
  }

  if (!data.session) {
    resetForm.hidden = true;
    resetStatus.textContent =
      "This password reset link is invalid or expired. Request a new one from the login page.";
    resetStatus.hidden = false;
    return;
  }

  recoverySessionReady = true;
  resetForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = false;
  });
};

checkRecoverySession().catch((error) => {
  resetForm.hidden = true;
  resetStatus.textContent = `Unable to verify this reset link: ${error.message}`;
  resetStatus.hidden = false;
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
