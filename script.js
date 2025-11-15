/***************************************
               LOGIN CHECK
***************************************/
if (!localStorage.getItem("loggedIn")) {
  window.location.href = "index.html";
}

function logout(){
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
}

/***************************************
              CONFIG
***************************************/
const API_URL = "https://todo-backend-5t1x.onrender.com/api/task";
const USER_ID = "2313841";

const calendarEl = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");
const notifyTimeInput = document.getElementById("notifyTime");

let date = new Date();
let today = new Date();
let selectedDayKey = "";

let calendarCache = {}; // store backend results temporarily

const defaultTasks = [
  { text:"LeetCode", done:false },
  { text:"GitHub Contribution", done:false },
  { text:"Workout", done:false },
];


/***************************************
       BACKEND SYNC FUNCTIONS
***************************************/
async function fetchTasks(dateKey) {

  // Cache exists → return cached result (fast switching)
  if (calendarCache[dateKey]) return calendarCache[dateKey];

  const res = await fetch(`${API_URL}/${USER_ID}/${dateKey}`);
  const data = await res.json();

  // If no backend entry → create first time entry:
  if (!data?.tasks?.length) {
    await fetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ userId: USER_ID, date: dateKey, tasks: [...defaultTasks] })
    });

    calendarCache[dateKey] = [...defaultTasks];
    return [...defaultTasks];
  }

  calendarCache[dateKey] = data.tasks;
  return data.tasks;
}

async function saveTasks(dateKey, tasks){
  calendarCache[dateKey] = tasks;
  await fetch(API_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({userId:USER_ID, date:dateKey, tasks})
  });
}

async function toggleTask(index){
  await fetch(`${API_URL}/toggle`,{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({userId:USER_ID, date:selectedDayKey, index})
  });
  delete calendarCache[selectedDayKey]; // force refresh
}

async function deleteTask(index){
  await fetch(`${API_URL}/delete`,{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({userId:USER_ID, date:selectedDayKey, index})
  });
  delete calendarCache[selectedDayKey];
}


/***************************************
            SETTINGS (REMINDER)
***************************************/
function getStoredTime(){
  return localStorage.getItem("notifyTime") || "22:00";
}
notifyTimeInput.value = getStoredTime();

document.getElementById("saveSettings").onclick = () => {
  const t = notifyTimeInput.value;
  if(!t) return alert("⛔ Select valid time");

  localStorage.setItem("notifyTime", t);
  localStorage.removeItem("lastEmailDate");
  localStorage.removeItem("lastEmailMinute");
  alert(`⏰ Reminder set for ${t}`);
};


/***************************************
        SKELETON CALENDAR LOADING
***************************************/
function renderSkeletonCalendar(){
  calendarEl.innerHTML="";
  monthYear.innerText="Loading... ⏳";

  for(let i=1;i<=42;i++){
    const skel=document.createElement("div");
    skel.className="day skeleton";
    calendarEl.appendChild(skel);
  }
}


/***************************************
          RENDER CALENDAR WITH DATA
***************************************/
async function renderCalendar(){
  renderSkeletonCalendar(); // first show placeholder

  await new Promise(res=>setTimeout(res,400)); // smooth feel

  calendarEl.innerHTML="";
  let m=date.getMonth(), y=date.getFullYear();

  monthYear.innerText = date.toLocaleString("default",{month:"long",year:"numeric"});

  let totalDays=new Date(y,m+1,0).getDate();
  let completedDays=0;

  for(let d=1; d<=totalDays; d++){
    let key = `${d}-${m}-${y}`;
    let tasks = await fetchTasks(key);

    let div=document.createElement("div");
    div.className="day";
    div.innerHTML=`<strong>${d}</strong>`;

    let isToday = d===today.getDate() && m===today.getMonth() && y===today.getFullYear();

    if(tasks.every(t=>t.done)){
      div.classList.add("completed");
      completedDays++;
    } else{
      div.classList.add("pending");
    }

    if(isToday){
      div.classList.add("today");
    }

    div.onclick=()=>openTaskModal(d,m,y);
    calendarEl.appendChild(div);
  }

  let percent=Math.round((completedDays/totalDays)*100);
  document.getElementById("progressBar").style.width = percent+"%";
  document.getElementById("progressText").innerText = `${percent}% Done`;
}


/***************************************
             TASK MODAL
***************************************/
async function openTaskModal(d,m,y){
  selectedDayKey = `${d}-${m}-${y}`;
  document.getElementById("taskModal").classList.remove("hidden");
  document.getElementById("modalTitle").innerText=`Tasks (${selectedDayKey})`;

  let list=document.getElementById("taskList");
  let tasks = await fetchTasks(selectedDayKey);
  list.innerHTML="";

  tasks.forEach((t,i)=>{
    let row=document.createElement("div");
    row.innerHTML=`
      <input type="checkbox" ${t.done?"checked":""}>
      <span style="text-decoration:${t.done?"line-through":"none"}">${t.text}</span>
      <button class="task-delete">✕</button>
    `;

    row.querySelector("input").onchange=async()=>{
      await toggleTask(i);
      renderCalendar();
      openTaskModal(d,m,y);
    };

    row.querySelector("button").onclick=async()=>{
      await deleteTask(i);
      renderCalendar();
      openTaskModal(d,m,y);
    };

    list.appendChild(row);
  });
}

document.getElementById("addTask").onclick=async()=>{
  let input=document.getElementById("taskInput");
  if(!input.value.trim()) return;

  let tasks=await fetchTasks(selectedDayKey);
  tasks.push({text:input.value,done:false});

  await saveTasks(selectedDayKey,tasks);
  input.value="";
  renderCalendar();
  openTaskModal(...selectedDayKey.split("-"));
};

function closeTaskModal(){
  document.getElementById("taskModal").classList.add("hidden");
}


/***************************************
            REMINDER SYSTEM
***************************************/
async function hasPendingToday(){
  const now=new Date();
  const key=`${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`;
  const tasks=await fetchTasks(key);
  return tasks.some(t=>!t.done);
}

async function sendEmail(){
  await fetch("https://mail-api-iuw1zw.fly.dev/sendMail",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      to:"anubhavsingh2106@gmail.com",
      subject:"⚠ Reminder: Tasks Pending",
      websiteName:"Task Manager",
      message:"<h3>You still have pending tasks 🚨.</h3>"
    })
  });
}

async function checkReminder(){
  const time=getStoredTime();
  const now=new Date();
  const timeNow=`${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;

  if(timeNow!==time) return;
  if(!await hasPendingToday()) return;

  const last=localStorage.getItem("lastEmailDate");
  const minute=localStorage.getItem("lastEmailMinute");
  const todayStr=now.toDateString();

  if(last===todayStr && minute===String(now.getMinutes())) return;

  await sendEmail();
  localStorage.setItem("lastEmailDate",todayStr);
  localStorage.setItem("lastEmailMinute",String(now.getMinutes()));
}

setInterval(checkReminder,60000);
checkReminder();


/***************************************
             NAVIGATION
***************************************/
document.getElementById("prev").onclick=()=>{date.setMonth(date.getMonth()-1);renderCalendar();};
document.getElementById("next").onclick=()=>{date.setMonth(date.getMonth()+1);renderCalendar();};

renderCalendar();
