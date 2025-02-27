import express from "express";
import { Server } from "socket.io";
import http from "http";
import mediasoup from "mediasoup";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this if needed
    methods: ["GET", "POST"],
  },
});


let mediaSoupRouter;
let transport;
let producer;

// Initialize MediaSoup Router
async function initMediaSoup() {
  const worker = await mediasoup.createWorker();
  mediaSoupRouter = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
      },
    ],
  });
}

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("start-stream", async (callback) => {
    transport = await mediaSoupRouter.createWebRtcTransport({
      listenIps: [{ ip: "0.0.0.0", announcedIp: "54.169.97.63" }],
      enableUdp: true,
      enableTcp: true,
    });

    callback({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  });

  socket.on("produce", async ({ kind, rtpParameters }, callback) => {
    producer = await transport.produce({ kind, rtpParameters });
    callback({ id: producer.id });
  });

  socket.on("consume", async ({ rtpCapabilities }, callback) => {
    if (!mediaSoupRouter.canConsume({ producerId: producer.id, rtpCapabilities })) {
      return callback({ error: "Cannot consume stream" });
    }

    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: false,
    });

    callback({
      id: consumer.id,
      producerId: producer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    });
  });
});

server.listen(3000, async () => {
  await initMediaSoup();
  console.log("MediaSoup server running on port 3000");
});
