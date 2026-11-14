const requireSignedInUser = async () => {
  dashboardLoader.hidden = true;
  accountStatus.textContent = "Checking your Admin sign-in…";
  accountStatus.hidden = false;

  let sessionTimer;
  const { data, error } = await Promise.race([
    window.supabaseClient.auth.getSession(),
    new Promise((_, reject) => {
      sessionTimer = window.setTimeout(
        () =>
          reject(
            new Error(
              "Timed out while checking your sign-in. Refresh the page and try again.",
            ),
          ),
        10_000,
      );
    }),
  ]).finally(() => window.clearTimeout(sessionTimer));

  if (error) {
    accountStatus.textContent = `Unable to verify your sign-in: ${error.message}`;
    accountStatus.hidden = false;
    return;
  }

  const user = data.session?.user;
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  if (!user.email_confirmed_at && !user.confirmed_at) {
    await window.supabaseClient.auth.signOut({ scope: "local" });
    window.location.replace("index.html?verification=required");
    return;
  }

  accountStatus.textContent = "Checking your Admin account…";
  accountStatus.hidden = false;
  startActivitySession(user).catch((activityError) => {
    logoutStatus.textContent = `Unable to save your login activity: ${activityError.message}`;
    logoutStatus.hidden = false;
  });

  let profileLoadTimer;
  const profile = await Promise.race([
    loadSignedInProfile(user),
    new Promise((_, reject) => {
      profileLoadTimer = window.setTimeout(
        () =>
          reject(
            new Error(
              "Timed out while loading your Admin profile. Check your connection and try again.",
            ),
          ),
        15_000,
      );
    }),
  ]).finally(() => window.clearTimeout(profileLoadTimer));
  if (profile?.role === "student") {
    closeActivitySessionOnExit = false;
    window.location.replace("student-dashboard.html");
    return;
  }
  if (profile?.role !== "admin") {
    if (profile) {
      accountStatus.textContent = "This account does not have Admin access.";
      accountStatus.hidden = false;
    }
    return;
  }
  if (profile?.role === "admin") {
    logsTab.hidden = false;
    quizzesTab.hidden = false;
    adminUserId = user.id;
    accountStatus.hidden = true;
    loadLatestActivityLogs().catch((loadError) => {
      latestActivityStatus.textContent =
        `Unable to load latest activity: ${loadError.message}`;
    });
    loadAdminQuizzes().catch((loadError) => {
      adminQuizStatus.textContent = `Unable to load quizzes: ${loadError.message}`;
    });
    loadRegisteredStudents().catch((loadError) => {
      studentListStatus.textContent =
        `Unable to load registered students: ${loadError.message}`;
    });
    window.setInterval(() => {
      loadRegisteredStudents().catch((loadError) => {
        studentListStatus.textContent =
          `Unable to refresh student status: ${loadError.message}`;
      });
    }, 30_000);
    return;
  }
  dashboardLoader.hidden = true;
};

