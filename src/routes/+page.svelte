<script lang="ts">
  import { onMount } from "svelte";
  import io from "socket.io-client";

  let socket: any;
  let localStream: MediaStream;
  let producerTransport: RTCPeerConnection;
  let producer;

  const serverUrl = "http://18.142.51.131:3000"; // Update with your actual server IP
  const connectSocket = () => {
    socket = io(serverUrl);

    socket.on("connect", async () => {
      console.log("🔗 Connected to server");
      await startStreaming();
    });

    socket.on("newProducer", (producerId: string) => {
      console.log("📡 New producer detected:", producerId);
    });
  };

  const startStreaming = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const localVideo = document.getElementById("localVideo") as HTMLVideoElement;
    if (localVideo) {
      localVideo.srcObject = localStream;
    }

    // Step 1: Get Mediasoup Router Capabilities
    socket.emit("getRouterRtpCapabilities", async (rtpCapabilities: any) => {
      console.log("📡 Router Capabilities:", rtpCapabilities);

      // Step 2: Create Producer Transport
      socket.emit("createProducerTransport", async (transportOptions: any) => {
        if (transportOptions.error) {
          console.error("❌ Transport Error:", transportOptions.error);
          return;
        }

        producerTransport = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        producerTransport.setRemoteDescription(new RTCSessionDescription(transportOptions));
        const answer = await producerTransport.createAnswer();
        await producerTransport.setLocalDescription(answer);

        socket.emit("connectProducerTransport", { dtlsParameters: producerTransport.localDescription }, async (response: any) => {
          if (response.error) {
            console.error("❌ Producer Transport Connection Error:", response.error);
            return;
          }

          console.log("✅ Producer Transport Connected");

          // Step 3: Produce Stream
          localStream.getTracks().forEach((track) => {
            producerTransport.addTrack(track, localStream);
          });

          socket.emit("produce", { kind: "video", rtpParameters: {} }, (produceResponse: any) => {
            if (produceResponse.error) {
              console.error("❌ Produce Error:", produceResponse.error);
              return;
            }
            producer = produceResponse;
            console.log("🚀 Stream Started. Producer ID:", producer.id);
          });
        });
      });
    });
  };

  onMount(() => {
    connectSocket();
  });
</script>

<main>
  <h1>🎥 Live Stream</h1>
  <video id="localVideo" autoplay playsinline>
    <track kind="captions" src="captions.vtt" srclang="en" label="English">
  </video>
  <button on:click={startStreaming}>Start Streaming</button>
</main>

<style>
  main { text-align: center; padding: 20px; }
  video { width: 80%; max-width: 720px; margin: 20px 0; border: 2px solid #ff0000; }
</style>
