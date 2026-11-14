const dashboardLoader = document.querySelector("#dashboard-loader");
const accountName = document.querySelector("#account-name");
const accountRole = document.querySelector("#account-role");
const accountStatus = document.querySelector("#account-status");
const logoutButton = document.querySelector("#logout-button");
const logoutStatus = document.querySelector("#logout-status");
const homeTab = document.querySelector("#student-home-tab");
const profileTab = document.querySelector("#student-profile-tab");
const quizTab = document.querySelector("#student-quiz-tab");
const homeView = document.querySelector("#student-home-view");
const profileView = document.querySelector("#student-profile-view");
const quizView = document.querySelector("#student-quiz-view");
const profileForm = document.querySelector("#student-profile-form");
const profileName = document.querySelector("#student-profile-name");
const profileEmail = document.querySelector("#student-profile-email");
const profileOldPassword = document.querySelector("#student-profile-old-password");
const profilePassword = document.querySelector("#student-profile-password");
const profileStatus = document.querySelector("#student-profile-status");
const saveProfileButton = document.querySelector("#save-student-profile");
const studentList = document.querySelector("#student-list");
const studentListStatus = document.querySelector("#student-list-status");
const studentQuizStatus = document.querySelector("#student-quiz-status");
const studentQuizList = document.querySelector("#student-quiz-list");
const quizPlayer = document.querySelector("#quiz-player");
const quizPlayerTitle = document.querySelector("#quiz-player-title");
const quizPlayerDescription = document.querySelector("#quiz-player-description");
const studentQuizForm = document.querySelector("#student-quiz-form");
const submitQuizButton = document.querySelector("#submit-quiz");
const quizResult = document.querySelector("#quiz-result");
const studentScoresList = document.querySelector("#student-scores-list");
const studentScoresStatus = document.querySelector("#student-scores-status");

let activityAccessToken = null;
let closeSessionOnExit = true;
let activeQuiz = null;
let studentUserId = null;

const switchStudentView = async (view) => {
  const showQuiz = view === "quiz";
  const showProfile = view === "profile";
  dashboardLoader.hidden = false;
  homeTab.disabled = true;
  profileTab.disabled = true;
  quizTab.disabled = true;
  const startedAt = performance.now();

  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    homeView.hidden = showQuiz || showProfile;
    profileView.hidden = !showProfile;
    quizView.hidden = !showQuiz;
    homeTab.classList.toggle("is-active", !showQuiz && !showProfile);
    homeTab.setAttribute("aria-pressed", String(!showQuiz && !showProfile));
    profileTab.classList.toggle("is-active", showProfile);
    profileTab.setAttribute("aria-pressed", String(showProfile));
    quizTab.classList.toggle("is-active", showQuiz);
    quizTab.setAttribute("aria-pressed", String(showQuiz));
    if (showQuiz) {
      await loadAvailableQuizzes();
      await loadMyScores();
    }

    const remainingTime = 350 - (performance.now() - startedAt);
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  } finally {
    dashboardLoader.hidden = true;
    homeTab.disabled = false;
    profileTab.disabled = false;
    quizTab.disabled = false;
  }
};

homeTab.addEventListener("click", () => switchStudentView("home"));
profileTab.addEventListener("click", () => switchStudentView("profile"));
quizTab.addEventListener("click", () => switchStudentView("quiz"));

if (new URLSearchParams(window.location.search).get("loginLog") === "failed") {
  logoutStatus.textContent =
    "You are signed in, but Supabase could not save the login activity log.";
  logoutStatus.hidden = false;
}

window.supabaseClient.auth.onAuthStateChange((_event, session) => {
  activityAccessToken = session?.access_token ?? null;
});

