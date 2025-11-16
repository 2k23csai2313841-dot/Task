import axios from "axios";

export default async function handler(req, res) {
  try {
    const USER_ID = "2313841";
    const backendURL = `https://todo-backend-5t1x.onrender.com/api/task`;

    const today = new Date();
    const dateKey = `${today.getDate()}-${today.getMonth()}-${today.getFullYear()}`;

    // Fetch tasks from your existing backend
    const response = await axios.get(`${backendURL}/${USER_ID}/${dateKey}`);
    const tasks = response.data.tasks || [];

    // If all tasks completed → no email
    if (tasks.every(t => t.done)) {
      return res.status(200).json({ status: "No email needed" });
    }

    // Send reminder email
    await axios.post("https://mail-api-iuw1zw.fly.dev/sendMail", {
      to: "anubhavsingh2106@gmail.com",
      subject: "⚠ Reminder: Your Tasks Are Not Completed!",
      websiteName: "Task Manager",
      message: `<h3>🚨 You still have pending tasks today!</h3>`
    });

    return res.status(200).json({ status: "Email sent!" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
