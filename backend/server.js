// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// For any basic route
app.get("/", (req, res) => {
  res.send("Hello Anonymous backend is running");
});

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*", // frontend origin, change if needed
    methods: ["GET", "POST"],
  },
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Chat message event
  socket.on("send_message", (data) => {
    // data = { text, timestamp, reply (optional) }
    io.emit("receive_message", data);
  });

  // Confession message event
  socket.on("send_confession", (data) => {
    // data = { text, timestamp }
    io.emit("receive_confession", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
