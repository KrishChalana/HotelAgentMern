const { main } = require("./Ai_agent");
const cors = require("cors");

const { GoogleGenAI } = require("@google/genai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
// main();

const express = require("express");
const app = express();
// const http = require('http');
// const server = http.createServer(app);
// const { Server } = require("socket.io");
// const io = new Server(server);
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/message", express.json(), async (req, res) => {
  const { history, message } = req.body;

  main(message, history)
    .then((response) => {
      res.json({ response });
    })
    .catch((error) => {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const multer = require("multer");

function getRandomInputPath(folder = "./input_voices") {
  const rand = Math.random().toString(36).substring(2, 10);
  return path.join(folder, `output-${rand}.wav`);
}

function STT(filePath) {
  return new Promise((resolve, reject) => {
    const whisperPath = path.resolve(
      __dirname,
      "../whisper.cpp/build/bin/release/whisper-cli.exe"
    );
    const modelPath = path.resolve(
      __dirname,
      "../whisper.cpp/models/ggml-base.en.bin"
    );
    // const inputPath = path.resolve(__dirname, filePath);

    const cmd = `"${whisperPath}" -m "${modelPath}" -f "${filePath}" -otxt`;
    console.log("Running command:", cmd);
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      const transcript = fs.readFileSync(filePath + ".txt", "utf-8");
      resolve(transcript.trim());
    });
  });
}

function TTS(text, outputPath) {
  return new Promise((resolve, reject) => {
    if (!text) return reject(new Error("No text provided"));

    // Wrap text to avoid command injection issues
    const safeText = text.replace(/"/g, '\\"');
    const filename = `output-${Date.now()}.wav`;
    const piperExe = path.resolve(__dirname, "../piper/piper.exe");
    const modelPath = path.resolve(
      __dirname,
      "../piper/en_US-bryce-medium.onnx"
    );
    const dirPath = path.resolve(__dirname, `output_voices`);
    const full_path = path.join(dirPath, filename);
    const command = `echo "${safeText}" | ${piperExe} -m ${modelPath} -f ${full_path}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Piper error:", stderr);
        return reject(new Error("Failed to generate speech"));
      }

      return resolve(path.join(dirPath, filename));
    });
  });
}

// Ensure input_voices folder exists
const input_voicesDir = path.join(__dirname, "input_voices");
if (!fs.existsSync(input_voicesDir)) {
  fs.mkdirSync(input_voicesDir);
}

const upload = multer({ dest: input_voicesDir });

app.post("/voice", upload.single("audio"), async (req, res) => {
  let transcript = null;
  let { history } = req.body;

  history = JSON.parse(history || "[]"); // Parse history if provided, else use empty array
  console.log(history);

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded." });
    }
    // Save with a random output path and .wav extension
    const randomOutputPath = getRandomInputPath(input_voicesDir);
    // console.log('Random output path:', randomOutputPath);
    // Convert uploaded file (webm) to wav using ffmpeg
    const ffmpegCmd = `ffmpeg -y -i "${req.file.path}" -ar 16000 -ac 1 -c:a pcm_s16le "${randomOutputPath}"`;
    exec(ffmpegCmd, async (err) => {
      // Remove the original uploaded file
      fs.unlink(req.file.path, () => {});
      if (err) {
        console.error("ffmpeg error:", err);
        return res.status(500).json({ error: "Audio conversion failed." });
      }
      try {
        transcript = await STT(randomOutputPath);
        // Optionally, remove the wav after transcription
        fs.unlink(randomOutputPath, () => {});

        main(transcript, history)
          .then((response) => {
            TTS(response, "output_voices/").then((audioPath) => {
              const audioBuffer = fs.readFileSync(audioPath); // path to TTS file
              const audioBase64 = audioBuffer.toString("base64");

              res.json({
                userMessage: transcript,
                modelMessage: response,
                audioBase64: audioBase64,
              });

              // res.sendFile(audioPath);
            });
          })
          .catch((error) => {
            console.error("Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
          });
      } catch (sttErr) {
        console.error("STT error:", sttErr);
        res.status(500).json({ error: "Transcription failed." });
      }
    });
  } catch (e) {
    res.status(500).json({ error: "Voice endpoint error." });
  }
});

app.listen(3000, () => {
  console.log("listening on *:3000");
});
