<script lang="ts">
    import io from "socket.io-client";
    import { onMount } from "svelte";
    let videoRef;
    let socket = io("http://54.169.97.63:3000");

    onMount(async () => {
      socket.emit("getRouterRtpCapabilities", async (rtpCapabilities:any) => {
        console.log("Viewer Connected:", rtpCapabilities);
        // Use mediasoup-client to receive and play the stream
      });
    });
  </script>

  <video bind:this={videoRef} autoplay playsinline>
    <track kind="captions" src="captions.vtt" srclang="en" label="English">
  </video>