const dashboardLoader = document.querySelector("#dashboard-loader");
const logoutButton = document.querySelector("#logout-button");
const homeTab = document.querySelector("#home-tab");
const profileTab = document.querySelector("#profile-tab");
const logsTab = document.querySelector("#logs-tab");
const quizzesTab = document.querySelector("#quizzes-tab");
const accountName = document.querySelector("#account-name");
const accountRole = document.querySelector("#account-role");
const accountStatus = document.querySelector("#account-status");
const logoutStatus = document.querySelector("#logout-status");
const homeView = document.querySelector("#home-view");
const profileView = document.querySelector("#profile-view");
const profileForm = document.querySelector("#admin-profile-form");
const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const profileOldPassword = document.querySelector("#admin-profile-old-password");
const profilePassword = document.querySelector("#admin-profile-password");
const profileStatus = document.querySelector("#admin-profile-status");
const saveProfileButton = document.querySelector("#save-admin-profile");
const quizzesView = document.querySelector("#quizzes-view");
const studentList = document.querySelector("#student-list");
const studentListStatus = document.querySelector("#student-list-status");
const studentTotalCount = document.querySelector("#student-total-count");
const studentInfoDialog = document.querySelector("#student-info-dialog");
const studentInfoName = document.querySelector("#student-info-name");
const studentInfoEmail = document.querySelector("#student-info-email");
const closeStudentInfoButton = document.querySelector("#close-student-info");
let profilePictureEditor = null;
const activityLogSection = document.querySelector("#activity-log-section");
const activityLogList = document.querySelector("#activity-log-list");
const activityLogStatus = document.querySelector("#activity-log-status");
const activityLogSearch = document.querySelector("#activity-log-search");
const toggleOlderLogsButton = document.querySelector("#toggle-older-logs");
const latestActivityList = document.querySelector("#latest-activity-list");
const latestActivityStatus = document.querySelector("#latest-activity-status");
const viewMoreActivityButton = document.querySelector("#view-more-activity");
const quizForm = document.querySelector("#quiz-form");
const quizQuestionList = document.querySelector("#quiz-question-list");
const quizQuestionTemplate = document.querySelector("#quiz-question-template");
const quizFormStatus = document.querySelector("#quiz-form-status");
const quizSubmitButton = document.querySelector("#quiz-submit");
const cancelQuizEditButton = document.querySelector("#cancel-quiz-edit");
const adminQuizList = document.querySelector("#admin-quiz-list");
const adminQuizStatus = document.querySelector("#admin-quiz-status");
const quizScoresList = document.querySelector("#quiz-scores-list");
const quizScoresStatus = document.querySelector("#quiz-scores-status");
let adminUserId = null;
let activityAccessToken = null;
let closeActivitySessionOnExit = true;
let editingQuizId = null;
let activityLogs = [];
let showOlderActivityLogs = false;
let activityLogRefreshTimer = null;

window.supabaseClient.auth.onAuthStateChange((_event, session) => {
  activityAccessToken = session?.access_token ?? null;
});

window.addEventListener("pagehide", (event) => {
  if (event.persisted || !closeActivitySessionOnExit) {
    return;
  }

  const sessionId = sessionStorage.getItem("activitySessionId");
  if (!sessionId) {
    return;
  }

  window.closeActivitySessionOnExit(sessionId, activityAccessToken);
  sessionStorage.removeItem("activitySessionId");
});

const startActivitySession = async (user) => {
  if (sessionStorage.getItem("activitySessionId")) {
    return;
  }

  const sessionId = window.crypto.randomUUID();
  sessionStorage.setItem("activitySessionId", sessionId);

  const { error } = await window.supabaseClient.from("activity_logs").insert({
    user_id: user.id,
    event_type: "login",
    session_id: sessionId,
  });

  if (error) {
    sessionStorage.removeItem("activitySessionId");
    logoutStatus.textContent = `Unable to save your login activity: ${error.message}`;
    logoutStatus.hidden = false;
  }
};

const setDashboardView = (view) => {
  const showLogs = view === "logs" && !logsTab.hidden;
  const showQuizzes = view === "quizzes" && !quizzesTab.hidden;
  const showProfile = view === "profile";
  homeView.hidden = showLogs || showQuizzes || showProfile;
  profileView.hidden = !showProfile;
  activityLogSection.hidden = !showLogs;
  quizzesView.hidden = !showQuizzes;
  homeTab.classList.toggle("is-active", !showLogs && !showQuizzes && !showProfile);
  homeTab.setAttribute("aria-pressed", String(!showLogs && !showQuizzes && !showProfile));
  profileTab.classList.toggle("is-active", showProfile);
  profileTab.setAttribute("aria-pressed", String(showProfile));
  logsTab.classList.toggle("is-active", showLogs);
  logsTab.setAttribute("aria-pressed", String(showLogs));
  quizzesTab.classList.toggle("is-active", showQuizzes);
  quizzesTab.setAttribute("aria-pressed", String(showQuizzes));
};

