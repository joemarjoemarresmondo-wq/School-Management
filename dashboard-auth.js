const requireSignedInUser = async () => {
  const { data, error } = await window.supabaseClient.auth.getUser();
  if (error) {
    if (
      error.name === "AuthSessionMissingError" ||
      error.message === "Auth session missing!"
    ) {
      await window.supabaseClient.auth.signOut({ scope: "local" });
      window.location.replace("index.html");
      return;
    }
    document.body.textContent = `Unable to verify your sign-in: ${error.message}`;
    return;
  }

  if (!data.user) {
    window.location.replace("index.html");
    return;
  }

  if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
    await window.supabaseClient.auth.signOut();
    window.location.replace("index.html?verification=required");
    return;
  }

  const { data: sessionData, error: sessionError } =
    await window.supabaseClient.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  activityAccessToken = sessionData.session?.access_token ?? null;
  await startActivitySession(data.user);

  const profile = await loadSignedInProfile(data.user);
  if (profile?.role === "student") {
    closeActivitySessionOnExit = false;
    window.location.replace("student-dashboard.html");
    return;
  }
  if (profile?.role !== "admin") {
    dashboardLoader.hidden = true;
    return;
  }
  if (profile?.role === "admin") {
    logsTab.hidden = false;
    quizzesTab.hidden = false;
    adminUserId = data.user.id;
    await loadActivityLogs();
    await loadAdminQuizzes();
  }
  await loadRegisteredStudents();
  window.setInterval(() => {
    loadRegisteredStudents().catch((error) => {
      studentListStatus.textContent = `Unable to refresh student status: ${error.message}`;
    });
  }, 30_000);
  dashboardLoader.hidden = true;
};

const dashboardLoader = document.querySelector("#dashboard-loader");
const logoutButton = document.querySelector("#logout-button");
const homeTab = document.querySelector("#home-tab");
const logsTab = document.querySelector("#logs-tab");
const quizzesTab = document.querySelector("#quizzes-tab");
const accountName = document.querySelector("#account-name");
const accountRole = document.querySelector("#account-role");
const accountStatus = document.querySelector("#account-status");
const logoutStatus = document.querySelector("#logout-status");
const homeView = document.querySelector("#home-view");
const quizzesView = document.querySelector("#quizzes-view");
const studentList = document.querySelector("#student-list");
const studentListStatus = document.querySelector("#student-list-status");
const studentTotalCount = document.querySelector("#student-total-count");
const activityLogSection = document.querySelector("#activity-log-section");
const activityLogList = document.querySelector("#activity-log-list");
const activityLogStatus = document.querySelector("#activity-log-status");
const quizForm = document.querySelector("#quiz-form");
const quizQuestionList = document.querySelector("#quiz-question-list");
const quizQuestionTemplate = document.querySelector("#quiz-question-template");
const quizFormStatus = document.querySelector("#quiz-form-status");
const adminQuizList = document.querySelector("#admin-quiz-list");
const adminQuizStatus = document.querySelector("#admin-quiz-status");
const quizScoresList = document.querySelector("#quiz-scores-list");
const quizScoresStatus = document.querySelector("#quiz-scores-status");
let adminUserId = null;
let activityAccessToken = null;
let closeActivitySessionOnExit = true;

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
  homeView.hidden = showLogs;
  activityLogSection.hidden = !showLogs;
  quizzesView.hidden = !showQuizzes;
  homeTab.classList.toggle("is-active", !showLogs && !showQuizzes);
  homeTab.setAttribute("aria-pressed", String(!showLogs && !showQuizzes));
  logsTab.classList.toggle("is-active", showLogs);
  logsTab.setAttribute("aria-pressed", String(showLogs));
  quizzesTab.classList.toggle("is-active", showQuizzes);
  quizzesTab.setAttribute("aria-pressed", String(showQuizzes));
};

const switchDashboardView = async (view) => {
  dashboardLoader.hidden = false;
  homeTab.disabled = true;
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
    logsTab.disabled = false;
    quizzesTab.disabled = false;
  }
};

homeTab.addEventListener("click", () => switchDashboardView("home"));
logsTab.addEventListener("click", () => switchDashboardView("logs"));
quizzesTab.addEventListener("click", () => switchDashboardView("quizzes"));

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
    const title = document.createElement("strong");
    const description = document.createElement("p");
    title.textContent = `${quiz.subject} — ${quiz.title}`;
    description.textContent = quiz.description || "No description";
    item.append(title, description);
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

  const submitButton = quizForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  quizFormStatus.textContent = "Creating quiz…";

  try {
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

    const questions = [...quizQuestionList.children].map((question, index) => ({
      quiz_id: quiz.id,
      position: index + 1,
      prompt: question.querySelector(".question-prompt").value.trim(),
      choices: [...question.querySelectorAll(".question-choice")].map((choice) =>
        choice.value.trim(),
      ),
      answer_index: Number(question.querySelector(".question-answer").value),
    }));
    const { error: questionError } = await window.supabaseClient
      .from("quiz_questions")
      .insert(questions);

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

    quizForm.reset();
    quizQuestionList.replaceChildren();
    addQuizQuestion();
    quizFormStatus.textContent = "Quiz created and published for students.";
    await loadAdminQuizzes();
  } catch (error) {
    quizFormStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
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
    .select("full_name, role")
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
  return profile;
};

const formatActivityTime = (timestamp) => {
  if (!timestamp) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
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

  activityLogList.replaceChildren();
  for (const [index, log] of logs.entries()) {
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

  activityLogStatus.textContent = logs.length
    ? `${logs.length} ${logs.length === 1 ? "activity log" : "activity logs"}`
    : "No activity logs yet.";
};

const loadRegisteredStudents = async () => {
  const pageSize = 500;
  const students = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await window.supabaseClient
      .from("profiles")
      .select("full_name, last_seen_at")
      .eq("role", "student")
      .order("full_name", { ascending: true })
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
    const name = document.createElement("span");
    const status = document.createElement("span");
    const isActive = window.studentPresence.isActive(student.last_seen_at);

    name.textContent = student.full_name || "Unnamed student";
    status.className = `presence-status ${isActive ? "is-online" : "is-offline"}`;
    status.textContent = isActive ? "Active" : "Offline";
    item.append(name, status);
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
  document.body.textContent = `Unable to connect to the sign-in service: ${error.message}`;
});
