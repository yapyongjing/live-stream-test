<script lang="ts">
  import { onMount } from "svelte";
  import io from "socket.io-client";

  let socket: any;
  let consumerTransport: RTCPeerConnection;
  let videoElement: HTMLVideoElement;

  const serverUrl = "http://18.142.51.131:3000"; // Update with your actual server IP

  const connectSocket = () => {
    socket = io(serverUrl);

    socket.on("connect", async () => {
      console.log("🔗 Connected to server");
      await startWatching();
    });

    socket.on("newProducer", async (producerId: string) => {
      console.log("📡 New stream available. Connecting...");
      await startWatching();
    });
  };

  const startWatching = async () => {
    socket.emit(
      "getRouterRtpCapabilities",
      async (routerRtpCapabilities: any) => {
        console.log("📡 Router Capabilities:", routerRtpCapabilities);

        // ✅ Step 2: Create Consumer Transport
        socket.emit(
          "createConsumerTransport",
          async (transportOptions: any) => {
            if (transportOptions.error) {
              console.error("❌ Transport Error:", transportOptions.error);
              return;
            }

            consumerTransport = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

            // ✅ Now consume the stream
            socket.emit(
              "consume",
              { rtpCapabilities: routerRtpCapabilities },
              async (consumeResponse: any) => {
                if (consumeResponse.error) {
                  console.error("❌ Consume Error:", consumeResponse.error);
                  return;
                }

                console.log("🎥 Receiving Stream...", consumeResponse);

                if (!consumeResponse.sdp || consumeResponse.sdp === null) {
                  console.error("❌ No SDP offer received from server");
                  return;
                }

                // ✅ Set Remote Description (Wait for a valid offer)
                const offer = new RTCSessionDescription({
                  type: "offer",
                  sdp: consumeResponse.sdp,
                });
                await consumerTransport.setRemoteDescription(offer);

                // ✅ Create and Send Answer
                const answer = await consumerTransport.createAnswer();
                await consumerTransport.setLocalDescription(answer);

                // ✅ Inform server about the answer
                socket.emit(
                  "connectConsumerTransport",
                  { dtlsParameters: consumerTransport.localDescription },
                  (response: any) => {
                    if (response.error) {
                      console.error(
                        "❌ Consumer Transport Connection Error:",
                        response.error
                      );
                    } else {
                      console.log("✅ Consumer Transport Connected");
                    }
                  }
                );

                // ✅ Attach Media Stream
                const track = consumeResponse.track;
                if (track) {
                  videoElement.srcObject = new MediaStream([track]);
                  videoElement.play();
                } else {
                  console.error("❌ No track received in consume response.");
                }
              }
            );
          }
        );
      }
    );
  };

  onMount(() => {
    videoElement = document.getElementById("remoteVideo") as HTMLVideoElement;
    connectSocket();
  });
</script>

<main>
  <h1>📺 Live Stream</h1>
  <video id="remoteVideo" autoplay playsinline>
    <track kind="captions" src="captions.vtt" srclang="en" label="English">
  </video>
</main>

<style>
  main {
    text-align: center;
    padding: 20px;
  }
  video {
    width: 80%;
    max-width: 720px;
    margin: 20px 0;
    border: 2px solid #00ff00;
  }
</style>