const switchDashboardView = async (view) => {
  dashboardLoader.hidden = false;
  homeTab.disabled = true;
  profileTab.disabled = true;
  logsTab.disabled = true;
  quizzesTab.disabled = true;
  const startedAt = performance.now();

  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    setDashboardView(view);
    if (view === "logs") {
      await loadActivityLogs();
    } else if (view === "quizzes") {
      await loadAdminQuizzes();
    }

    const remainingTime = 350 - (performance.now() - startedAt);
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  } finally {
    dashboardLoader.hidden = true;
    homeTab.disabled = false;
    profileTab.disabled = false;
    logsTab.disabled = false;
    quizzesTab.disabled = false;
  }
};

homeTab.addEventListener("click", () => switchDashboardView("home"));
profileTab.addEventListener("click", () => switchDashboardView("profile"));
logsTab.addEventListener("click", () => switchDashboardView("logs"));
quizzesTab.addEventListener("click", () => switchDashboardView("quizzes"));
viewMoreActivityButton.addEventListener("click", () => switchDashboardView("logs"));
activityLogSearch.addEventListener("input", () => renderActivityLogs());
closeStudentInfoButton.addEventListener("click", () => studentInfoDialog.close());
toggleOlderLogsButton.addEventListener("click", () => {
  showOlderActivityLogs = !showOlderActivityLogs;
  renderActivityLogs();
});

const addQuizQuestion = () => {
  const fragment = quizQuestionTemplate.content.cloneNode(true);
  const question = fragment.querySelector(".quiz-question");
  question.querySelector(".quiz-question-legend").textContent =
    `Question ${quizQuestionList.children.length + 1}`;
  question.querySelector(".remove-question").addEventListener("click", () => {
    question.remove();
    updateQuizQuestionLabels();
  });
  quizQuestionList.append(fragment);
  updateQuizQuestionLabels();
};

const updateQuizQuestionLabels = () => {
  [...quizQuestionList.children].forEach((question, index) => {
    question.querySelector(".quiz-question-legend").textContent =
      `Question ${index + 1}`;
    question.querySelector(".remove-question").disabled =
      quizQuestionList.children.length === 1;
  });
};

document.querySelector("#add-quiz-question").addEventListener("click", addQuizQuestion);
addQuizQuestion();

const resetQuizForm = () => {
  quizForm.reset();
  quizQuestionList.replaceChildren();
  addQuizQuestion();
  editingQuizId = null;
  quizSubmitButton.textContent = "Create Quiz";
  cancelQuizEditButton.hidden = true;
};

