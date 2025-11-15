/* -----------------------------------------
   LOGIN PROTECTION
----------------------------------------- */
if (!localStorage.getItem("loggedIn")) {
  window.location.href = "index.html";
}
function logout(){
  localStorage.removeItem("loggedIn");
  window.location.href="index.html";
}

/* -----------------------------------------
   CONFIG
----------------------------------------- */
const API_URL = "https://todo-backend-5t1x.onrender.com/api/task";
const USER_ID = "2313841";

const calendarEl = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");

let date = new Date();
let today = new Date();
let selectedDayKey = "";

const defaultTasks = [
  { text: "LeetCode", done:false },
  { text: "GitHub Contribution", done:false },
  { text: "Workout", done:false },
];

let monthlyDataCache = {}; // stores fetched data for month
let skeletonState = true;


/* -----------------------------------------
   BACKEND HELPERS
----------------------------------------- */
async function fetchFromBackend(dateKey){
  try {
    let res = await fetch(`${API_URL}/${USER_ID}/${dateKey}`);
    let data = await res.json();

    if (!data?.tasks?.length){
      await fetch(API_URL,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ userId: USER_ID, date: dateKey, tasks:[...defaultTasks] })
      });
      monthlyDataCache[dateKey] = [...defaultTasks];
      return [...defaultTasks];
    }

    monthlyDataCache[dateKey] = data.tasks;
    return data.tasks;

  } catch (err){
    return defaultTasks;
  }
}


/* -----------------------------------------
   FETCH ALL DAYS ONCE (FAST UI)
----------------------------------------- */
async function preloadMonth(){
  let m=date.getMonth(), y=date.getFullYear();
  let totalDays = new Date(y, m+1, 0).getDate();

  for(let d=1; d<=totalDays; d++){
    const key = `${d}-${m}-${y}`;
    await fetchFromBackend(key);
  }

  skeletonState = false;
  updateColors();
}


/* -----------------------------------------
   RENDER EMPTY GRID FIRST (SKELETON)
----------------------------------------- */
function renderBaseCalendar(){
  calendarEl.innerHTML="";
  skeletonState = true;

  let m=date.getMonth(), y=date.getFullYear();
  monthYear.innerText = date.toLocaleString("default",{month:"long",year:"numeric"});

  let totalDays = new Date(y,m+1,0).getDate();

  for(let d=1; d<=totalDays; d++){
    const key = `${d}-${m}-${y}`;
    const div=document.createElement("div");

    div.className="day skeleton";
    div.dataset.key = key;
    div.innerHTML=`<strong>${d}</strong>`;

    div.onclick=()=>openTaskModal(d,m,y);
    calendarEl.appendChild(div);
  }

  preloadMonth(); // async load colors
}


/* -----------------------------------------
   UPDATE COLORS ONLY (NO RE-RENDER)
----------------------------------------- */
function updateColors(){
  const children = [...calendarEl.children];

  children.forEach(cell=>{
    const key = cell.dataset.key;

    cell.className="day"; // reset classes
    cell.innerHTML=`<strong>${key.split("-")[0]}</strong>`;

    let tasks = monthlyDataCache[key];

    if(!tasks) return;

    let isToday = key === `${today.getDate()}-${today.getMonth()}-${today.getFullYear()}`;

    if(tasks.every(t=>t.done)){
      cell.classList.add("completed");
    } else {
      cell.classList.add("incomplete");
    }

    if(isToday){
      cell.classList.add("today");
    }
  });
}


/* -----------------------------------------
         MODAL - SHOW + EDIT TASKS
----------------------------------------- */
async function openTaskModal(d,m,y){
  selectedDayKey = `${d}-${m}-${y}`;
  document.getElementById("taskModal").classList.remove("hidden");
  document.getElementById("modalTitle").innerText=`Tasks (${selectedDayKey})`;

  let list=document.getElementById("taskList");
  let tasks = await fetchFromBackend(selectedDayKey);

  list.innerHTML="";

  tasks.forEach((task,i)=>{
    let row=document.createElement("div");
    row.innerHTML=`
      <input type="checkbox" ${task.done?"checked":""}>
      <span style="text-decoration:${task.done?"line-through":"none"}">${task.text}</span>
      <button class="task-delete">✕</button>
    `;

    row.querySelector("input").onclick = async()=>{
      task.done=!task.done;
      await saveTasks(selectedDayKey, tasks);
      updateColors();
      openTaskModal(d,m,y);
    };

    row.querySelector("button").onclick = async()=>{
      tasks.splice(i,1);
      await saveTasks(selectedDayKey, tasks);
      updateColors();
      openTaskModal(d,m,y);
    };

    list.appendChild(row);
  });
}

/* SAVE TASKS */
async function saveTasks(dateKey, tasks){
  monthlyDataCache[dateKey] = tasks;

  await fetch(API_URL,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ userId: USER_ID, date:dateKey, tasks })
  });
}


/* ADD NEW TASK */
document.getElementById("addTask").onclick=async()=>{
  let input=document.getElementById("taskInput");
  if(!input.value.trim()) return;

  let tasks = await fetchFromBackend(selectedDayKey);
  tasks.push({text:input.value,done:false});
  input.value="";
  await saveTasks(selectedDayKey,tasks);
  updateColors();
  openTaskModal(...selectedDayKey.split("-"));
};

function closeTaskModal(){
  document.getElementById("taskModal").classList.add("hidden");
}

/* -----------------------------------------
      NAVIGATION WITHOUT RESETTING CACHE
----------------------------------------- */
document.getElementById("prev").onclick=()=>{
  date.setMonth(date.getMonth()-1);
  monthlyDataCache={};
  renderBaseCalendar();
};
document.getElementById("next").onclick=()=>{
  date.setMonth(date.getMonth()+1);
  monthlyDataCache={};
  renderBaseCalendar();
};

renderBaseCalendar();
