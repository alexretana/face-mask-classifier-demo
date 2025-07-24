import { createSignal, onMount, onCleanup } from 'solid-js';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs';

export default function MaskDetector() {
  const [videoRef, setVideoRef] = createSignal<HTMLVideoElement | null>(null);
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null);
  const [maskModel, setMaskModel] =createSignal<tf.LayersModel | null >(null);
  const [croppedCanvasRef, setCroppedCanvasRef] = createSignal<HTMLCanvasElement | null>(null);
  let detector: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  let running = true;

  onMount(async () => {
    await tf.setBackend('webgl');
    await tf.ready();

    // Load mask classifier model
    const model = await tf.loadLayersModel('face-mask-classifier-tfjs-model/model.json')
    setMaskModel(model);

    // Load th face detector model
    detector = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      { runtime: 'tfjs', maxFaces: 1, refineLandmarks: false}
    );

    // Start webcam
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    const video = videoRef();
    if (!video) return;
    video.srcObject = stream;

    // Wait until video starts playing
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    // Stop webcam on cleanup
    onCleanup(() => {
      running = false;
      stream.getTracks().forEach(t => t.stop());
    });

    // Create detection loop
    const detectLoop = async () => {
      if (!running || !detector) return;

      const v = videoRef();
      const c = canvasRef();
      if (!v || !c) return;

      // Run face detection
      const faces = await detector.estimateFaces(v, { flipHorizontal: false });
      const ctx = c.getContext('2d');
      if (!ctx) return ;
      
      ctx.clearRect(0, 0, c.width, c.height);

      for (const face of faces) {
        const { xMin, yMin, width, height } = face.box;

        if (!maskModel()) {
          console.log('maskModel missing'); 
          return;   
        }
        // Create a temp canvas to draw the video frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = v.videoWidth
        tempCanvas.height = v.videoHeight
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx!.drawImage(v, 0, 0, tempCanvas.width, tempCanvas.height);

        // Now get the cropped face from that
        const faceImage = tempCtx!.getImageData(xMin, yMin, width, height);

        const croppedCanvas = croppedCanvasRef()
        if (croppedCanvas) {
          const croppedCtx = croppedCanvas.getContext('2d');
          if (croppedCtx) {
            // Clear and draw the cropped face
            croppedCtx.clearRect(0, 0, 224, 224);
            // Put the resized face in the new canvas
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = width;
            tmpCanvas.height = height;
            tmpCanvas.getContext('2d')!.putImageData(faceImage, 0, 0);
            croppedCtx.drawImage(tmpCanvas, 0, 0, 224, 224);
          }
        }

        const mean = tf.tensor1d([123.68, 116.779, 103.939]) // Hard coded average used in training

        const tensor =  tf.tidy(() =>
          tf.browser.fromPixels(faceImage)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .sub(mean)
            .expandDims(0) // shape [1, 224, 224, 3]
        );

        // Predict
        const prediction = maskModel()!.predict(tensor) as tf.Tensor;
        const data = await prediction.data();

        // Detemine Label
        const [maskProb, noMaskProb] = data;
        const isMasked = maskProb > noMaskProb;
        const label = isMasked ? 'Mask' : 'No Mask';
        const prob = isMasked ? maskProb : noMaskProb;
        const color = isMasked ? 'lime' : 'red';
        const text = `${label}: ${prob.toFixed(2)}`;;
        const textWidth = ctx.measureText(text).width;
        const textHeight = 16;

        // Add Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(xMin, yMin, width, height);

        // Add Transparent background box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(xMin, yMin - textHeight - 6, textWidth + 4, textHeight + 4);

        // Add text
        ctx.fillStyle = color;
        ctx.font = '16px sans-serif';
        ctx.fillText(text, xMin, yMin - 5);

        tensor.dispose();
        prediction.dispose?.();
      };


      setTimeout(detectLoop, 500);
    };

    detectLoop();
  });

  return (
    <div style="position: relative; display: inline-block; justify-content: center;">
      <video
        ref={setVideoRef}
        autoplay
        muted
        playsinline
        width="640"
        height="480"
        style="top: 0; left: 0;"
      />
      <canvas
        ref={setCanvasRef}
        width="640"
        height="480"
        style="position: absolute; top: 0; left: 0;"
      />
      <canvas
        ref={setCroppedCanvasRef}
        id="cropped"
        width="224"
        height="224"
        style="margin-left: 10px; border: 1px solid #ccc;"
      />
    </div>
  );
}
