const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fetch = require("node-fetch");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

app.use(express.static(__dirname)); // serve html files

// Store sessions
let sessions = {};

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("create-session", () => {
    const sessionKey = Math.random().toString(36).substring(2, 8);
    sessions[sessionKey] = socket.id;

    // Send to Telegram
    if (BOT_TOKEN && CHAT_ID) {
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: `📲 New Screen Share Session Key: ${sessionKey}`
        })
      });
    }

    socket.emit("session-created", sessionKey);
  });

  socket.on("join-session", (sessionKey) => {
    const hostId = sessions[sessionKey];
    if (hostId) {
      socket.emit("session-joined", true);
      io.to(hostId).emit("viewer-joined", socket.id);
    } else {
      socket.emit("session-joined", false);
    }
  });

  socket.on("signal", (data) => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal
    });
  });

  socket.on("disconnect", () => {
    for (let key in sessions) {
      if (sessions[key] === socket.id) {
        delete sessions[key];
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
