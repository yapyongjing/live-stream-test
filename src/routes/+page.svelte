<script lang="ts">
  import io from "socket.io-client";
  let videoRef: HTMLVideoElement;
  let socket = io("http://54.169.97.63:3000");

  async function startStreaming() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoRef.srcObject = stream;

    socket.emit("getRouterRtpCapabilities", async (rtpCapabilities: any) => {
      console.log("Router Capabilities:", rtpCapabilities);
      // You would now use mediasoup-client to send the stream
    });
  }
</script>

<button on:click={startStreaming}>Start Streaming</button>
<video bind:this={videoRef} autoplay playsinline>
  <track kind="captions" src="captions.vtt" srclang="en" label="English">
</video>
