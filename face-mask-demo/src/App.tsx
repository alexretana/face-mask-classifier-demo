import { createSignal, Show } from 'solid-js';
import { Motion } from 'solid-motionone';
import MaskDetector from './components/MaskDetector';
import './index.css';

// Define the possible states
type AppState =
  | 'idle'                    // waiting for user to click "Enable Webcam"
  | 'startingWebcam'          // permission given, waiting for webcam
  | 'loadingModel'            // webcam ready, loading model
  | 'ready'                   // model loaded
  | 'showDetails'          // user clicked learn

export default function App() {
  const [state, setState] = createSignal<AppState>('idle')

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-base-100 text-base-content space-y-6">
      <Motion.h1
        animate={{opacity: [0, 1] }}
        transition={{ duration: 1 }}
        class="text-3xl font-bold"
      >
        Face Mask Demo
      </Motion.h1>

      {/* Idle state: ask user to enable websam */}
      <Show when={state() === 'idle'}>
        <Motion.button
          animate={{ opacity: [0, 1] }}
          transition={{ duration: 1 }}
          class="btn btn-primary"
          onClick={() => setState('startingWebcam')}
        >
          Enable Webcam
        </Motion.button>
        <p class="text-sm text-warning">* Please allow camera permissions</p>
      </Show>


      {/* After pemission is given, always render MaskDetector */}
      <Show when={state() !== 'idle'}>
        <Motion.div 
          animate={{ opacity: [0, 1] }}
          transition={{ duration: 1 }}
          class="flex flex-row items-start mt-4 gap-6"
        >
          <MaskDetector
            onWebcamReady={() => setState('loadingModel')}
            onModelLoaded={() => setState('ready')}
          />
          {/* ShowDetails state: about section */}
          <Show when={state() === 'showDetails'}>
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
        </Motion.div>

        {/* Show spinners based on state */}
        <Show when={state() === 'startingWebcam'}>
          <div class="flex flex-col items-center justify-center space-y-2">
            <span class="loading loading-spinner loading-lg"></span>
            <p>Starting webcam...</p>
          </div>
        </Show>

        <Show when={state() === 'loadingModel'}>
          <div class="flex flex-col items-center space-y-2">
            <span class="loading loading-spinner loading-lg"></span>
            <p>Loading face-mask-classifer model...</p>
          </div>
        </Show>

        {/* Ready state: show message and button */}
        <Show when={state() === 'ready'}>
          <p class="text-success">Model successfully loaded!</p>
          <Motion.button
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 1 }}
            class="btn btn-secondary mt-4"
            onClick={() => setState('showDetails')}
          >
            Learn about the implementation
          </Motion.button>
        </Show>
      </Show>
    </div>
  )
}