window.addEventListener("pagehide", (event) => {
  if (event.persisted || !closeSessionOnExit) {
    return;
  }

  const sessionId = sessionStorage.getItem("activitySessionId");
  if (sessionId) {
    window.closeActivitySessionOnExit(sessionId, activityAccessToken);
    sessionStorage.removeItem("activitySessionId");
  }
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

const loadStudentDashboard = async () => {
  const { data: userData, error: userError } =
    await window.supabaseClient.auth.getUser();
  if (userError) {
    if (
      userError.name === "AuthSessionMissingError" ||
      userError.message === "Auth session missing!"
    ) {
      await window.supabaseClient.auth.signOut({ scope: "local" });
      window.location.replace("index.html");
      return;
    }
    throw new Error(`Unable to verify your sign-in: ${userError.message}`);
  }

  if (!userData.user) {
    window.location.replace("index.html");
    return;
  }

  if (!userData.user.email_confirmed_at && !userData.user.confirmed_at) {
    await window.supabaseClient.auth.signOut();
    window.location.replace("index.html?verification=required");
    return;
  }

  const { data: profile, error: profileError } = await window.supabaseClient
    .from("profiles")
    .select("full_name, role, avatar_path")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Unable to load your account details: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error("Unable to load your account details: profile not found.");
  }

  if (profile.role === "admin") {
    closeSessionOnExit = false;
    window.location.replace("dashboard.html");
    return;
  }
  if (profile.role !== "student") {
    throw new Error("This dashboard is only available to student accounts.");
  }

  const { data: sessionData, error: sessionError } =
    await window.supabaseClient.auth.getSession();
  if (sessionError) {
    throw new Error(`Unable to load your sign-in session: ${sessionError.message}`);
  }
  activityAccessToken = sessionData.session?.access_token ?? null;
  studentUserId = userData.user.id;
  const profilePictureEditor = window.createProfilePictureEditor({
    userId: studentUserId,
    image: document.querySelector("#profile-picture"),
    input: document.querySelector("#profile-picture-input"),
    button: document.querySelector("#profile-picture-button"),
    status: document.querySelector("#profile-picture-status"),
  });
  profilePictureEditor.setAvatarPath(profile.avatar_path);

  accountName.textContent = `Name: ${profile.full_name || "Unnamed student"}`;
  accountRole.textContent = `Role: ${profile.role}`;
  profileName.value = profile.full_name || "";
  profileEmail.value = userData.user.email || "";
  const presenceError = await window.studentPresence.update(userData.user.id);
  if (presenceError) {
    throw new Error(`Unable to update your online status: ${presenceError.message}`);
  }
  await startActivitySession(userData.user);
  await loadStudents();
  await loadAvailableQuizzes();
  await loadMyScores();
  window.setInterval(async () => {
    const error = await window.studentPresence.update(userData.user.id);
    if (error) {
      studentListStatus.textContent = `Unable to update your online status: ${error.message}`;
      return;
    }
    await loadStudents();
  }, 30_000);
  dashboardLoader.hidden = true;
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
        .eq("id", studentUserId)
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

    accountName.textContent = `Name: ${fullName || "Unnamed student"}`;
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

const loadStudents = async () => {
  const { data: students, error } = await window.supabaseClient
    .from("profiles")
    .select("full_name, last_seen_at, avatar_path")
    .eq("role", "student")
    .order("full_name", { ascending: true });

  if (error) {
    studentListStatus.textContent = `Unable to load student status: ${error.message}`;
    return;
  }

  studentList.replaceChildren();
  for (const student of students) {
    const item = document.createElement("li");
    const identity = document.createElement("div");
    const avatar = document.createElement("img");
    const name = document.createElement("span");
    const status = document.createElement("span");
    const isActive = window.studentPresence.isActive(student.last_seen_at);

    identity.className = "student-identity";
    avatar.className = "student-avatar";
    avatar.alt = "";
    avatar.loading = "lazy";
    window.setProfilePicture(avatar, student.avatar_path);
    name.textContent = student.full_name || "Unnamed student";
    status.className = `presence-status ${isActive ? "is-online" : "is-offline"}`;
    status.textContent = isActive ? "Active" : "Offline";
    identity.append(avatar, name);
    item.append(identity, status);
    studentList.append(item);
  }

  studentListStatus.textContent = students.length
    ? "Student status updates automatically."
    : "No registered students yet.";
};

const loadAvailableQuizzes = async () => {
  const { data: quizzes, error: quizError } = await window.supabaseClient
    .from("quizzes")
    .select("id, title, subject, description, revision")
    .order("created_at", { ascending: false });

  if (quizError) {
    studentQuizStatus.textContent = `Unable to load quizzes: ${quizError.message}`;
    return;
  }

  const { data: attempts, error: attemptsError } = await window.supabaseClient
    .from("quiz_attempts")
    .select("quiz_id, score, total, quiz_revision, submitted_at");

  if (attemptsError) {
    studentQuizStatus.textContent = `Unable to load quiz results: ${attemptsError.message}`;
    return;
  }

  const attemptsByQuiz = new Map(attempts.map((attempt) => [attempt.quiz_id, attempt]));
  studentQuizList.replaceChildren();
  for (const quiz of quizzes) {
    const item = document.createElement("li");
    const details = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("p");
    const previousAttempt = attemptsByQuiz.get(quiz.id);
    const startButton = document.createElement("button");

    title.textContent = quiz.title;
    description.textContent = previousAttempt
      ? `${quiz.subject} — Latest score: ${previousAttempt.score}/${previousAttempt.total}`
      : `${quiz.subject} — ${quiz.description || "Ready to play"}`;
    startButton.className = "secondary-button";
    startButton.type = "button";
    const hasPerfectScore =
      previousAttempt &&
      previousAttempt.score === previousAttempt.total &&
      previousAttempt.quiz_revision === quiz.revision;
    const quizWasUpdated =
      previousAttempt && previousAttempt.quiz_revision !== quiz.revision;
    startButton.textContent = hasPerfectScore
      ? "Perfect score"
      : quizWasUpdated
        ? "Play updated quiz"
      : previousAttempt
        ? "Play again"
        : "Start quiz";
    startButton.disabled = Boolean(hasPerfectScore);
    if (!hasPerfectScore) {
      startButton.addEventListener("click", () => openQuiz(quiz));
    }
    details.append(title, description);
    item.append(details, startButton);
    studentQuizList.append(item);
  }

  studentQuizStatus.textContent = quizzes.length
    ? `${quizzes.length} ${quizzes.length === 1 ? "quiz" : "quizzes"} available`
    : "No quizzes are available yet.";
};

const loadMyScores = async () => {
  const { data: attempts, error } = await window.supabaseClient
    .from("quiz_attempts")
    .select("quiz_id, score, total, submitted_at")
    .eq("user_id", studentUserId);

  if (error) {
    studentScoresStatus.textContent = `Unable to load your scores: ${error.message}`;
    return;
  }

  const { data: quizzes, error: quizzesError } = await window.supabaseClient
    .from("quizzes")
    .select("id, title, subject")
    .order("created_at", { ascending: false });

  if (quizzesError) {
    studentScoresStatus.textContent = `Unable to load quiz subjects: ${quizzesError.message}`;
    return;
  }

  const quizzesById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  studentScoresList.replaceChildren();
  for (const attempt of attempts) {
    const quiz = quizzesById.get(attempt.quiz_id);
    if (!quiz) {
      continue;
    }

    const item = document.createElement("li");
    const details = document.createElement("div");
    const title = document.createElement("strong");
    const score = document.createElement("p");
    title.textContent = quiz.subject;
    score.textContent = `${quiz.title} — ${attempt.score}/${attempt.total} — ${new Intl.DateTimeFormat(
      undefined,
      { dateStyle: "medium", timeStyle: "short" },
    ).format(new Date(attempt.submitted_at))}`;
    details.append(title, score);
    item.append(details);
    studentScoresList.append(item);
  }

  studentScoresStatus.textContent = attempts.length
    ? `${attempts.length} ${attempts.length === 1 ? "score" : "scores"}`
    : "You have not completed a quiz yet.";
};

const openQuiz = async (quiz) => {
  quizResult.textContent = "";
  activeQuiz = quiz;
  quizPlayer.hidden = false;
  quizPlayerTitle.textContent = quiz.title;
  quizPlayerDescription.textContent = quiz.description || "";
  studentQuizForm.replaceChildren();
  studentQuizForm.hidden = false;
  submitQuizButton.hidden = false;

  const { data: questions, error } = await window.supabaseClient
    .from("quiz_questions")
    .select("id, position, prompt, choices")
    .eq("quiz_id", quiz.id)
    .order("position", { ascending: true });

  if (error) {
    quizResult.textContent = `Unable to load quiz questions: ${error.message}`;
    return;
  }
  if (!questions.length) {
    quizResult.textContent = "This quiz has no questions yet.";
    return;
  }

  for (const question of questions) {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    fieldset.className = "quiz-question";
    legend.textContent = `${question.position}. ${question.prompt}`;
    fieldset.append(legend);

    question.choices.forEach((choice, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = question.id;
      input.value = String(index);
      input.required = true;
      label.className = "quiz-answer-choice";
      label.append(input, document.createTextNode(` ${choice}`));
      fieldset.append(label);
    });

    studentQuizForm.append(fieldset);
  }
};

studentQuizForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeQuiz || !studentQuizForm.reportValidity()) {
    return;
  }

  submitQuizButton.disabled = true;
  quizResult.textContent = "Checking your answers…";
  const answers = Object.fromEntries(
    [...studentQuizForm.querySelectorAll("fieldset")].map((question) => [
      question.querySelector('input[type="radio"]').name,
      Number(question.querySelector('input[type="radio"]:checked').value),
    ]),
  );

  try {
    const { data, error } = await window.supabaseClient.rpc(
      "submit_quiz_attempt",
      { p_quiz_id: activeQuiz.id, p_answers: answers },
    );
    if (error) {
      throw new Error(`Unable to submit quiz: ${error.message}`);
    }

    quizResult.textContent = `Your score: ${data.score} out of ${data.total}.`;
    studentQuizForm.hidden = true;
    submitQuizButton.hidden = true;
    await loadAvailableQuizzes();
    await loadMyScores();
  } catch (error) {
    quizResult.textContent = error.message;
  } finally {
    submitQuizButton.disabled = false;
  }
});

submitQuizButton.addEventListener("click", () => {
  studentQuizForm.requestSubmit();
});

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

    const { error } = await window.supabaseClient.auth.signOut({ scope: "local" });
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

loadStudentDashboard().catch((error) => {
  dashboardLoader.hidden = true;
  accountStatus.textContent = error.message;
  accountStatus.hidden = false;
});
