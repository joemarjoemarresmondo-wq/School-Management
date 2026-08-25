const readRecords = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const currentUser = () => {
  try {
    const user = JSON.parse(sessionStorage.getItem("schoolUser") || "null");
    if (user?.role === "admin") {
      const profile = JSON.parse(
        localStorage.getItem("schoolAdminProfile") || "null",
      );
      user.name = profile?.name || "Joemar";
      user.title = profile?.title || "Admin / Owner / Developer";
    }
    return user;
  } catch {
    return null;
  }
};

const isRootIndex = () => location.pathname.endsWith("/index.html");
const dashboardPath = () => (isRootIndex() ? "index.html" : "../index.html");
const pagePath = (file) => (isRootIndex() ? `html/${file}` : file);

const setMessage = (id, text) => {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
};

const matchesIdentity = (record, identity) =>
  record.name.toLowerCase() === identity ||
  record.uid.toLowerCase() === identity;

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character],
  );

const studentPictureHtml = (picture, name) =>
  picture
    ? `<img class="student-avatar" src="${escapeHtml(picture)}" alt="${escapeHtml(name)} profile picture" />`
    : "";

const setTheme = (dark, toggle = document.getElementById("themeToggle")) => {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("schoolTheme", dark ? "dark" : "light");
  if (toggle) {
    const tagalog = localStorage.getItem("schoolLanguage") === "tl";
    toggle.textContent = dark
      ? tagalog
        ? "Gamitin ang light mode"
        : "Use light mode"
      : tagalog
        ? "Gamitin ang dark mode"
        : "Use dark mode";
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.setAttribute(
      "aria-label",
      dark ? "Switch to light mode" : "Switch to dark mode",
    );
  }
};

const languageText = {
  en: {
    navigator: "Navigator",
    settings: "Settings",
    studentSettings: "Student settings",
    adminSettings: "Admin settings",
    editPicture: "Edit picture",
    appearance: "Appearance",
    appearanceHelp: "Switch between light and dark mode.",
    changeLanguage: "Change language",
    languageHelp: "Choose your preferred language.",
    saveChanges: "Save changes",
    saveProfile: "Save profile",
    profilePicture: "Profile picture",
    name: "Name",
    position: "Position",
    editProfile: "Edit profile",
    newPicture: "New profile picture",
    studentHeading: "Edit picture",
    studentIntro: "Choose a picture to use on your student profile.",
    adminHeading: "Admin settings",
    adminIntro: "Manage the admin profile picture and appearance.",
    viewStudent: "View Student",
    addStudent: "Add Student",
    quizGame: "Quiz Game",
    studentGrades: "Student Grades",
    logout: "Log out",
    backDashboard: "Back to dashboard",
    goBack: "Go Back",
    cancel: "Cancel",
    student: "Student",
    teacher: "Teacher",
    dashboard: "Dashboard",
    quickQuiz: "Quick quiz",
    teacherDirectory: "Teacher directory",
    studentDirectory: "Student directory",
    login: "Login",
    register: "Register",
    forgotPassword: "Forgot password",
    submit: "Submit",
    show: "Show",
    hide: "Hide",
  },
  tl: {
    navigator: "Nabigasyon",
    settings: "Mga Setting",
    studentSettings: "Student settings",
    adminSettings: "Admin settings",
    editPicture: "I-edit ang larawan",
    appearance: "Hitsura",
    appearanceHelp: "Pumili sa light o dark mode.",
    changeLanguage: "Palitan ang wika",
    languageHelp: "Piliin ang gusto mong wika.",
    saveChanges: "I-save ang mga pagbabago",
    saveProfile: "I-save ang profile",
    profilePicture: "Larawan ng profile",
    name: "Pangalan",
    position: "Posisyon",
    editProfile: "I-edit ang profile",
    newPicture: "Bagong larawan ng profile",
    studentHeading: "I-edit ang larawan",
    studentIntro: "Pumili ng larawang gagamitin sa iyong student profile.",
    adminHeading: "Mga setting ng admin",
    adminIntro: "Pamahalaan ang larawan at hitsura ng admin profile.",
    viewStudent: "Tingnan ang mga Student",
    addStudent: "Magdagdag ng Student",
    quizGame: "Laro na Quiz",
    studentGrades: "Mga Marka ng Student",
    logout: "Mag-logout",
    backDashboard: "Bumalik sa dashboard",
    goBack: "Bumalik",
    cancel: "Kanselahin",
    student: "Student",
    teacher: "Teacher",
    dashboard: "Dashboard",
    quickQuiz: "Maikling quiz",
    teacherDirectory: "Listahan ng mga teacher",
    studentDirectory: "Listahan ng mga student",
    login: "Mag-login",
    register: "Mag-register",
    forgotPassword: "Nakalimutan ang password",
    submit: "Isumite",
    show: "Ipakita",
    hide: "Itago",
  },
};

const applyLanguage = (language) => {
  const text = languageText[language] || languageText.en;
  document.documentElement.lang = language;
  document.querySelectorAll("nav > p").forEach((element) => {
    if (
      element.textContent.trim() === "Navigator" ||
      element.textContent.trim() === "Nabigasyon"
    )
      element.textContent = text.navigator;
    if (
      element.textContent.trim() === "Settings" ||
      element.textContent.trim() === "Mga Setting"
    )
      element.textContent = text.settings;
  });
  const translations = {
    ".settings-option strong": [text.appearance, text.changeLanguage],
    ".settings-option p": [text.appearanceHelp, text.languageHelp],
    '[data-settings-role="student"]': text.studentSettings,
    '[data-settings-role="admin"]': text.adminSettings,
    "#editProfileButton": text.editProfile,
    'label[for="adminName"]': text.name,
    'label[for="adminTitle"]': text.position,
    '#adminSettingsForm label[for="picture"]': text.profilePicture,
    '#settingsForm label[for="picture"]': text.newPicture,
    'nav a[href="index.html"], nav a[href="../index.html"]': text.viewStudent,
    'nav a[href="AddStudent.html"], nav a[href="html/AddStudent.html"]': text.addStudent,
    'nav a[href="Quiz.html"], nav a[href="html/Quiz.html"]': text.quizGame,
    'nav a[href="StudentGrades.html"], nav a[href="html/StudentGrades.html"]': text.studentGrades,
    "#logout": text.logout,
    'a.back[href="index.html"], a.back[href="../index.html"]': text.backDashboard,
    'a[href="index.html"].secondary, a[href="../index.html"].secondary': text.goBack,
    "#togglePassword, #toggle": text.show,
    "#loginForm .primary": text.login,
    "#registerForm .primary": text.register,
    "#recoveryForm .primary": text.submit,
  };
  Object.entries(translations).forEach(([selector, value]) => {
    const elements = document.querySelectorAll(selector);
    if (Array.isArray(value))
      elements.forEach(
        (element, index) => (element.textContent = value[index]),
      );
    else elements.forEach((element) => (element.textContent = value));
  });
  const settingsHeading = document.querySelector("#settingsForm")
    ? [text.studentHeading, text.studentIntro]
    : document.querySelector("#adminSettingsForm")
      ? [text.adminHeading, text.adminIntro]
      : null;
  if (settingsHeading) {
    document.querySelector("main.content h1").textContent = settingsHeading[0];
    document.querySelector("main.content > .intro").textContent =
      settingsHeading[1];
  }
  document
    .querySelectorAll('.settings-actions button[form="settingsForm"]')
    .forEach((element) => (element.textContent = text.saveChanges));
  document
    .querySelectorAll('.settings-actions button[form="adminSettingsForm"]')
    .forEach((element) => (element.textContent = text.saveChanges));
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    const dark = document.documentElement.classList.contains("dark");
    themeToggle.textContent = dark
      ? language === "tl"
        ? "Gamitin ang light mode"
        : "Use light mode"
      : language === "tl"
        ? "Gamitin ang dark mode"
        : "Use dark mode";
  }
  const select = document.getElementById("languageSelect");
  if (select) select.setAttribute("aria-label", text.changeLanguage);
  document.querySelectorAll(".add").forEach((element) => {
    if (element.textContent.toLowerCase().includes("student"))
      element.textContent = `+ ${text.addStudent.toLowerCase()}`;
  });
};

