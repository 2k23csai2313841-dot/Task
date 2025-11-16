import axios from "axios";

async function wakeBackend(url) {
  try {
    await axios.get(url, { timeout: 5000 });
  } catch {
    // Backend still waking, ignore
  }
}

export default async function handler(req, res) {
  try {
    const USER_ID = "2313841";
    const backendURL = `https://todo-backend-5t1x.onrender.com/api/task`;

    const today = new Date();
    const dateKey = `${today.getDate()}-${today.getMonth()}-${today.getFullYear()}`;

    // Step 1: Wake backend (Render wakes slower than Vercel timeout)
    await wakeBackend(`${backendURL}/${USER_ID}/${dateKey}`);

    // Step 2: Fetch tasks (retry logic)
    let response;
    try {
      response = await axios.get(`${backendURL}/${USER_ID}/${dateKey}`, { timeout: 8000 });
    } catch {
      // retry once more after 2 sec delay
      await new Promise(res => setTimeout(res, 2000));
      response = await axios.get(`${backendURL}/${USER_ID}/${dateKey}`);
    }

    const tasks = response?.data?.tasks || [];

    // All tasks done → skip
    if (tasks.every(t => t.done)) {
      return res.status(200).json({ status: "All tasks completed — No email needed." });
    }

    // Send reminder
    await axios.post("https://mail-api-iuw1zw.fly.dev/sendMail", {
      to: "anubhavsingh2106@gmail.com",
      subject: "⚠ Reminder: Your Tasks Are Not Completed!",
      websiteName: "Task Manager",
      message: `<h3>🚨 You still have pending tasks today!</h3>`
    });

    return res.status(200).json({ status: "📩 Email sent successfully!" });

  } catch (err) {
    return res.status(500).json({ error: err.message, from: "Serverless error" });
  }
}
