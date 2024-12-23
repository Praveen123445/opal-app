import { hidePluginWindow } from "./utils";
import { v4 as uuid } from "uuid";
import io from 'socket.io-client'

let videoTransferFileName: string | undefined;
let mediaRecorder: MediaRecorder;
let userId: string;

const socket = io(import.meta.env.VITE_SOCKET_URL as string)

export const StartRecording = (onSourses: {
  screen: string;
  audio: string;
  id: string;
}) => {
  hidePluginWindow(true);
  videoTransferFileName = `${uuid()}-${onSourses?.id.slice(0, 8)}.webm`;
  mediaRecorder.start(1000);
};

export const onStopRecording = () => mediaRecorder.stop();
const stopRecording = () => {
  hidePluginWindow(false);
  socket.emit("process-video", {
    filename: videoTransferFileName,
    userId,
  })
}

export const onDataAvailable = (e: BlobEvent) => {
  alert('running')
  socket.emit('video-chunks',{
    chunks: e.data,
    filename: videoTransferFileName,
  })
}

export const selectSources = async (
  onSourses: {
    screen: string;
    audio: string;
    id: string;
    preset: "HD" | "SD";
  },
  videoElement: React.RefObject<HTMLVideoElement>
) => {
  if (onSourses && onSourses.screen && onSourses.audio && onSourses.id) {
    const constraints: any = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSources: "desktop",
          chromeMediaSourceId: onSourses?.screen,
          minWidth: onSourses.preset === "HD" ? 1920 : 1280,
          maxWidth: onSourses.preset === "HD" ? 1920 : 1280,
          minHeight: onSourses.preset === "HD" ? 1080 : 720,
          maxHeight: onSourses.preset === "HD" ? 1080 : 720,
          frameRate: 30,
        },
      },
    };
    userId = onSourses.id
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    const audioStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: { deviceId: { exact: onSourses.audio}},
    })
    
    if (videoElement && videoElement.current) {
      videoElement.current.srcObject = stream
      await videoElement.current.play();
    }

    const combinedStream = new MediaStream([
      ...stream.getTracks(),
      ...audioStream.getTracks(),
    ])

    mediaRecorder = new MediaRecorder(combinedStream,{
      mimeType:"video/webm; codecs=vp9",
    })
    
    mediaRecorder.ondataavailable = onDataAvailable;
    mediaRecorder.onstop = stopRecording
  }
};
