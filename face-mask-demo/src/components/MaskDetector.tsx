import { createSignal, onMount, onCleanup } from 'solid-js';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs';

export default function MaskDetector(props: {
  onWebcamLoading: () => void
  onModelsLoading: () => void
  onWebcamReady: () => void
  onModelsReady: () => void
}) {
  const [videoRef, setVideoRef] = createSignal<HTMLVideoElement | null>(null);
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null);
  const [maskModel, setMaskModel] =createSignal<tf.LayersModel | null >(null);
  let detector: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  let running = true;

  onMount(async () => {
    await tf.setBackend('webgl');
    await tf.ready();
    
    // Start models loading ASAP
    props.onModelsLoading();
    const loadModelsPromise = (async () => {
      const loadedMaskModel = await tf.loadLayersModel('face-mask-classifier-tfjs-model/model.json');
      setMaskModel(loadedMaskModel);

      // Load the face detector model
      detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { runtime: 'tfjs', maxFaces: 1, refineLandmarks: false}
      );
    })();

    // Start webcam
    props.onWebcamLoading();
    const startWebcamPromise = (async () => {
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

      return stream;
    })();

    // Wait for models & webcam to be ready independently
    loadModelsPromise.then(() => props.onModelsReady());
    startWebcamPromise.then(() => props.onWebcamReady());

    // Wait for both to complete before starting detection loop
    const [_, stream] = await Promise.all([
      loadModelsPromise,
      startWebcamPromise
    ]);

    // Stop webcam on cleanup
    onCleanup(() => {
      running = false;
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
    });

    // Create detection loop
    const detectLoop = async () => {
      if (!running || !detector) return;

      const v = videoRef();
      const c = canvasRef();
      if (!v || !c) return;

      // Create temp canvas to hold flipped frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = v.videoWidth;
      tempCanvas.height = v.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');

      // Flip horizontally on temp canvas
      tempCtx!.save();
      tempCtx!.translate(tempCanvas.width, 0);
      tempCtx!.scale(-1, 1);
      tempCtx!.drawImage(v, 0, 0, tempCanvas.width, tempCanvas.height)
      tempCtx!.restore();

      // Run face detection
      const faces = await detector.estimateFaces(tempCanvas, { flipHorizontal: false });
      const ctx = c.getContext('2d');
      if (!ctx) return ;
      
      ctx.clearRect(0, 0, c.width, c.height);

      for (const face of faces) {
        const { xMin, yMin, width, height } = face.box;

        if (!maskModel()) {
          console.log('maskModel missing'); 
          return;   
        }
        // Now get the cropped face from that
        const faceImage = tempCtx!.getImageData(xMin, yMin, width, height);

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
    <div class="relative inline-block">
      <video
        ref={setVideoRef}
        autoplay
        muted
        playsinline
        width="640"
        height="480"
        class="transform -scale-x-100"
      />
      <canvas
        ref={setCanvasRef}
        width="640"
        height="480"
        class="absolute top-0 left-0"
      />
    </div>
  );
}
