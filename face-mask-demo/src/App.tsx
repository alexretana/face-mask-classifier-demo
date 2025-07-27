import { createSignal, Show } from 'solid-js';
import { Motion } from 'solid-motionone';
import MaskDetector from './components/MaskDetector';
import './index.css';

export default function App() {
  const [hasPermission, setHasPermission] = createSignal(false)
  const [isWebcamReady, setIsWebcamReady] = createSignal(false)
  const [isModelLoaded, setIsModelLoaded] = createSignal(false)
  const [showDetails, setShowDetails] = createSignal(false)

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-base-100 text-base-content space-y-6">
      <Motion.h1
        animate={{opacity: [0, 1] }}
        transition={{ duration: 1 }}
        class="text-3xl font-bold"
      >
        Face Mask Demo
      </Motion.h1>

      <Show when={!hasPermission()}>
        <Motion.button
          animate={{ opacity: [0, 1] }}
          transition={{ duration: 1 }}
          class="btn btn-primary"
          onClick={() => setHasPermission(true)}
        >
          Enable Webcam
        </Motion.button>
        <p class="text-sm text-warning">* Please allow camera permissions</p>
      </Show>

      <Show when={hasPermission()}>
        <Motion.div 
          animate={{ opacity: [0, 1] }} 
          transition={{ duration: 1 }}
        >
          {!isWebcamReady() && (
            <div class="flex flex-col items-center space-y-2">
              <span class="loading loading-spinner loading-lg"></span>
              <p>Starting webcam</p>
            </div>
          )}

          <Show when={isModelLoaded()}>
            <p class="text-success">Model successfully loaded!</p>
            <Motion.button
              animate={{ opacity: [0, 1] }}
              transition={{ duration: 1 }}
              class="btn btn-secondary mt-4"
              onClick={() => setShowDetails(true)}
            >
              Learn about the implementation
            </Motion.button>
          </Show>
        </Motion.div>
      </Show>

      <Show when={hasPermission()}>
        <div class="flex flex-col md:flex-row md:space-x-4 items-start mt-4">
          <MaskDetector
            onWebcamReady={() => setIsWebcamReady(true)}
            onModelLoaded={() => setIsModelLoaded(true)}
          />
          <Show when={showDetails()}>
            <Motion.div
              animate={{ opacity: [0, 1] }}
              transition={{ duration: 1 }}
              class="max-w-md mt-4 md:mt-0"
            >
              <h2 class="text-xl font-semibold mb-2">About this demo</h2>
              <p>
                This demo uses a face landmark detector and a custom-trained mask
                classifier model to detect masks in real time from your webcam.
              </p>
            </Motion.div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