const editQuiz = async (quiz) => {
  quizFormStatus.textContent = "Loading quiz questions…";
  const { data: questions, error } = await window.supabaseClient.rpc(
    "get_admin_quiz_questions",
    { p_quiz_id: quiz.id },
  );
  if (error) {
    quizFormStatus.textContent = `Unable to load quiz questions: ${error.message}`;
    return;
  }
  if (!questions.length) {
    quizFormStatus.textContent = "This quiz has no questions to edit.";
    return;
  }

  quizForm.elements.title.value = quiz.title;
  quizForm.elements.subject.value = quiz.subject;
  quizForm.elements.description.value = quiz.description || "";
  quizQuestionList.replaceChildren();
  for (const savedQuestion of questions) {
    addQuizQuestion();
    const question = quizQuestionList.lastElementChild;
    question.querySelector(".quiz-question-legend").textContent =
      `Question ${savedQuestion.question_position}`;
    question.querySelector(".question-prompt").value = savedQuestion.prompt;
    question.querySelectorAll(".question-choice").forEach((choice, index) => {
      choice.value = savedQuestion.choices[index];
    });
    question.querySelector(".question-answer").value = String(
      savedQuestion.answer_index,
    );
  }

  editingQuizId = quiz.id;
  quizSubmitButton.textContent = "Save Changes";
  cancelQuizEditButton.hidden = false;
  quizFormStatus.textContent = "Edit the quiz and its questions, then save your changes.";
  quizForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

cancelQuizEditButton.addEventListener("click", () => {
  resetQuizForm();
  quizFormStatus.textContent = "Quiz edit canceled.";
});

const loadAdminQuizzes = async () => {
  const { data: quizzes, error } = await window.supabaseClient
    .from("quizzes")
    .select("id, title, subject, description, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    adminQuizStatus.textContent = `Unable to load quizzes: ${error.message}`;
    return;
  }

  adminQuizList.replaceChildren();
  for (const quiz of quizzes) {
    const item = document.createElement("li");
    const details = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("p");
    const editButton = document.createElement("button");
    title.textContent = `${quiz.subject} — ${quiz.title}`;
    description.textContent = quiz.description || "No description";
    editButton.className = "secondary-button";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editQuiz(quiz));
    details.append(title, description);
    item.append(details, editButton);
    adminQuizList.append(item);
  }

  adminQuizStatus.textContent = quizzes.length
    ? `${quizzes.length} ${quizzes.length === 1 ? "quiz" : "quizzes"} published`
    : "No quizzes created yet.";

  await loadQuizScores(quizzes);
};

const loadQuizScores = async (quizzes) => {
  const { data: attempts, error: attemptsError } = await window.supabaseClient
    .from("quiz_attempts")
    .select("quiz_id, user_id, score, total, submitted_at")
    .order("submitted_at", { ascending: false });

  if (attemptsError) {
    quizScoresStatus.textContent = `Unable to load student scores: ${attemptsError.message}`;
    return;
  }

  const { data: students, error: studentsError } = await window.supabaseClient
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student");

  if (studentsError) {
    quizScoresStatus.textContent = `Unable to load student names: ${studentsError.message}`;
    return;
  }

  const quizzesById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const studentsById = new Map(students.map((student) => [student.id, student]));
  quizScoresList.replaceChildren();

  for (const attempt of attempts) {
    const quiz = quizzesById.get(attempt.quiz_id);
    const student = studentsById.get(attempt.user_id);
    if (!quiz || !student) {
      continue;
    }

    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const subjectCell = document.createElement("td");
    const quizCell = document.createElement("td");
    const scoreCell = document.createElement("td");
    const submittedCell = document.createElement("td");
    nameCell.textContent = student.full_name || "Unnamed student";
    subjectCell.textContent = quiz.subject;
    quizCell.textContent = quiz.title;
    scoreCell.textContent = `${attempt.score}/${attempt.total}`;
    submittedCell.textContent = formatActivityTime(attempt.submitted_at);
    row.append(nameCell, subjectCell, quizCell, scoreCell, submittedCell);
    quizScoresList.append(row);
  }

  quizScoresStatus.textContent = attempts.length
    ? `${attempts.length} ${attempts.length === 1 ? "score" : "scores"}`
    : "No student scores yet.";
};

quizForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!quizForm.reportValidity()) {
    return;
  }

  quizSubmitButton.disabled = true;
  quizFormStatus.textContent = editingQuizId ? "Saving quiz changes…" : "Creating quiz…";

  try {
    const questions = [...quizQuestionList.children].map((question, index) => ({
      question_position: index + 1,
      prompt: question.querySelector(".question-prompt").value.trim(),
      choices: [...question.querySelectorAll(".question-choice")].map((choice) =>
        choice.value.trim(),
      ),
      answer_index: Number(question.querySelector(".question-answer").value),
    }));

    if (editingQuizId) {
      const { error } = await window.supabaseClient.rpc("update_admin_quiz", {
        p_quiz_id: editingQuizId,
        p_title: quizForm.elements.title.value.trim(),
        p_subject: quizForm.elements.subject.value.trim(),
        p_description: quizForm.elements.description.value.trim(),
        p_questions: questions,
      });
      if (error) {
        throw new Error(`Unable to update quiz: ${error.message}`);
      }

      resetQuizForm();
      quizFormStatus.textContent = "Quiz updated successfully.";
      await loadAdminQuizzes();
      return;
    }

    const { data: quiz, error: quizError } = await window.supabaseClient
      .from("quizzes")
      .insert({
        title: quizForm.elements.title.value.trim(),
        subject: quizForm.elements.subject.value.trim(),
        description: quizForm.elements.description.value.trim(),
        created_by: adminUserId,
      })
      .select("id")
      .single();

    if (quizError) {
      throw new Error(`Unable to create quiz: ${quizError.message}`);
    }

    const newQuestions = questions.map(({ question_position, ...question }) => ({
      quiz_id: quiz.id,
      position: question_position,
      ...question,
    }));
    const { error: questionError } = await window.supabaseClient
      .from("quiz_questions")
      .insert(newQuestions);

    if (questionError) {
      const { error: cleanupError } = await window.supabaseClient
        .from("quizzes")
        .delete()
        .eq("id", quiz.id);
      const cleanupMessage = cleanupError
        ? ` Quiz cleanup failed: ${cleanupError.message}`
        : "";
      throw new Error(`Unable to save quiz questions: ${questionError.message}.${cleanupMessage}`);
    }

    resetQuizForm();
    quizFormStatus.textContent = "Quiz created and published for students.";
    await loadAdminQuizzes();
  } catch (error) {
    quizFormStatus.textContent = error.message;
  } finally {
    quizSubmitButton.disabled = false;
  }
});

if (new URLSearchParams(window.location.search).get("loginLog") === "failed") {
  logoutStatus.textContent =
    "You are signed in, but Supabase could not save the login activity log.";
  logoutStatus.hidden = false;
}

