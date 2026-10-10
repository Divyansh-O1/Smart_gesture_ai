
const MODEL_URL = "./model/";

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const cameraView = document.getElementById("cameraView");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const cameraStatus = document.getElementById("cameraStatus");
const message = document.getElementById("message");
const modelStatus = document.getElementById("modelStatus");
const classCount = document.getElementById("classCount");
const predictionCount = document.getElementById("predictionCount");
const topPrediction = document.getElementById("topPrediction");
const topConfidence = document.getElementById("topConfidence");
const predictionList = document.getElementById("predictionList");

let model = null;
let webcam = null;
let cameraRunning = false;
let sessionPredictions = 0;
let predictionElements = [];

async function loadModel() {
  try {
    message.textContent = "Loading your trained model...";
    modelStatus.textContent = "Loading";

    model = await tmImage.load(
      MODEL_URL + "model.json",
      MODEL_URL + "metadata.json"
    );

    const totalClasses = model.getTotalClasses();
    classCount.textContent = totalClasses;
    modelStatus.textContent = "Ready";

    predictionList.replaceChildren();
    predictionElements = [];

    for (let i = 0; i < totalClasses; i++) {
      const item = document.createElement("div");
      item.className = "prediction-item";

      const meta = document.createElement("div");
      meta.className = "prediction-meta";

      const name = document.createElement("span");
      name.textContent = "Class " + (i + 1);

      const percent = document.createElement("span");
      percent.textContent = "0%";

      const track = document.createElement("div");
      track.className = "track";

      const fill = document.createElement("div");
      fill.className = "fill";

      meta.append(name, percent);
      track.appendChild(fill);
      item.append(meta, track);
      predictionList.appendChild(item);

      predictionElements.push({ name, percent, fill });
    }

    message.textContent = "Model loaded successfully. Start the camera when ready.";
  } catch (error) {
    console.error(error);
    modelStatus.textContent = "Error";
    message.textContent =
      "Could not load the model. Check the model folder and filenames, then refresh.";
  }
}

async function startCamera() {
  if (!model) {
    message.textContent = "Your model is still loading. Please wait.";
    return;
  }

  if (cameraRunning) return;

  startButton.disabled = true;
  message.textContent = "Requesting webcam access...";

  try {
    webcam = new tmImage.Webcam(400, 300, true);
    await webcam.setup();
    await webcam.play();

    cameraView.replaceChildren(webcam.canvas);
    webcam.canvas.setAttribute("aria-label", "Live webcam preview");

    cameraRunning = true;
    cameraStatus.textContent = "Camera on";
    startButton.disabled = true;
    stopButton.disabled = false;
    message.textContent = "Camera active. Show a gesture to the webcam.";

    predictLoop();
  } catch (error) {
    console.error(error);
    cameraRunning = false;
    startButton.disabled = false;
    cameraStatus.textContent = "Camera off";

    message.textContent =
      "Camera access failed. Allow camera permission and try again.";
  }
}

async function predictLoop() {
  if (!cameraRunning || !webcam || !model) return;

  try {
    webcam.update();

    const predictions = await model.predict(webcam.canvas);

    if (!cameraRunning) return;

    predictions.sort((a, b) => b.probability - a.probability);

    const best = predictions[0];

    topPrediction.textContent = best.className;
    topConfidence.textContent =
      (best.probability * 100).toFixed(1) + "%";

    predictions.forEach((prediction) => {
      const originalIndex = predictionElements.findIndex(
        (item) => item.name.textContent === prediction.className
      );

      if (originalIndex === -1) return;

      const item = predictionElements[originalIndex];
      const percentage = prediction.probability * 100;

      item.name.textContent = prediction.className;
      item.percent.textContent = percentage.toFixed(1) + "%";
      item.fill.style.width = percentage + "%";
    });

    sessionPredictions++;
    predictionCount.textContent = sessionPredictions;
  } catch (error) {
    console.error(error);
    message.textContent = "Prediction error. Check the browser console.";
    stopCamera();
    return;
  }

  if (cameraRunning) {
    requestAnimationFrame(predictLoop);
  }
}

function stopCamera() {
  cameraRunning = false;

  if (webcam) {
    webcam.stop();
    webcam = null;
  }

  cameraView.replaceChildren();

  const placeholder = document.createElement("div");
  placeholder.className = "placeholder";

  const icon = document.createElement("div");
  icon.className = "camera-icon";
  icon.textContent = "◎";

  const heading = document.createElement("h3");
  heading.textContent = "Your camera is waiting";

  const description = document.createElement("p");
  description.textContent = "Start the camera to resume recognition.";

  placeholder.append(icon, heading, description);
  cameraView.appendChild(placeholder);

  cameraStatus.textContent = "Camera off";
  startButton.disabled = false;
  stopButton.disabled = true;
  topPrediction.textContent = "Waiting...";
  topConfidence.textContent = "--%";
  message.textContent = model
    ? "Camera stopped. Your trained model is still loaded."
    : "Camera stopped.";
}

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);

window.addEventListener("beforeunload", () => {
  cameraRunning = false;

  if (webcam) {
    webcam.stop();
  }
});

loadModel();
