import { createSignal, onMount, onCleanup } from 'solid-js';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs';

export default function MaskDetector() {
  const [videoRef, setVideoRef] = createSignal<HTMLVideoElement | null>(null);
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null);
  const [maskModel, setMaskModel] =createSignal<tf.LayersModel | null >(null);
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
        // Crop face from video frame
        const faceImage = ctx.getImageData(xMin, yMin, width, height);

        const tensor =  tf.tidy(() =>
          tf.browser.fromPixels(faceImage)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .div(255.0)
            .expandDims(0) // shape [1, 224, 224, 3]
        );

        // Predict
        const prediction = maskModel()!.predict(tensor) as tf.Tensor;
        const data = await prediction.data();
        const maskProb = data[0];

        // Add Label
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.strokeRect(xMin, yMin, width, height);
        ctx.fillStyle = 'lime';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Mask: ${maskProb.toFixed(2)}`, xMin, yMin - 5);

        tensor.dispose();
        prediction.dispose?.();
      };


      setTimeout(detectLoop, 500);
    };

    detectLoop();
  });

  return (
    <div style="position: relative; display: inline-block;">
      <video
        ref={setVideoRef}
        autoplay
        muted
        playsinline
        width="640"
        height="480"
        style="position: absolute; top: 0; left: 0;"
      />
      <canvas
        ref={setCanvasRef}
        width="640"
        height="480"
        style="position: absolute; top: 0; left: 0;"
      />
    </div>
  );
}
