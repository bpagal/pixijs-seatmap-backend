import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = createServer(app);

const LOCAL_URL = "http://localhost:5173";
const LIVE_URL = "https://pixijs-seatmap-backend.onrender.com/";

// Configure CORS for Socket.io with your actual S3 domain
const io = new Server(server, {
  cors: {
    origin: [LOCAL_URL, LIVE_URL],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Enable CORS for Express routes
app.use(cors({ origin: [LOCAL_URL, LIVE_URL] }));

// Health check endpoints (required for Elastic Beanstalk)
app.get("/", (_, res) => {
  res.send("Socket.io Seat Map Server is running!");
});

app.get("/health", (_, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    activeConnections: io.engine.clientsCount,
  });
});

type SeatSelection = {
  seatId: string;
  userId: string;
};

const seatState: Record<string, string> = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send snapshot to new client
  socket.emit("seatState", seatState);

  socket.on("seatSelected", ({ seatId, userId }: SeatSelection) => {
    console.log(`Seat selection attempt: ${seatId} by ${userId}`);

    if (seatState[seatId]) {
      // already taken → ignore
      console.log(`Seat ${seatId} already taken by ${seatState[seatId]}`);
      return;
    }

    seatState[seatId] = userId;
    console.log(`Seat ${seatId} assigned to ${userId}`);

    // Broadcast to all clients
    io.emit("seatSelected", { seatId, userId });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
