if (!localStorage.getItem("loggedIn")) {
  window.location.href = "index.html";
}

function logout(){
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
}

const calendarEl = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");
const notifyTimeInput = document.getElementById("notifyTime");

let date = new Date();
let today = new Date();
let selectedDayKey = "";

const defaultTasks = [
  { text:"LeetCode", done:false },
  { text:"GitHub Contribution", done:false },
  { text:"Learning", done:false },
  { text:"Workout", done:false },
  { text:"Meditation", done:false }
];

function getTasks(key){
  let stored = JSON.parse(localStorage.getItem(key));
  if(!stored){
    localStorage.setItem(key, JSON.stringify(defaultTasks));
    return [...defaultTasks];
  }
  return stored;
}

function saveTasks(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

function getStoredTime(){
  return localStorage.getItem("notifyTime") || "21:00";
}
notifyTimeInput.value = getStoredTime();

document.getElementById("saveSettings").onclick = () => {
  const newTime = notifyTimeInput.value;

  if (!newTime) {
    alert("Please select a valid time ⏰");
    return;
  }

  // store new reminder time
  localStorage.setItem("notifyTime", newTime);

  // reset spam protection so next reminder sends only once
  localStorage.removeItem("lastEmailDate");
  localStorage.removeItem("lastEmailMinute");

  alert(`✅ Reminder time updated to ${newTime}`);
};


function renderCalendar() {
  calendarEl.innerHTML="";
  let m = date.getMonth(), y = date.getFullYear();
  monthYear.innerText = date.toLocaleString("default", {month:"long",year:"numeric"});

  let totalDays = new Date(y,m+1,0).getDate();
  let completedDays=0;

  for(let d=1; d<=totalDays; d++){
    let key = `${d}-${m}-${y}`;
    let tasks = getTasks(key);

    let div = document.createElement("div");
    div.className = "day";
    div.innerHTML = `<strong>${d}</strong>`;

    let isToday = d===today.getDate() && m===today.getMonth() && y===today.getFullYear();

    if(tasks.every(t=>t.done)){
      div.classList.add("completed");
      completedDays++;
    } else if(isToday){
      div.classList.add("today","incomplete");
    }

    if(isToday && tasks.every(t=>t.done)){
      div.classList.remove("incomplete");
      div.classList.add("completed");
    }

    div.onclick = ()=>openTaskModal(d,m,y);
    calendarEl.appendChild(div);
  }

  let percent = Math.round((completedDays/totalDays)*100);
  document.getElementById("progressBar").style.width = percent+"%";
  document.getElementById("progressText").innerText = `${percent}% Done`;
}

function openTaskModal(d,m,y){
  selectedDayKey = `${d}-${m}-${y}`;
  document.getElementById("taskModal").classList.remove("hidden");
  document.getElementById("modalTitle").innerText = `Tasks (${selectedDayKey})`;

  let list = document.getElementById("taskList");
  let tasks = getTasks(selectedDayKey);
  list.innerHTML="";

  tasks.forEach((t,i)=>{
    let row=document.createElement("div");
    row.innerHTML=`
      <input type="checkbox" ${t.done?"checked":""}>
      <span style="text-decoration:${t.done?"line-through":"none"}">${t.text}</span>
      <button style="float:right;color:red">❌</button>
    `;

    row.querySelector("input").onchange=()=>{
      t.done=!t.done;
      saveTasks(selectedDayKey,tasks);
      renderCalendar();
      openTaskModal(d,m,y);
    };

    row.querySelector("button").onclick=()=>{
      tasks.splice(i,1);
      saveTasks(selectedDayKey,tasks);
      renderCalendar();
      openTaskModal(d,m,y);
    };

    list.appendChild(row);
  });
}

document.getElementById("addTask").onclick=()=>{
  let input=document.getElementById("taskInput");
  if(!input.value.trim()) return;

  let tasks=getTasks(selectedDayKey);
  tasks.push({text:input.value,done:false});
  saveTasks(selectedDayKey,tasks);
  input.value="";
  renderCalendar();
  openTaskModal(...selectedDayKey.split("-"));
};

function closeTaskModal(){
  document.getElementById("taskModal").classList.add("hidden");
}

/* EMAIL REMINDER */
async function sendEmail(){
  await fetch("https://mail-api-iuw1zw.fly.dev/sendMail",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      to:"anubhavsingh2106@gmail.com",
      subject:"Your Today Target Not Completed ❌",
      websiteName:"Task Manager",
      message:"<h3>You still have pending tasks 🚨.</h3>"
    })
  });
}

async function checkReminder() {
  const savedTime = getStoredTime();
  const now = new Date();
  const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  // time not equal → skip
  if (currentTime !== savedTime) return;

  const todayKey = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`;
  const tasks = getTasks(todayKey);

  // If tasks done → no mail
  if (tasks.every(t => t.done)) return;

  // CHECK SAFE LOCK 🚫
  const lastEmailDate = localStorage.getItem("lastEmailDate");
  const lastEmailMinute = localStorage.getItem("lastEmailMinute");
  const todayDateString = now.toDateString();

  // if already sent same minute today → STOP (prevent spam)
  if (lastEmailDate === todayDateString && lastEmailMinute === String(now.getMinutes())) {
    console.log("⛔ Email already sent this minute. Skipping...");
    return;
  }

  // send only ONCE
  await sendEmail();
  console.log("📩 Email Sent Successfully!");

  // Save lock protection
  localStorage.setItem("lastEmailDate", todayDateString);
  localStorage.setItem("lastEmailMinute", String(now.getMinutes()));
}


setInterval(checkReminder,60000);
checkReminder();

/* Navigation */
document.getElementById("prev").onclick=()=>{date.setMonth(date.getMonth()-1);renderCalendar();}
document.getElementById("next").onclick=()=>{date.setMonth(date.getMonth()+1);renderCalendar();}
renderCalendar();