const applySavedTheme = () =>
  setTheme(localStorage.getItem("schoolTheme") === "dark", null);

const setupTheme = () => {
  const toggle = document.getElementById("themeToggle");
  const dark = localStorage.getItem("schoolTheme") === "dark";
  setTheme(dark, toggle);
  toggle?.addEventListener("click", () =>
    setTheme(!document.documentElement.classList.contains("dark"), toggle),
  );
};

const setupLanguage = () => {
  const select = document.getElementById("languageSelect");
  const language = localStorage.getItem("schoolLanguage") || "en";
  applyLanguage(language);
  if (select) {
    select.value = language;
    select.addEventListener("change", () => {
      localStorage.setItem("schoolLanguage", select.value);
      applyLanguage(select.value);
    });
  }
};

const setupLogout = () =>
  document.getElementById("logout")?.addEventListener("click", () => {
    sessionStorage.removeItem("schoolUser");
    location.href = pagePath("Login.html");
  });

const setupPageLoading = () => {
  const loader = document.createElement("div");
  loader.className = "page-loader";
  loader.setAttribute("aria-label", "Loading school management");
  loader.innerHTML = '<div class="loader-mark">Loading</div>';
  document.body.prepend(loader);
  requestAnimationFrame(() => {
    loader.classList.add("is-hidden");
    window.setTimeout(() => loader.remove(), 360);
  });
};

const setupAdminPicture = (user) => {
  const headerUser = document.querySelector(".user");
  if (!headerUser) return;
  headerUser.querySelector(".admin-avatar")?.remove();
  if (!user) return;
  const student =
    user.role === "student"
      ? readRecords("schoolStudents").find((item) => item.uid === user.uid)
      : null;
  if (user.role !== "admin" && !student?.picture) return;
  const picture = document.createElement("img");
  picture.className = "admin-avatar";
  picture.src =
    student?.picture ||
    localStorage.getItem("schoolAdminPicture") ||
    (isRootIndex() ? "Images/1.jpg" : "../Images/1.jpg");
  picture.alt = `${user.name} profile picture`;
  headerUser.insertBefore(picture, headerUser.firstChild);
};

const requireAdmin = (message, redirect = "Login.html") => {
  const user = currentUser();
  if (!user || user.role !== "admin") {
    alert(message);
    location.href = redirect;
    return false;
  }
  return true;
};

const setupPasswordToggle = (buttonId) =>
  document.getElementById(buttonId)?.addEventListener("click", (event) => {
    const field = event.currentTarget
      .closest(".password")
      .querySelector("input");
    const visible = field.type === "password";
    field.type = visible ? "text" : "password";
    const tagalog = localStorage.getItem("schoolLanguage") === "tl";
    event.currentTarget.textContent = visible
      ? tagalog
        ? "Itago"
        : "Hide"
      : tagalog
        ? "Ipakita"
        : "Show";
  });

const setupLogin = () => {
  setupPasswordToggle("togglePassword");
  document.getElementById("loginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const identity = document
      .getElementById("identity")
      .value.trim()
      .toLowerCase();
    const password = document.getElementById("password").value;
    if (identity === "admin123" && password === "Admin123") {
      sessionStorage.setItem(
        "schoolUser",
        JSON.stringify({
          role: "admin",
          name: localStorage.getItem("schoolAdminProfile")
            ? JSON.parse(localStorage.getItem("schoolAdminProfile")).name
            : "Joemar",
          title: localStorage.getItem("schoolAdminProfile")
            ? JSON.parse(localStorage.getItem("schoolAdminProfile")).title
            : "Admin / Owner / Developer",
          uid: "ADMIN",
        }),
      );
      location.href = dashboardPath();
      return;
    }
    const student = readRecords("schoolStudents").find((item) =>
      matchesIdentity(item, identity),
    );
    setMessage(
      "message",
      !student
        ? "Student was not found. Ask an admin to add you first."
        : !student.registered
          ? "Please register this student account first."
          : student.password !== password
            ? "Incorrect password."
            : "",
    );
    if (student?.registered && student.password === password) {
      sessionStorage.setItem(
        "schoolUser",
        JSON.stringify({
          role: "student",
          name: student.name,
          uid: student.uid,
        }),
      );
      location.href = dashboardPath();
    }
  });
};

const setupRegister = () => {
  setupPasswordToggle("toggle");
  document
    .getElementById("registerForm")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const identity = document
        .getElementById("identity")
        .value.trim()
        .toLowerCase();
      const answer = document
        .getElementById("answer")
        .value.trim()
        .toLowerCase();
      const records = readRecords("schoolStudents");
      const index = records.findIndex((item) =>
        matchesIdentity(item, identity),
      );
      if (index < 0)
        return setMessage(
          "message",
          "Student was not found in the dashboard records.",
        );
      if (records[index].registered)
        return setMessage(
          "message",
          "This student is already registered. Use Forgot password if needed.",
        );
      const expected =
        `${records[index].grade} - ${records[index].section}`.toLowerCase();
      if (answer !== expected && answer !== expected.replace(" - ", " "))
        return setMessage(
          "message",
          "The security answer does not match the student record.",
        );
      records[index].password = document.getElementById("password").value;
      records[index].securityAnswer = answer;
      records[index].registered = true;
      localStorage.setItem("schoolStudents", JSON.stringify(records));
      alert("Registration complete. You can now log in.");
      location.href = pagePath("Login.html");
    });
};

