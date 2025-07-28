import { createSignal, Show } from 'solid-js';
import { Transition } from "solid-transition-group";
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import MaskDetector from './components/MaskDetector';
import './index.css';

// Define load states
type LoadState =
  | 'notStarted'
  | 'loading'
  | 'ready'

export default function App() {
  const [permissionGranted, setPermissionGranted] = createSignal<boolean>(false);
  const [showDetails, setShowDetails] = createSignal<boolean>(false);
  const [webcamLoading, setWebcamLoading] = createSignal<LoadState>('notStarted');
  const [modelsLoading, setModelsLoading] = createSignal<LoadState>('notStarted');

  // autoAnimtate setup
  const [parent] = createAutoAnimate({ duration: 500 })

  return (
    <div ref={parent} class="flex flex-col items-center justify-center min-h-screen bg-base-100 text-base-content space-y-6">
      <h1 class="text-5xl font-bold">
        Face Mask Classifier Demo
      </h1>

      {/* Idle state: ask user to enable websam */}
      <Show when={!permissionGranted()}>
        <button class="btn btn-primary" onClick={() => setPermissionGranted(true)}>
          Enable Webcam
        </button>
        <p class="text-sm text-warning">* Please allow camera permissions</p>
      </Show>


      {/* After pemission is given, always render MaskDetector */}
        <Show when={permissionGranted()}>
          <div class="flex flex-row items-start mt-4 gap-6">
            <MaskDetector
              onWebcamLoading={() => setWebcamLoading('loading')}
              onModelsLoading={() => setModelsLoading('loading')}
              onWebcamReady={() => setWebcamLoading('ready')}
              onModelsReady={() => setModelsLoading('ready')}
            />
            {/* ShowDetails state: about section */}
            <Transition 
              mode="outin"
              onEnter={(el, done) => {
                const a = el.animate(
                  [
                    { opacity: 0, transform: "translateY(10px)" },
                    { opacity: 1, transform: "translateY(0)" },
                  ],
                  { duration: 500, easing: "ease" }
                );
                a.finished.then(done);
              }}
              onExit={(el, done) => {
                const a = el.animate(
                  [
                    { opacity: 1, transform: "translateY(0)" },
                    { opacity: 0, transform: "translateY(10px)" },
                  ],
                  { duration: 500, easing: "ease" }
                );
                a.finished.then(done);
              }}
            >
              <Show when={!showDetails()}>
                <div class="max-w-md mt-4 md:mt-0">
                  <h2 class="text-xl font-bold mb-2">About This Demo</h2>
                  <p class="max-w-md">
                    This demo uses your webcam to detect a single face and classify in real time whether you’re wearing a mask or not.  
                    For simplicity, it currently supports detecting only one face at a time.
                  </p>
                    {/* Show spinners based on state */}
                    <Show when={webcamLoading() !== 'notStarted'}>
                      <div class="flex flex-col items-center justify-center space-y-2">
                        { webcamLoading() === 'loading' ? (
                            <>
                              <span class="loading loading-spinner loading-lg"></span>
                              <p>Starting webcam...</p>
                            </>
                          ) : (
                            <p class="text-success">Webcam successfully started!</p>
                          )
                        }
                      </div>
                    </Show>

                    <Show when={modelsLoading() !== 'notStarted'}>
                      <div class="flex flex-col items-center space-y-2">
                        { modelsLoading() === 'loading' ? (
                          <>
                            <span class="loading loading-spinner loading-lg"></span>
                            <p>Loading face-mask-classifer model...</p>
                          </>
                          ) : (
                            <p class="text-success">Model successfully loaded!</p>
                          )
                        }
                      </div>
                    </Show>

                    {/* Ready state: show message and button */}
                    <Show when={modelsLoading() === 'ready' && !showDetails()}>
                      <div class="flex flex-col items-center justify-center space-y-2">
                        <button class="justify-center btn btn-secondary mt-4" onClick={() => setShowDetails(true)}>
                          Learn about the Implementation
                        </button>
                      </div>
                    </Show>
                </div>
              </Show>

              <Show when={showDetails()}>
                <div class="max-w-md mt-4 md:mt-0">
                  <h2 class="text-xl font-bold mb-2">About This Demo's Implementation</h2>
                  <div>
                    <h3 class="text-lg font-bold">Client-side machine learning with Tensorflow.js</h3>
                    <p class="m-1">
                      This project showcases a real‑time face mask detector built entirely on the client side using <strong>TensorFlow.js</strong>.  
                      It uses a <strong>custom-trained Keras model</strong> that is downloaded and run locally in your browser, ensuring low latency and full privacy.
                    </p>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold">Fast frontend with Solid.js</h3>
                    <p class="m-1">
                      The user interface is built with <strong>Solid.js</strong>, a lightweight reactive JavaScript framework
                      that helps deliver fast updates and a smooth experience.
                    </p>
                  </div>
                  <h3 class="text-lg font-bold">Infrastructure as Code + CI/CD</h3>
                  <p class="m-1">
                    For deployment, I used <strong>Terraform</strong> as Infrastructure‑as‑Code to provision and manage the
                    <strong> S3</strong> bucket and <strong>CloudFront</strong> distribution that serve this site.  
                    Continuous deployment is handled with a <strong>GitHub Actions</strong> workflow, so updates to the main branch automatically build and deploy.
                  </p>
                </div>
              </Show>
            </Transition>
          </div>
        </Show>
    </div>
  )
}