const loadSignedInProfile = async (user) => {
  const { data: profile, error } = await window.supabaseClient
    .from("profiles")
    .select("full_name, role, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    accountStatus.textContent = `Unable to load your account details: ${error.message}`;
    accountStatus.hidden = false;
    return null;
  }

  if (!profile) {
    accountStatus.textContent = "Unable to load your account details: profile not found.";
    accountStatus.hidden = false;
    return null;
  }

  accountName.textContent = `Name: ${profile.full_name || "Unnamed user"}`;
  accountRole.textContent = `Role: ${profile.role}`;
  profileName.value = profile.full_name || "";
  profileEmail.value = user.email || "";
  profilePictureEditor = window.createProfilePictureEditor({
    userId: user.id,
    image: document.querySelector("#profile-picture"),
    input: document.querySelector("#profile-picture-input"),
    button: document.querySelector("#profile-picture-button"),
    status: document.querySelector("#profile-picture-status"),
  });
  profilePictureEditor.setAvatarPath(profile.avatar_path);
  return profile;
};

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fullName = profileName.value.trim();
  const password = profilePassword.value;
  profileName.setCustomValidity(fullName ? "" : "Enter your full name.");
  profileOldPassword.required = Boolean(password);
  profileOldPassword.setCustomValidity(
    password && !profileOldPassword.value
      ? "Enter your old password to change your password."
      : "",
  );
  if (!profileForm.reportValidity()) {
    return;
  }

  const email = profileEmail.value.trim();
  const oldPassword = profileOldPassword.value;
  const { data: userData, error: userError } =
    await window.supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    profileStatus.textContent = `Unable to verify your account: ${
      userError?.message || "no signed-in user was found."
    }`;
    profileStatus.hidden = false;
    return;
  }

  saveProfileButton.disabled = true;
  profileStatus.hidden = true;
  dashboardLoader.hidden = false;

  try {
    if (password) {
      const { data: verifiedUser, error: passwordError } =
        await window.supabaseClient.auth.signInWithPassword({
          email: userData.user.email,
          password: oldPassword,
        });
      if (passwordError) {
        if (
          passwordError.code === "invalid_credentials" ||
          passwordError.message === "Invalid login credentials"
        ) {
          throw new Error("Old password is incorrect.");
        }
        throw new Error(
          `Unable to verify your old password: ${passwordError.message}`,
        );
      }
      if (verifiedUser.user?.id !== userData.user.id) {
        throw new Error("Unable to verify your old password for this account.");
      }
    }

    const authUpdates = { data: { full_name: fullName } };
    if (email !== userData.user.email) {
      authUpdates.email = email;
    }
    if (password) {
      authUpdates.password = password;
    }

    const { error: authUpdateError } =
      await window.supabaseClient.auth.updateUser(authUpdates);
    if (authUpdateError) {
      throw new Error(`Unable to update your account: ${authUpdateError.message}`);
    }

    const { data: updatedProfile, error: profileUpdateError } =
      await window.supabaseClient
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userData.user.id)
        .select("id")
        .maybeSingle();

    if (profileUpdateError) {
      throw new Error(
        `Your account settings were updated, but your profile name could not be saved: ${profileUpdateError.message}`,
      );
    }
    if (!updatedProfile) {
      throw new Error(
        "Your account settings were updated, but no profile record was changed.",
      );
    }

    accountName.textContent = `Name: ${fullName || "Unnamed user"}`;
    profileOldPassword.value = "";
    profilePassword.value = "";
    const changedPassword = password ? " Your password was updated." : "";
    profileStatus.textContent =
      email !== userData.user.email
        ? `Profile updated. Check your email and confirm the change before the new address becomes active.${changedPassword}`
        : `Profile updated.${changedPassword}`;
    profileStatus.hidden = false;
  } catch (error) {
    profileStatus.textContent = error.message;
    profileStatus.hidden = false;
  } finally {
    dashboardLoader.hidden = true;
    saveProfileButton.disabled = false;
  }
});

for (const button of profileForm.querySelectorAll(".show-password")) {
  const passwordInput = document.getElementById(button.getAttribute("aria-controls"));
  button.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    button.textContent = isVisible ? "Show" : "Hide";
    button.setAttribute("aria-pressed", String(!isVisible));
  });
}

const formatActivityTime = (timestamp) => {
  if (!timestamp) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
};

const ACTIVITY_LOG_AGE_LIMIT = 24 * 60 * 60 * 1000;

const isOlderActivityLog = (log, now = Date.now()) => {
  const timestamp = Date.parse(log.logout_at || log.login_at);
  return !Number.isFinite(timestamp) || now - timestamp >= ACTIVITY_LOG_AGE_LIMIT;
};

const loadLatestActivityLogs = async () => {
  const { data: logs, error } = await window.supabaseClient
    .from("activity_logs")
    .select("full_name, email, role, event_type, login_at, logout_at")
    .order("login_at", { ascending: false })
    .limit(5);

  if (error) {
    latestActivityStatus.textContent = `Unable to load latest activity: ${error.message}`;
    return;
  }

  const recentLogs = logs.filter((log) => !isOlderActivityLog(log));
  latestActivityList.replaceChildren();
  for (const log of recentLogs) {
    const item = document.createElement("li");
    const details = document.createElement("div");
    const name = document.createElement("strong");
    const email = document.createElement("p");
    const activity = document.createElement("p");
    const logTime =
      log.event_type === "logout" ? log.logout_at || log.login_at : log.login_at;

    name.textContent = log.full_name || "Unnamed user";
    email.textContent = `Email: ${log.email || "Not available"}`;
    activity.textContent = `${log.event_type === "logout" ? "Logged out" : "Logged in"} · ${
      log.role || "Account"
    } · ${formatActivityTime(logTime)}`;
    details.append(name, email, activity);
    item.append(details);
    latestActivityList.append(item);
  }

  latestActivityStatus.textContent = recentLogs.length
    ? `Showing ${recentLogs.length} recent ${recentLogs.length === 1 ? "log" : "logs"}.`
    : "No activity logs in the last 24 hours.";
};

