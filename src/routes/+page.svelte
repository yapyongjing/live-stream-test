<script lang="ts">
  import { onMount } from "svelte";
  import io from "socket.io-client";
  import * as mediasoupClient from "mediasoup-client";

  let socket: any;
  let device: mediasoupClient.Device;
  let producerTransport;
  let producer;
  let consumerTransport;
  let videoElement: HTMLVideoElement;

  onMount(() => {
    socket = io("http://54.169.97.63:3000", {
      transports: ["websocket"], // Force WebSocket mode
    });
    socket.on("connect", () => console.log("Connected to server"));
  });

  async function startStream() {
    device = new mediasoupClient.Device();
    const transportInfo = await new Promise((resolve) =>
      socket.emit("start-stream", resolve)
    );

    await device.load({
      routerRtpCapabilities:
        transportInfo as mediasoupClient.types.RtpCapabilities,
    });

    producerTransport = device.createSendTransport(
      transportInfo as mediasoupClient.types.TransportOptions
    );
    producerTransport.on("connect", async ({ dtlsParameters }, callback) => {
      socket.emit("transport-connect", { dtlsParameters });
      callback();
    });

    producerTransport.on(
      "produce",
      async ({ kind, rtpParameters }, callback) => {
        socket.emit(
          "produce",
          { kind, rtpParameters },
          ({ id }: { id: string }) => {
            callback({ id });
          }
        );
      }
    );

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    videoElement.srcObject = stream;

    const track = stream.getVideoTracks()[0];
    producer = await producerTransport.produce({ track });

    console.log("Streaming started!");
  }

  async function startViewing() {
    const transportInfo = await new Promise((resolve) =>
      socket.emit("start-stream", resolve)
    );

    consumerTransport = device.createRecvTransport(
      transportInfo as mediasoupClient.types.TransportOptions
    );
    consumerTransport.on("connect", async ({ dtlsParameters }, callback) => {
      socket.emit("transport-connect", { dtlsParameters });
      callback();
    });

    const { id, producerId, kind, rtpParameters } = await new Promise<{
      id: string;
      producerId: string;
      kind: "audio" | "video";
      rtpParameters: any;
    }>((resolve) =>
      socket.emit(
        "consume",
        { rtpCapabilities: device.rtpCapabilities },
        resolve
      )
    );

    const consumer = await consumerTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
    });

    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    videoElement.srcObject = stream;
  }
</script>

<h1>Live Streaming <button on:click={startViewing}>Start Viewing</button></h1>
<video bind:this={videoElement} autoplay playsinline>
  <track kind="captions" src="captions.vtt" srclang="en" label="English" />
</video>
<button on:click={startStream}>Start Streaming</button>
