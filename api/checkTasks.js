import axios from "axios";

export default async function handler(req, res) {
  try {
    const USER_ID = "2313841";
    const backendURL = `https://todo-backend-5t1x.onrender.com/api/task`;

    const today = new Date();
    const dateKey = `${today.getDate()}-${today.getMonth()}-${today.getFullYear()}`;

    // Warm Render (because Render sleeps)
    await axios.get(`${backendURL}/${USER_ID}/${dateKey}`).catch(() => {});

    // Try again (actual request)
    const response = await axios.get(`${backendURL}/${USER_ID}/${dateKey}`);
    const tasks = response?.data?.tasks || [];

    if (tasks.every(t => t.done)) {
      return res.status(200).json({ message: "🎉 No email needed. All tasks complete." });
    }

    await axios.post("https://mail-api-iuw1zw.fly.dev/sendMail", {
      to: "anubhavsingh2106@gmail.com",
      subject: "⚠ Reminder: Tasks Pending",
      websiteName: "Task Manager",
      message: `<h3>🚨 You still have pending tasks today!</h3>`
    });

    return res.status(200).json({ message: "📩 Email sent successfully!" });

  } catch (err) {
    console.error("❌ Serverless error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