const renderActivityLogs = () => {
  const now = Date.now();
  const olderLogs = activityLogs.filter((log) => isOlderActivityLog(log, now));
  const searchTerm = activityLogSearch.value.trim().toLocaleLowerCase();
  const visibleLogs = activityLogs.filter((log) => {
    if (!showOlderActivityLogs && isOlderActivityLog(log, now)) {
      return false;
    }

    return (log.full_name || "").toLocaleLowerCase().includes(searchTerm);
  });

  activityLogList.replaceChildren();
  for (const [index, log] of visibleLogs.entries()) {
    const row = document.createElement("tr");
    const numberCell = document.createElement("td");
    const nameCell = document.createElement("td");
    const emailCell = document.createElement("td");
    const roleCell = document.createElement("td");
    const loginCell = document.createElement("td");
    const logoutCell = document.createElement("td");

    numberCell.textContent = String(index + 1);
    nameCell.textContent = log.full_name || "Unnamed user";
    emailCell.textContent = log.email || "—";
    roleCell.textContent = log.role || "—";
    loginCell.textContent =
      log.event_type === "logout" ? "—" : formatActivityTime(log.login_at);
    logoutCell.textContent = formatActivityTime(
      log.event_type === "logout" ? log.logout_at || log.login_at : log.logout_at,
    );

    row.append(numberCell, nameCell, emailCell, roleCell, loginCell, logoutCell);
    activityLogList.append(row);
  }

  if (!olderLogs.length) {
    showOlderActivityLogs = false;
  }
  toggleOlderLogsButton.hidden = olderLogs.length === 0;
  toggleOlderLogsButton.textContent = showOlderActivityLogs
    ? "Hide older logs"
    : `Show older logs (${olderLogs.length})`;
  toggleOlderLogsButton.setAttribute("aria-expanded", String(showOlderActivityLogs));

  if (!visibleLogs.length) {
    activityLogStatus.textContent = searchTerm
      ? "No activity logs match that name in the current view."
      : "No activity logs in the last 24 hours.";
  } else if (showOlderActivityLogs) {
    activityLogStatus.textContent =
      `Showing ${visibleLogs.length} ${visibleLogs.length === 1 ? "log" : "logs"}, including older logs. Older logs are retained, not deleted.`;
  } else {
    activityLogStatus.textContent = searchTerm
      ? `Showing ${visibleLogs.length} matching recent ${visibleLogs.length === 1 ? "log" : "logs"}. Older logs are hidden, not deleted.`
      : `Showing ${visibleLogs.length} recent ${visibleLogs.length === 1 ? "log" : "logs"}. ${olderLogs.length} older ${olderLogs.length === 1 ? "log is" : "logs are"} hidden, not deleted.`;
  }
};

const scheduleActivityLogRefresh = () => {
  window.clearTimeout(activityLogRefreshTimer);
  const now = Date.now();
  const nextExpiration = activityLogs
    .map((log) => Date.parse(log.logout_at || log.login_at) + ACTIVITY_LOG_AGE_LIMIT)
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > now)
    .sort((left, right) => left - right)[0];

  if (nextExpiration) {
    activityLogRefreshTimer = window.setTimeout(() => {
      renderActivityLogs();
      scheduleActivityLogRefresh();
    }, Math.min(nextExpiration - now + 10, 2_147_483_647));
  }
};

const loadActivityLogs = async () => {
  const pageSize = 500;
  const logs = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await window.supabaseClient
      .from("activity_logs")
      .select("full_name, email, role, event_type, login_at, logout_at")
      .order("login_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      activityLogStatus.textContent = `Unable to load activity logs: ${error.message}`;
      return;
    }

    logs.push(...data);
    if (data.length < pageSize) {
      break;
    }
  }

  activityLogs = logs;
  renderActivityLogs();
  scheduleActivityLogRefresh();
};

