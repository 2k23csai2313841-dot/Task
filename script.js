/*******************************
         LOGIN CHECK
*******************************/
if (!localStorage.getItem("loggedIn")) {
  window.location.href = "index.html";
}

function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
}

/*******************************
          CONFIG
*******************************/
const API_URL = "https://todo-backend-5t1x.onrender.com/api/task";
const USER_ID = "2313841"; // FIXED user ID for now

const calendarEl = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");
const notifyTimeInput = document.getElementById("notifyTime");

let date = new Date();
let today = new Date();
let selectedDayKey = "";

/*******************************
     DEFAULT TASK TEMPLATE
*******************************/
const defaultTasks = [
  { text: "LeetCode", done: false },
  { text: "GitHub Contribution", done: false },
  { text: "Learning", done: false },
  { text: "Workout", done: false },
  { text: "Meditation", done: false }
];

/*******************************
      BACKEND FUNCTIONS
*******************************/
async function fetchTasks(dateKey) {
  const res = await fetch(`${API_URL}/${USER_ID}/${dateKey}`);
  const data = await res.json();
  return data?.tasks?.length ? data.tasks : [...defaultTasks];
}

async function saveTasks(dateKey, tasks) {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, date: dateKey, tasks })
  });
}

async function toggleTask(index) {
  await fetch(`${API_URL}/toggle`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, date: selectedDayKey, index })
  });
}

async function deleteTask(index) {
  await fetch(`${API_URL}/delete`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, date: selectedDayKey, index })
  });
}

/*******************************
     REMINDER SETTINGS SYSTEM
*******************************/
function getStoredTime() {
  return localStorage.getItem("notifyTime") || "22:00"; // default 10PM
}
notifyTimeInput.value = getStoredTime();

document.getElementById("saveSettings").onclick = () => {
  const newTime = notifyTimeInput.value;
  if (!newTime) return alert("⛔ Select a valid time");

  localStorage.setItem("notifyTime", newTime);
  localStorage.removeItem("lastEmailDate");
  localStorage.removeItem("lastEmailMinute");

  alert(`⏰ Reminder set for: ${newTime}`);
};

/*******************************
       RENDER CALENDAR
*******************************/
async function renderCalendar() {
  calendarEl.innerHTML = "";
  let m = date.getMonth(), y = date.getFullYear();

  monthYear.innerText = date.toLocaleString("default", { month: "long", year: "numeric" });

  let totalDays = new Date(y, m + 1, 0).getDate();
  let completedDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const key = `${d}-${m}-${y}`;
    const tasks = await fetchTasks(key);

    let div = document.createElement("div");
    div.className = "day";
    div.innerHTML = `<strong>${d}</strong>`;

    const isToday =
      d === today.getDate() &&
      m === today.getMonth() &&
      y === today.getFullYear();

    if (tasks.every(t => t.done)) {
      div.classList.add("completed");
      completedDays++;
    } else if (isToday) {
      div.classList.add("today", "incomplete");
    }

    div.onclick = () => openTaskModal(d, m, y);
    calendarEl.appendChild(div);
  }

  let percent = Math.round((completedDays / totalDays) * 100);
  document.getElementById("progressBar").style.width = percent + "%";
  document.getElementById("progressText").innerText = `${percent}% Done`;
}

/*******************************
        TASK MODAL SYSTEM
*******************************/
async function openTaskModal(d, m, y) {
  selectedDayKey = `${d}-${m}-${y}`;

  document.getElementById("taskModal").classList.remove("hidden");
  document.getElementById("modalTitle").innerText = `Tasks (${selectedDayKey})`;

  const list = document.getElementById("taskList");
  const tasks = await fetchTasks(selectedDayKey);

  list.innerHTML = "";

  tasks.forEach((t, i) => {
    let row = document.createElement("div");

    row.innerHTML = `
      <input type="checkbox" ${t.done ? "checked" : ""}>
      <span style="text-decoration:${t.done ? "line-through" : "none"}">${t.text}</span>
      <button class="task-delete">✕</button>
    `;

    row.querySelector("input").onchange = async () => {
      await toggleTask(i);
      renderCalendar();
      openTaskModal(d, m, y);
    };

    row.querySelector("button").onclick = async () => {
      await deleteTask(i);
      renderCalendar();
      openTaskModal(d, m, y);
    };

    list.appendChild(row);
  });
}

document.getElementById("addTask").onclick = async () => {
  let input = document.getElementById("taskInput");
  if (!input.value.trim()) return;

  const tasks = await fetchTasks(selectedDayKey);
  tasks.push({ text: input.value, done: false });

  await saveTasks(selectedDayKey, tasks);
  input.value = "";
  renderCalendar();
  openTaskModal(...selectedDayKey.split("-"));
};

function closeTaskModal() {
  document.getElementById("taskModal").classList.add("hidden");
}

/*******************************
       EMAIL REMINDER SYSTEM
*******************************/
async function hasPendingTasksToday() {
  const now = new Date();
  const todayKey = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`;
  const tasks = await fetchTasks(todayKey);
  return tasks.some(t => !t.done);
}

async function sendEmail() {
  await fetch("https://mail-api-iuw1zw.fly.dev/sendMail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "anubhavsingh2106@gmail.com",
      subject: "⚠ Task Reminder - You still have pending tasks!",
      websiteName: "Task Manager",
      message: "<h3>You still have pending tasks 🚨.</h3>"
    })
  });
}

async function checkReminder() {
  const reminderTime = getStoredTime();
  const now = new Date();
  const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (currentTime !== reminderTime) return;
  if (!(await hasPendingTasksToday())) return;

  const lastDate = localStorage.getItem("lastEmailDate");
  const lastMinute = localStorage.getItem("lastEmailMinute");
  const todayStr = now.toDateString();

  if (lastDate === todayStr && lastMinute === String(now.getMinutes())) return;

  await sendEmail();
  localStorage.setItem("lastEmailDate", todayStr);
  localStorage.setItem("lastEmailMinute", String(now.getMinutes()));
}

setInterval(checkReminder, 60000);
checkReminder();

/*******************************
         NAVIGATION
*******************************/
document.getElementById("prev").onclick = () => {
  date.setMonth(date.getMonth() - 1);
  renderCalendar();
};

document.getElementById("next").onclick = () => {
  date.setMonth(date.getMonth() + 1);
  renderCalendar();
};

renderCalendar();
