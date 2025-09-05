import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = createServer(app);

// Configure CORS for Socket.io with your actual S3 domain
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // Local development
      "http://pixijs-seatmap-cloud.s3-website-ap-southeast-2.amazonaws.com", // Your S3 domain
      // Add CloudFront domain later if you set it up
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Enable CORS for Express routes
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://pixijs-seatmap-cloud.s3-website-ap-southeast-2.amazonaws.com",
    ],
  }),
);

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