const loadRegisteredStudents = async () => {
  const pageSize = 500;
  const students = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await window.supabaseClient
      .rpc("get_admin_student_directory")
      .range(from, from + pageSize - 1);

    if (error) {
      studentListStatus.textContent = `Unable to load registered students: ${error.message}`;
      return;
    }

    students.push(...data);
    if (data.length < pageSize) {
      break;
    }
  }

  studentList.replaceChildren();
  studentTotalCount.textContent = String(students.length);
  for (const student of students) {
    const item = document.createElement("li");
    const identity = document.createElement("div");
    const avatar = document.createElement("img");
    const name = document.createElement("span");
    const status = document.createElement("span");
    const viewInfoButton = document.createElement("button");
    const isActive = window.studentPresence.isActive(student.last_seen_at);

    identity.className = "student-identity";
    avatar.className = "student-avatar";
    avatar.alt = "";
    avatar.loading = "lazy";
    window.setProfilePicture(avatar, student.avatar_path);
    name.textContent = student.full_name || "Unnamed student";
    status.className = `presence-status ${isActive ? "is-online" : "is-offline"}`;
    status.textContent = isActive ? "Active" : "Offline";
    viewInfoButton.type = "button";
    viewInfoButton.className = "secondary-button view-student-info";
    viewInfoButton.textContent = "View Student Info";
    viewInfoButton.setAttribute(
      "aria-label",
      `View info for ${student.full_name || "unnamed student"}`,
    );
    viewInfoButton.addEventListener("click", () => {
      studentInfoName.textContent = student.full_name || "Unnamed student";
      studentInfoEmail.textContent = student.email || "Email not available";
      studentInfoDialog.showModal();
    });
    identity.append(avatar, name);
    item.append(identity, status, viewInfoButton);
    studentList.append(item);
  }

  studentListStatus.textContent = students.length
    ? "Student status updates automatically."
    : "No registered students yet.";
};

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutStatus.hidden = true;
  logoutButton.textContent = "Logging out…";
  dashboardLoader.hidden = false;

  try {
    let logoutLogFailed = false;
    const { data: userData, error: userError } =
      await window.supabaseClient.auth.getUser();

    if (userError || !userData.user) {
      logoutLogFailed = true;
    } else {
      const sessionId = sessionStorage.getItem("activitySessionId");
      if (!sessionId) {
        logoutLogFailed = true;
      } else {
        const { data: updatedLogs, error: logError } = await window.supabaseClient
          .from("activity_logs")
          .update({ logout_at: new Date().toISOString() })
          .eq("user_id", userData.user.id)
          .eq("session_id", sessionId)
          .is("logout_at", null)
          .select("id")
          .maybeSingle();

        logoutLogFailed = Boolean(logError) || !updatedLogs;
      }
      sessionStorage.removeItem("activitySessionId");
    }

    const { error } = await window.supabaseClient.auth.signOut({
      scope: "local",
    });
    if (error) {
      dashboardLoader.hidden = true;
      logoutStatus.textContent = `Unable to log out: ${error.message}`;
      logoutStatus.hidden = false;
      return;
    }

    window.location.replace(
      logoutLogFailed ? "index.html?logoutLog=failed" : "index.html",
    );
  } catch (error) {
    dashboardLoader.hidden = true;
    logoutStatus.textContent = `Unable to log out: ${error.message}`;
    logoutStatus.hidden = false;
  } finally {
    logoutButton.disabled = false;
    logoutButton.textContent = "Logout";
  }
});

requireSignedInUser().catch((error) => {
  dashboardLoader.hidden = true;
  accountStatus.textContent = `Unable to load the Admin Dashboard: ${error.message}`;
  accountStatus.hidden = false;
});