const setupRecovery = () =>
  document
    .getElementById("recoveryForm")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const identity = document
        .getElementById("identity")
        .value.trim()
        .toLowerCase();
      const answer = document
        .getElementById("answer")
        .value.trim()
        .toLowerCase();
      const student = readRecords("schoolStudents").find((item) =>
        matchesIdentity(item, identity),
      );
      const result = document.getElementById("result");
      result.style.display = "none";
      if (!student || !student.registered || student.securityAnswer !== answer)
        return setMessage(
          "message",
          "The student or security answer could not be verified.",
        );
      setMessage("message", "");
      result.innerHTML = `<strong>Student verified</strong><br>Name: ${escapeHtml(student.name)}<br>UID: ${escapeHtml(student.uid)}<br>Password: ${escapeHtml(student.password)}`;
      result.style.display = "block";
    });

const setupDashboard = () => {
  if (!document.getElementById("studentRows")) return;
  setupTheme();
  setupLogout();
  const user = currentUser();
  if (!user || !["admin", "student"].includes(user.role)) {
    alert("Please log in to view the dashboard.");
    location.href = pagePath("Login.html");
    return;
  }
  const isAdmin = user.role === "admin";
  setupAdminPicture(user);
  document.getElementById("userName").textContent = isAdmin
    ? `${user.name} · ${user.title}`
    : `${user.name} · Student`;
  if (!isAdmin) {
    document
      .querySelectorAll(
        'nav a[href="AddStudent.html"], nav a[href="html/AddStudent.html"], .add',
      )
      .forEach((element) => element.remove());
    document
      .querySelectorAll('[data-settings-role="admin"]')
      .forEach((element) => element.remove());
    document.querySelector(".stats").style.display = "none";
    document.querySelector(".actions-heading")?.remove();
    document.querySelector(".heading h1").textContent = "Student directory";
    document.querySelector(".heading p").textContent =
      "View your student community directory.";
    document.querySelector(".section-title h2").textContent =
      "Student directory";
  } else {
    document
      .querySelectorAll('[data-settings-role="student"]')
      .forEach((element) => element.remove());
  }
  const allRecords = readRecords("schoolStudents");
  const records = allRecords;
  document.getElementById("total").textContent = records.length;
  document.getElementById("active").textContent = records.filter(
    (item) => item.active !== false,
  ).length;
  document.getElementById("registered").textContent = records.filter(
    (item) => item.registered,
  ).length;
  const renderRows = (visibleRecords) => {
    document.getElementById("directoryCount").textContent =
      `${visibleRecords.length} of ${records.length} record${records.length === 1 ? "" : "s"}`;
    document.getElementById("empty").textContent = visibleRecords.length
      ? "No students have been added yet."
      : "No students match your search.";
    if (visibleRecords.length) {
      document.getElementById("empty").style.display = "none";
      document.getElementById("studentRows").innerHTML = visibleRecords
        .map(
          (item) =>
            `<tr><td>${studentPictureHtml(item.picture, item.name)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.uid)}</td><td>${escapeHtml(item.grade)} - ${escapeHtml(item.section)}</td><td>${escapeHtml(item.age)}</td><td>${escapeHtml(item.status || (item.active === false ? "Inactive" : "Active"))}</td><td>${item.registered ? "Registered" : "Not registered"}</td>${isAdmin ? `<td class="row-actions"><button class="row-action" data-action="view-student" data-uid="${escapeHtml(item.uid)}" type="button">View</button><button class="row-action" data-action="edit-student" data-uid="${escapeHtml(item.uid)}" type="button">Edit</button><button class="row-action delete" data-action="delete-student" data-uid="${escapeHtml(item.uid)}" type="button">Delete</button></td>` : ""}</tr>`,
        )
        .join("");
    } else {
      document.getElementById("studentRows").innerHTML = "";
      document.getElementById("empty").style.display = "block";
    }
  };
  const filterRecords = () => {
    const query =
      document.getElementById("studentSearch")?.value.trim().toLowerCase() ||
      "";
    const filter = document.getElementById("statusFilter")?.value || "all";
    renderRows(
      records.filter((item) => {
        const searchable =
          `${item.name} ${item.uid} ${item.grade} ${item.section}`.toLowerCase();
        const statusMatch =
          filter === "all" ||
          (filter === "active" && item.active !== false) ||
          (filter === "inactive" && item.active === false) ||
          (filter === "registered" && item.registered);
        return searchable.includes(query) && statusMatch;
      }),
    );
  };
  filterRecords();
  document
    .getElementById("studentSearch")
    ?.addEventListener("input", filterRecords);
  document
    .getElementById("statusFilter")
    ?.addEventListener("change", filterRecords);
  document.getElementById("studentRows").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || !isAdmin) return;
    const records = readRecords("schoolStudents");
    const index = records.findIndex((item) => item.uid === button.dataset.uid);
    if (index < 0) return;
    if (button.dataset.action === "view-student") {
      const student = records[index];
      const details = {
        "Student name": student.name,
        UID: student.uid,
        "Birth date": student.birthdate,
        Age: student.age,
        Gender: student.gender,
        "Grade level": student.grade,
        Section: student.section,
        Strand:
          student.grade === "G11" || student.grade === "G12"
            ? student.strand || "—"
            : "Not applicable",
        "Phone number": student.phone,
        Email: student.email,
        Status:
          student.status || (student.active === false ? "Inactive" : "Active"),
        Account: student.registered ? "Registered" : "Not registered",
      };
      document.getElementById("studentDetailsContent").innerHTML =
        Object.entries(details)
          .map(
            ([label, value]) =>
              `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
          )
          .join("");
      document.getElementById("studentDetails").showModal();
      return;
    }
    if (button.dataset.action === "edit-student") {
      location.href = `${pagePath("EditStudent.html")}?uid=${encodeURIComponent(button.dataset.uid)}`;
      return;
    }
    if (button.dataset.action === "delete-student") {
      if (!confirm(`Delete ${records[index].name}?`)) return;
      records.splice(index, 1);
    }
    localStorage.setItem("schoolStudents", JSON.stringify(records));
    location.reload();
  });
  document
    .getElementById("closeStudentDetails")
    .addEventListener("click", () =>
      document.getElementById("studentDetails").close(),
    );
  document
    .getElementById("studentDetails")
    .addEventListener("click", (event) => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
};

const setupAddStudent = () => {
  if (!document.getElementById("studentForm")) return;
  if (!requireAdmin("Only the admin can add students.", dashboardPath()))
    return;
  const birthdate = document.getElementById("birthdate");
  birthdate.addEventListener("change", () => {
    const date = new Date(birthdate.value),
      today = new Date();
    let years = today.getFullYear() - date.getFullYear();
    if (
      today.getMonth() < date.getMonth() ||
      (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
    )
      years--;
    document.getElementById("age").value = years >= 0 ? years : "";
  });
  const grade = document.getElementById("grade");
  grade.addEventListener("change", () => {
    const senior = grade.value === "G11" || grade.value === "G12";
    document.getElementById("strandField").classList.toggle("hidden", !senior);
    document.getElementById("strand").required = senior;
  });
  document.getElementById("studentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const records = readRecords("schoolStudents"),
      name = document.getElementById("name").value.trim();
    if (records.some((item) => item.name.toLowerCase() === name.toLowerCase()))
      return setMessage("message", "A student with this name already exists.");
    const uid = `STU-${String(Date.now()).slice(-6)}`;
    const pictureFile = document.getElementById("picture").files[0];
    if (pictureFile && pictureFile.size > 2 * 1024 * 1024)
      return setMessage("message", "Student picture must be 2 MB or smaller.");
    const saveStudent = (picture = "") => {
      records.push({
        name,
        uid,
        birthdate: birthdate.value,
        age: document.getElementById("age").value,
        gender: document.getElementById("gender").value,
        grade: grade.value,
        strand: document.getElementById("strand").value,
        section: ["Rose", "Jasmine", "Sampaguita", "Ilang-Ilang"][
          Math.floor(Math.random() * 4)
        ],
        phone: document.getElementById("phone").value.trim(),
        email: document.getElementById("email").value.trim(),
        picture,
        active: true,
        status: "Active",
        registered: false,
      });
      localStorage.setItem("schoolStudents", JSON.stringify(records));
      alert(`Student added. UID: ${uid}`);
      location.href = dashboardPath();
    };
    if (!pictureFile) return saveStudent();
    const reader = new FileReader();
    reader.addEventListener("load", () => saveStudent(reader.result));
    reader.readAsDataURL(pictureFile);
  });
};

const setupEditStudent = () => {
  if (!document.getElementById("editStudentForm")) return;
  setupTheme();
  setupLogout();
  const user = currentUser();
  if (!requireAdmin("Only the admin can edit students.", dashboardPath()))
    return;
  setupAdminPicture(user);
  document.getElementById("userName").textContent =
    `${user.name} · ${user.title}`;
  const uid = new URLSearchParams(location.search).get("uid");
  const records = readRecords("schoolStudents");
  const index = records.findIndex((item) => item.uid === uid);
  if (index < 0) {
    alert("Student record was not found.");
    location.href = dashboardPath();
    return;
  }
  const student = records[index];
  document.getElementById("name").value = student.name;
  document.getElementById("uid").value = student.uid;
  document.getElementById("grade").value = student.grade;
  document.getElementById("section").value = student.section;
  document.getElementById("strand").value =
    student.grade === "G11" || student.grade === "G12"
      ? student.strand || "Not set"
      : "Not applicable";
  document.getElementById("status").value =
    student.status || (student.active === false ? "Inactive" : "Active");
  document
    .getElementById("editStudentForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("name").value.trim();
      const status = document.getElementById("status").value;
      if (!name) return setMessage("message", "Student name is required.");
      if (
        records.some(
          (item, itemIndex) =>
            itemIndex !== index &&
            item.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return setMessage(
          "message",
          "A student with this name already exists.",
        );
      records[index] = {
        ...records[index],
        name,
        status,
        active: status === "Active",
      };
      localStorage.setItem("schoolStudents", JSON.stringify(records));
      alert("Student changes saved.");
      location.href = dashboardPath();
    });
};

const setupSettings = () => {
  if (!document.getElementById("settingsForm")) return;
  setupTheme();
  setupLogout();
  const user = requireUser();
  if (!user) return;
  setupAdminPicture(user);
  document.getElementById("userName").textContent =
    user.role === "admin"
      ? `${user.name} · ${user.title}`
      : `${user.name} · Student`;
  if (user.role !== "student") {
    location.href = "AdminSettings.html";
    return;
  }
  const records = readRecords("schoolStudents");
  const index = records.findIndex((item) => item.uid === user.uid);
  if (index < 0) return setMessage("message", "Student record was not found.");
  const picture = document.getElementById("currentPicture");
  const file = document.getElementById("picture");
  const showPicture = (source) => {
    picture.hidden = !source;
    if (!source) return;
    picture.src = source;
    picture.alt = `${records[index].name} profile picture`;
  };
  showPicture(records[index].picture);
  file.addEventListener("change", () => {
    const selected = file.files[0];
    if (!selected) return;
    if (selected.size > 2 * 1024 * 1024) {
      file.value = "";
      return setMessage("message", "Student picture must be 2 MB or smaller.");
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => showPicture(reader.result));
    reader.readAsDataURL(selected);
  });
  document
    .getElementById("settingsForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = file.files[0];
      if (!selected) return setMessage("message", "Choose a picture first.");
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        records[index].picture = reader.result;
        localStorage.setItem("schoolStudents", JSON.stringify(records));
        alert("Profile picture updated.");
        location.href = dashboardPath();
      });
      reader.readAsDataURL(selected);
    });
};

const setupAdminSettings = () => {
  if (!document.getElementById("adminSettingsForm")) return;
  setupTheme();
  setupLogout();
  const user = currentUser();
  if (
    !requireAdmin("Only the admin can open admin settings.", dashboardPath())
  )
    return;
  setupAdminPicture(user);
  document.getElementById("userName").textContent =
    `${user.name} · ${user.title}`;
  document.getElementById("adminName").value = user.name;
  document.getElementById("adminTitle").value = user.title;
  document
    .getElementById("editProfileButton")
    .addEventListener("click", (event) => {
      document.getElementById("adminProfileFields").classList.remove("hidden");
      document.getElementById("adminSaveActions").classList.remove("hidden");
      event.currentTarget.classList.add("hidden");
    });
  const picture = document.getElementById("currentPicture");
  const file = document.getElementById("picture");
  const savedPicture = localStorage.getItem("schoolAdminPicture");
  picture.src = savedPicture || "../Images/1.jpg";
  file.addEventListener("change", () => {
    const selected = file.files[0];
    if (!selected) return;
    if (selected.size > 2 * 1024 * 1024) {
      file.value = "";
      return setMessage("message", "Admin picture must be 2 MB or smaller.");
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => (picture.src = reader.result));
    reader.readAsDataURL(selected);
  });
  document
    .getElementById("adminSettingsForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("adminName").value.trim();
      const title = document.getElementById("adminTitle").value.trim();
      if (!name || !title)
        return setMessage("message", "Name and position are required.");
      localStorage.setItem(
        "schoolAdminProfile",
        JSON.stringify({ name, title }),
      );
      const selected = file.files[0];
      if (!selected) {
        alert("Admin profile updated.");
        location.href = dashboardPath();
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        localStorage.setItem("schoolAdminPicture", reader.result);
        alert("Admin picture updated.");
        location.href = dashboardPath();
      });
      reader.readAsDataURL(selected);
    });
};

const requireUser = () => {
  const user = currentUser();
  if (!user || !["admin", "student"].includes(user.role)) {
    alert("Please log in first.");
    location.href = pagePath("Login.html");
    return null;
  }
  return user;
};

const quizSets = {
  Mathematics: [
    ["What is 12 × 2?", ["22", "24", "26"], "b"],
    ["What is 15 + 27?", ["42", "40", "52"], "a"],
    ["What is half of 100?", ["25", "50", "75"], "b"],
    ["How many degrees are in a right angle?", ["45°", "90°", "180°"], "b"],
    ["What is 9 × 9?", ["72", "81", "99"], "b"],
  ],
  Science: [
    [
      "Which gas do plants mainly absorb?",
      ["Oxygen", "Nitrogen", "Carbon dioxide"],
      "c",
    ],
    [
      "What is the closest star to Earth?",
      ["The Sun", "Sirius", "Polaris"],
      "a",
    ],
    [
      "What organ pumps blood around the body?",
      ["Lungs", "Heart", "Brain"],
      "b",
    ],
    [
      "What force pulls objects toward Earth?",
      ["Friction", "Gravity", "Magnetism"],
      "b",
    ],
    [
      "Water freezes at what temperature in Celsius?",
      ["0°", "50°", "100°"],
      "a",
    ],
  ],
  English: [
    ["Which word is a noun?", ["Run", "Beautiful", "Teacher"], "c"],
    ["What is the opposite of 'ancient'?", ["Modern", "Old", "Historic"], "a"],
    [
      "Choose the correct spelling.",
      ["Necessary", "Necesary", "Neccessary"],
      "a",
    ],
    [
      "Which punctuation ends a question?",
      ["Period (.)", "Question mark (?)", "Comma (,)"],
      "b",
    ],
    ["What is the past tense of 'go'?", ["Goed", "Gone", "Went"], "c"],
  ],
  "General Knowledge": [
    [
      "What is the largest planet in our solar system?",
      ["Earth", "Jupiter", "Mars"],
      "b",
    ],
    ["How many sides does a triangle have?", ["Four", "Three", "Five"], "b"],
    [
      "What is the official language used for web page structure?",
      ["HTML", "CSS", "SQL"],
      "a",
    ],
    ["Which ocean is the largest?", ["Atlantic", "Indian", "Pacific"], "c"],
    ["How many days are in a week?", ["Five", "Seven", "Ten"], "b"],
  ],
  Programming: [
    [
      "What does HTML stand for?",
      [
        "HyperText Markup Language",
        "HighText Machine Language",
        "Home Tool Markup Language",
      ],
      "a",
    ],
    [
      "Which symbol starts a single-line comment in JavaScript?",
      ["//", "<!--", "#"],
      "a",
    ],
    [
      "Which language is mainly used to style web pages?",
      ["HTML", "CSS", "SQL"],
      "b",
    ],
    [
      "What does CSS stand for?",
      [
        "Computer Style Sheets",
        "Cascading Style Sheets",
        "Creative Style Syntax",
      ],
      "b",
    ],
    [
      "Which data type stores true or false?",
      ["String", "Boolean", "Number"],
      "b",
    ],
    [
      "Which keyword declares a constant in JavaScript?",
      ["let", "var", "const"],
      "c",
    ],
    [
      "What is used to repeat a block of code?",
      ["Loop", "Selector", "Database"],
      "a",
    ],
    [
      "Which one is a JavaScript framework?",
      ["React", "MySQL", "Photoshop"],
      "a",
    ],
    [
      "What does SQL commonly manage?",
      ["Images", "Databases", "Screen colors"],
      "b",
    ],
    ["Which HTML tag creates a hyperlink?", ["<p>", "<a>", "<h1>"], "b"],
  ],
};

const summativeSet = [
  [
    "What does HTML create on a web page?",
    ["Structure", "Passwords", "Electricity"],
    "a",
  ],
  ["What is 25% of 100?", ["10", "25", "50"], "b"],
  ["Which organ helps humans breathe?", ["Heart", "Stomach", "Lungs"], "c"],
  ["Which word is an adjective?", ["Quickly", "Beautiful", "Teacher"], "b"],
  ["Which language styles a web page?", ["CSS", "SQL", "HTML"], "a"],
  [
    "What is the boiling point of water in Celsius?",
    ["50°", "100°", "150°"],
    "b",
  ],
  ["What is 7 × 8?", ["54", "56", "64"], "b"],
  [
    "Which symbol is used for JavaScript strict equality?",
    ["=", "==", "==="],
    "c",
  ],
  ["What is the opposite of 'expand'?", ["Contract", "Increase", "Open"], "a"],
  [
    "Which is a renewable source of energy?",
    ["Coal", "Solar power", "Oil"],
    "b",
  ],
];

const subjectCatalog = {
  junior: [
    "Filipino",
    "English",
    "Math",
    "PE",
    "AP",
    "Science",
    "ESP",
    "Music",
    "Arts",
    "Health",
  ],
  senior: [
    "Oral Communication",
    "Reading and Writing",
    "General Mathematics",
    "Statistics and probability",
    "Earth and life science",
    "Physical Science",
    "Personal Development",
    "Understanding culture, society and politics",
    "Media and information literacy",
    "introduction to the philsophy of the human person",
    "practical research",
    "PE and Health",
    "Empowerment Technologies",
  ],
  ICT: [
    "Computer Programming",
    "Web Development",
    "Animation/Js",
    "Computer Systems Servicing(CSS)",
  ],
  ABM: [
    "business and management",
    "business mathematics",
    "Entrepreneursgip",
    "Business finance",
  ],
  STEM: [
    "Pre Calculus",
    "Basic calculus",
    "General Biology",
    "General Chemistry",
    "General Physics",
    "Research",
  ],
  GAS: [
    "Humanities",
    "Social Sciences",
    "Applied Economics",
    "Organization Management",
    "Research",
    "Elective Subjects",
  ],
  HUMSS: [
    "Creative Writing",
    "Creative Nonficion",
    "Philippine Politics and governance",
    "disciplines and ideas in the social sciences",
    "disciplines and ideas in the applied social sciences",
    "trends, metwoks and critical thinkning",
    "community engagement",
    "Research",
    "Work Immersion",
  ],
};
const quizSubjects = [
  ...new Set([
    ...subjectCatalog.junior,
    ...subjectCatalog.senior,
    ...subjectCatalog.ICT,
    ...subjectCatalog.ABM,
    ...subjectCatalog.STEM,
    ...subjectCatalog.GAS,
    ...subjectCatalog.HUMSS,
  ]),
];
const maxQuizAttempts = 5;
const getAvailableSubjects = (studentRecord) => {
  if (!studentRecord?.grade) return quizSubjects;
  const subjects = ["G11", "G12"].includes(studentRecord.grade)
    ? subjectCatalog.senior
    : subjectCatalog.junior;
  if (!["G11", "G12"].includes(studentRecord.grade)) return subjects;
  return [
    ...new Set([
      ...subjects,
      ...(studentRecord.strand === "TVL" || studentRecord.strand === "ICT"
        ? subjectCatalog.ICT
        : subjectCatalog[studentRecord.strand] || []),
    ]),
  ];
};
const getQuizQuestionCount = (studentRecord) =>
  ["G11", "G12"].includes(studentRecord?.grade) ? 30 : 15;
const getSummativeQuestionCount = (studentRecord) =>
  ["G11", "G12"].includes(studentRecord?.grade) ? 100 : 50;

const gradeQuestions = {
  G7: [
    ["Which fraction is equal to one half?", ["1/2", "1/3", "2/3"], "a"],
    [
      "What do plants need from sunlight to make food?",
      ["Energy", "Sound", "Salt"],
      "a",
    ],
    ["Which word is a common noun?", ["Manila", "Teacher", "Monday"], "b"],
    ["How many sides does a square have?", ["3", "4", "5"], "b"],
    ["Which tag makes the largest HTML heading?", ["<h1>", "<h6>", "<p>"], "a"],
  ],
  G8: [
    ["What is 3/4 + 1/4?", ["1/2", "1", "2"], "b"],
    [
      "What is the process by which water becomes vapor?",
      ["Freezing", "Evaporation", "Condensation"],
      "b",
    ],
    [
      "What is the plural form of 'child'?",
      ["Childs", "Children", "Childes"],
      "b",
    ],
    ["What is the value of 2x when x is 5?", ["7", "10", "25"], "b"],
    ["Which JavaScript type stores text?", ["String", "Boolean", "Array"], "a"],
  ],
  G9: [
    ["What is the solution to x + 7 = 12?", ["3", "5", "7"], "b"],
    ["What is the basic unit of life?", ["Atom", "Cell", "Organ"], "b"],
    ["Which is a complex sentence connector?", ["Because", "And", "Or"], "a"],
    ["What is the square root of 81?", ["8", "9", "10"], "b"],
    [
      "Which loop is best when the number of repetitions is known?",
      ["for", "if", "switch"],
      "a",
    ],
  ],
  G10: [
    ["What is the slope of a horizontal line?", ["0", "1", "Undefined"], "a"],
    [
      "Which part of a cell contains genetic material?",
      ["Nucleus", "Cell wall", "Vacuole"],
      "a",
    ],
    [
      "What is the main purpose of a thesis statement?",
      ["State the main claim", "List page numbers", "End every paragraph"],
      "a",
    ],
    ["What is sin(90°)?", ["0", "1", "-1"], "b"],
    [
      "What does an API allow programs to do?",
      ["Communicate", "Print paper", "Charge a battery"],
      "a",
    ],
  ],
};

const strandQuestions = {
  STEM: {
    Mathematics: [
      "What does a variable represent in an equation?",
      ["A changing value", "A punctuation mark", "A fixed sentence"],
      "a",
    ],
    Science: [
      "What is the unit of electric current?",
      ["Volt", "Ampere", "Watt"],
      "b",
    ],
    English: [
      "Which writing style presents evidence and reasoning?",
      ["Argumentative", "Narrative", "Poetic"],
      "a",
    ],
    Programming: [
      "Which structure stores ordered values in JavaScript?",
      ["Array", "Boolean", "Comment"],
      "a",
    ],
  },
  ABM: {
    Mathematics: [
      "What does percentage measure?",
      ["A part per hundred", "A total number only", "A unit of time"],
      "a",
    ],
    Science: [
      "Which resource is commonly used to generate business electricity?",
      ["Energy", "Sound", "Shadow"],
      "a",
    ],
    English: [
      "Which document is used to apply for a job?",
      ["Resume", "Recipe", "Diary"],
      "a",
    ],
    Programming: [
      "Which system organizes business data?",
      ["Database", "Keyboard", "Monitor"],
      "a",
    ],
  },
  HUMSS: {
    Mathematics: [
      "What does a graph help researchers compare?",
      ["Data", "Spelling", "Grammar"],
      "a",
    ],
    Science: [
      "Which field studies human behavior and society?",
      ["Social science", "Astronomy", "Geology"],
      "a",
    ],
    English: [
      "What is the central message of a text called?",
      ["Theme", "Margin", "Caption"],
      "a",
    ],
    Programming: [
      "What is a survey form used to collect?",
      ["Responses", "Electricity", "Pixels"],
      "a",
    ],
  },
  GAS: {
    Mathematics: ["What is the average of 2, 4, and 6?", ["3", "4", "6"], "b"],
    Science: [
      "Which layer protects Earth from much ultraviolet radiation?",
      ["Ozone layer", "Mantle", "Core"],
      "a",
    ],
    English: [
      "What is a short summary of a text called?",
      ["Synopsis", "Dialogue", "Setting"],
      "a",
    ],
    Programming: [
      "Which chart is useful for showing parts of a whole?",
      ["Pie chart", "Code loop", "Text box"],
      "a",
    ],
  },
  TVL: {
    Mathematics: [
      "What tool measures length accurately?",
      ["Ruler", "Compass only", "Thermometer"],
      "a",
    ],
    Science: [
      "Which practice helps keep a workshop safe?",
      ["Using protective equipment", "Ignoring warnings", "Removing labels"],
      "a",
    ],
    English: [
      "Which writing is used to explain how to do a task?",
      ["Procedural", "Dramatic", "Descriptive only"],
      "a",
    ],
    Programming: [
      "What does debugging mean?",
      [
        "Finding and fixing errors",
        "Deleting all files",
        "Changing a password",
      ],
      "a",
    ],
  },
  ICT: {
    Mathematics: [
      "What is a binary number system based on?",
      ["Base 2", "Base 8", "Base 10"],
      "a",
    ],
    Science: [
      "What device converts light into electrical energy?",
      ["Solar panel", "Thermometer", "Microscope"],
      "a",
    ],
    English: [
      "Which skill is important when presenting a technical project?",
      ["Clear communication", "Random guessing", "Ignoring questions"],
      "a",
    ],
    Programming: [
      "Which tool is used to write and edit source code?",
      ["Code editor", "Calculator", "Speaker"],
      "a",
    ],
  },
};

const getPersonalizedQuizSet = (subjectName, studentRecord) => {
  const source = quizSets[subjectName] || Object.values(quizSets).flat();
  const count = getQuizQuestionCount(studentRecord);
  return Array.from({ length: count }, (_, index) => {
    const question = source[index % source.length];
    return [
      `${subjectName}: ${question[0]}${index >= source.length ? ` (Question ${index + 1})` : ""}`,
      question[1],
      question[2],
    ];
  });
};

const getSummativeSet = (studentRecord) => {
  const subjects = getAvailableSubjects(studentRecord);
  const source = subjects.flatMap((subjectName) =>
    getPersonalizedQuizSet(subjectName, studentRecord),
  );
  const count = getSummativeQuestionCount(studentRecord);
  return Array.from(
    { length: count },
    (_, index) => source[index % source.length],
  );
};

const setupQuiz = () => {
  if (!document.getElementById("quizForm")) return;
  setupTheme();
  setupLogout();
  const user = requireUser();
  if (!user) return;
  document.getElementById("userName").textContent =
    user.role === "admin"
      ? `${user.name} · ${user.title}`
      : `${user.name} · Student`;
  document
    .querySelectorAll(
      `[data-settings-role="${user.role === "admin" ? "student" : "admin"}"]`,
    )
    .forEach((element) => element.remove());
  const subject = document.getElementById("quizSubject");
  const questions = document.getElementById("quizQuestions");
  const submit = document.getElementById("submitQuiz");
  const result = document.getElementById("quizResult");
  const progress = document.getElementById("quizProgress");
  const history = document.getElementById("quizHistory");
  const summativeSection = document.getElementById("summativeSection");
  let quizProfile =
    user.role === "student"
      ? readRecords("schoolStudents").find((item) => item.uid === user.uid)
      : null;
  const adminProfile = document.getElementById("adminProfile");
  const adminGrade = document.getElementById("adminGrade");
  const adminStrand = document.getElementById("adminStrand");
  const adminStrandField = document.getElementById("adminStrandField");
  const profile = document.getElementById("quizProfile");
  setupAdminPicture(user);
  if (quizProfile) {
    profile.textContent = `Level: ${quizProfile.grade}${quizProfile.strand ? ` · Strand: ${quizProfile.strand}` : ""}. Your questions are matched to your level.`;
  } else if (user.role === "admin") {
    profile.textContent = "Admin preview: general subject question sets.";
    adminProfile.classList.remove("hidden");
  } else {
    document.querySelector(".admin-avatar")?.remove();
  }
  if (user.role === "student") {
    document
      .querySelectorAll(
        'nav a[href="AddStudent.html"], nav a[href="html/AddStudent.html"]',
      )
      .forEach((element) => element.remove());
  }
  let quizMode = "subject";
  let selectedQuestions = null;
  const configureSubjects = () => {
    const profileRecord = quizProfile || {
      grade: adminGrade?.value,
      strand: adminStrand?.value,
    };
    const availableSubjects = getAvailableSubjects(profileRecord);
    const completedSubjects = new Set(
      readRecords("schoolGrades")
        .filter((item) => user.role === "admin" || item.studentUid === user.uid)
        .filter((item) => Number(item.percentage) === 100)
        .map((item) => item.quiz),
    );
    subject.innerHTML = '<option value="">Select subject</option>';
    availableSubjects
      .filter((subjectName) => !completedSubjects.has(subjectName))
      .forEach((subjectName) => {
        const option = document.createElement("option");
        option.value = subjectName;
        option.textContent = subjectName;
        subject.append(option);
      });
  };

  const studentGrades = () =>
    readRecords("schoolGrades").filter(
      (item) => item.studentUid === user.uid && item.type !== "summative",
    );

  configureSubjects();

  const renderHistory = () => {
    if (!history) return;
    const records = readRecords("schoolGrades")
      .filter((item) => user.role === "admin" || item.studentUid === user.uid)
      .slice()
      .reverse();
    history.innerHTML = records.length
      ? records
          .map(
            (item) =>
              `<div class="quiz-history-item"><strong>${escapeHtml(item.quiz || "Summative Test")}</strong><span>${escapeHtml(item.studentName || user.name)}</span><span>${escapeHtml(item.score)} / ${escapeHtml(item.total)} (${escapeHtml(item.percentage)}%)</span><span>Completed: ${escapeHtml(item.date)}</span></div>`,
          )
          .join("")
      : '<p class="quiz-history-empty">No completed quizzes yet.</p>';
  };

  renderHistory();

  const hasCompletedSubjects = () =>
    user.role === "admin" ||
    getAvailableSubjects(quizProfile).every(
      (name) =>
        studentGrades().filter((item) => item.quiz === name).length >=
        maxQuizAttempts,
    );

  const renderQuestions = (set) => {
    questions.innerHTML = set
      ? set
          .map(
            ([question, choices], index) =>
              `<div class="quiz-question"><p>${index + 1}. ${escapeHtml(question)}</p>${choices
                .map(
                  (choice, choiceIndex) =>
                    `<label><input type="radio" name="q${index + 1}" value="${String.fromCharCode(97 + choiceIndex)}" required /> ${escapeHtml(choice)}</label>`,
                )
                .join("")}</div>`,
          )
          .join("")
      : "";
  };

  const updateProgress = () => {
    if (quizMode === "summative") return;
    const attempts = subject.value
      ? studentGrades().filter((item) => item.quiz === subject.value).length
      : 0;
    progress.textContent = subject.value
      ? `${attempts} of ${maxQuizAttempts} attempts used for ${subject.value}.`
      : "Choose a subject to begin.";
    const profileReady =
      user.role !== "admin" ||
      (adminGrade.value &&
        ((adminGrade.value !== "G11" && adminGrade.value !== "G12") ||
          adminStrand.value));
    submit.disabled =
      !selectedQuestions || !profileReady || attempts >= maxQuizAttempts;
    if (attempts >= maxQuizAttempts) {
      setMessage(
        "quizMessage",
        "You have reached the five-attempt limit for this subject.",
      );
    } else {
      setMessage("quizMessage", "");
    }
    summativeSection.hidden = !hasCompletedSubjects();
  };

  const updateAdminProfile = () => {
    const senior = adminGrade.value === "G11" || adminGrade.value === "G12";
    adminStrandField.classList.toggle("hidden", !senior);
    if (!senior) adminStrand.value = "";
    quizProfile = adminGrade.value
      ? { grade: adminGrade.value, strand: adminStrand.value }
      : null;
    profile.textContent = quizProfile
      ? `Level: ${quizProfile.grade}${quizProfile.strand ? ` · Strand: ${quizProfile.strand}` : ""}. Questions are matched to this profile.`
      : "Choose a grade and strand to generate a quiz.";
    configureSubjects();
    if (subject.value) {
      selectedQuestions = getPersonalizedQuizSet(subject.value, quizProfile);
      renderQuestions(selectedQuestions);
    }
    updateProgress();
  };

  adminGrade?.addEventListener("change", updateAdminProfile);
  adminStrand?.addEventListener("change", updateAdminProfile);

  subject.addEventListener("change", () => {
    quizMode = "subject";
    subject.disabled = false;
    selectedQuestions = subject.value
      ? getPersonalizedQuizSet(subject.value, quizProfile)
      : null;
    document.getElementById("quizSubjectLabel").textContent =
      subject.value || "Choose a subject";
    document.getElementById("quizQuestionCount").textContent = selectedQuestions
      ? `${selectedQuestions.length} questions`
      : "Choose a subject first";
    renderQuestions(selectedQuestions);
    updateProgress();
  });

  document.getElementById("startSummative").addEventListener("click", () => {
    quizMode = "summative";
    selectedQuestions = getSummativeSet(quizProfile) || summativeSet;
    subject.value = "";
    subject.disabled = true;
    document.getElementById("quizSubjectLabel").textContent = "Summative Test";
    document.getElementById("quizQuestionCount").textContent =
      `${selectedQuestions.length} questions`;
    progress.textContent =
      "Final assessment: 50% or lower requires a complete retake.";
    setMessage("quizMessage", "");
    renderQuestions(selectedQuestions);
    submit.disabled = false;
    summativeSection.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  result.addEventListener("click", (event) => {
    if (!event.target.closest("[data-action=retry-quiz]")) return;
    result.hidden = true;
    document.getElementById("quizForm").hidden = false;
    document.getElementById("quizForm").reset();
    subject.disabled = false;
    quizMode = "subject";
    selectedQuestions = null;
    renderQuestions(null);
    updateProgress();
  });

  document.getElementById("quizForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedQuestions?.length) {
      return setMessage("quizMessage", "Choose a subject before submitting.");
    }
    const score = selectedQuestions.reduce(
      (total, [, , answer], index) =>
        total +
        (document.querySelector(`input[name="q${index + 1}"]:checked`)
          ?.value === answer
          ? 1
          : 0),
      0,
    );
    const percentage = Math.round((score / selectedQuestions.length) * 100);
    const grades = readRecords("schoolGrades");
    if (
      quizMode === "subject" &&
      user.role === "student" &&
      studentGrades().filter((item) => item.quiz === subject.value).length >=
        maxQuizAttempts
    ) {
      return setMessage(
        "quizMessage",
        "You have reached the five-attempt limit for this subject.",
      );
    }
    if (quizMode === "summative" && percentage <= 50) {
      localStorage.setItem(
        "schoolGrades",
        JSON.stringify(grades.filter((item) => item.studentUid !== user.uid)),
      );
      result.hidden = false;
      result.innerHTML = `<strong>Summative result: ${percentage}%.</strong> You need more than 50% to pass. Your quiz progress has been reset; start again from the first subject.<br /><button class="primary" data-action="retry-quiz" type="button">Re-attempt quiz</button>`;
      subject.disabled = false;
      document.getElementById("quizForm").reset();
      document.getElementById("quizForm").hidden = true;
      quizMode = "subject";
      selectedQuestions = null;
      renderQuestions(null);
      updateProgress();
      return;
    }
    grades.push({
      gradeId: `GRADE-${Date.now()}`,
      type: quizMode,
      studentUid: user.role === "student" ? user.uid : "ADMIN",
      studentName: user.role === "student" ? user.name : "Joemar",
      gradeLevel: quizProfile?.grade || "Admin",
      section: user.role === "student" ? quizProfile?.section || "—" : "—",
      strand: quizProfile?.strand || "",
      quiz: subject.value,
      score,
      total: selectedQuestions.length,
      percentage,
      date: new Date().toLocaleString(),
    });
    localStorage.setItem("schoolGrades", JSON.stringify(grades));
    renderHistory();
    result.hidden = false;
    const retryButton =
      percentage === 100
        ? ""
        : '<br /><button class="primary" data-action="retry-quiz" type="button">Re-attempt quiz</button>';
    result.innerHTML = `<strong>${quizMode === "summative" ? "Summative Test complete!" : "Quiz complete!"}</strong> You scored ${score} out of ${selectedQuestions.length} (${percentage}%). <a href="StudentGrades.html">View your grades</a>${retryButton}`;
    document.getElementById("quizForm").reset();
    document.getElementById("quizForm").hidden = true;
    if (percentage === 100 && quizMode === "subject") {
      configureSubjects();
      selectedQuestions = null;
      renderQuestions(null);
      document.getElementById("quizSubjectLabel").textContent =
        "Choose a subject";
      document.getElementById("quizQuestionCount").textContent =
        "Choose a subject first";
    }
    subject.disabled = false;
    quizMode = "subject";
    selectedQuestions = null;
    renderQuestions(null);
    updateProgress();
  });
};

const setupGrades = () => {
  if (!document.getElementById("gradeRows")) return;
  setupTheme();
  setupLogout();
  const user = requireUser();
  if (!user) return;
  const isAdmin = user.role === "admin";
  const students = readRecords("schoolStudents");
  setupAdminPicture(user);
  document.getElementById("userName").textContent = isAdmin
    ? `${user.name} · ${user.title}`
    : `${user.name} · Student`;
  document
    .querySelectorAll(`[data-settings-role="${isAdmin ? "student" : "admin"}"]`)
    .forEach((element) => element.remove());
  if (!isAdmin) {
    document.querySelector(".admin-avatar")?.remove();
    document
      .querySelectorAll(
        'nav a[href="AddStudent.html"], nav a[href="html/AddStudent.html"]',
      )
      .forEach((element) => element.remove());
    document
      .querySelectorAll(".grades-actions-heading")
      .forEach((element) => element.remove());
    document.getElementById("gradesIntro").textContent =
      "Review quiz scores and learning progress across the student community.";
  }
  const grades = readRecords("schoolGrades")
    .map((item, index) => ({
      ...item,
      gradeId: item.gradeId || `${item.studentUid}-${item.date}-${index}`,
      profile: students.find((student) => student.uid === item.studentUid),
    }))
    .filter((item) => isAdmin || item.studentUid !== "ADMIN");
  const showStrandColumn =
    isAdmin ||
    grades.some(
      (item) => item.profile?.grade === "G11" || item.profile?.grade === "G12",
    );
  if (!showStrandColumn) document.querySelector(".strand-heading")?.remove();
  document.getElementById("gradesEmpty").style.display = grades.length
    ? "none"
    : "block";
  if (grades.length) {
    document.getElementById("gradeRows").innerHTML = grades
      .map(
        (item) =>
          `<tr><td class="student-grade-name">${studentPictureHtml(item.profile?.picture, item.studentName)}${escapeHtml(item.studentName)}</td><td>${escapeHtml(item.gradeLevel || item.profile?.grade || "—")}</td><td>${escapeHtml(item.section || item.profile?.section || "—")}</td>${showStrandColumn ? `<td>${item.profile?.grade === "G11" || item.profile?.grade === "G12" ? escapeHtml(item.strand || item.profile?.strand || "—") : "—"}</td>` : ""}<td>${escapeHtml(item.quiz)}</td><td>${escapeHtml(item.score)} / ${escapeHtml(item.total)}</td><td>${escapeHtml(item.percentage ?? Math.round((item.score / item.total) * 100))}%</td><td>${escapeHtml(item.date)}</td>${isAdmin ? `<td class="row-actions"><button class="row-action delete" data-action="delete-grade" data-id="${escapeHtml(item.gradeId)}" type="button">Delete</button></td>` : ""}</tr>`,
      )
      .join("");
  }
  document.getElementById("gradeRows").addEventListener("click", (event) => {
    const button = event.target.closest('button[data-action="delete-grade"]');
    if (!button || !isAdmin) return;
    const grades = readRecords("schoolGrades");
    const index = grades.findIndex(
      (item, itemIndex) =>
        (item.gradeId || `${item.studentUid}-${item.date}-${itemIndex}`) ===
        button.dataset.id,
    );
    if (index < 0 || !confirm("Delete this grade record?")) return;
    grades.splice(index, 1);
    localStorage.setItem("schoolGrades", JSON.stringify(grades));
    location.reload();
  });
};

applySavedTheme();
setupPageLoading();
setupLogin();
setupRegister();
setupRecovery();
setupDashboard();
setupAddStudent();
setupEditStudent();
setupSettings();
setupAdminSettings();
setupQuiz();
setupGrades();
setupLanguage();
