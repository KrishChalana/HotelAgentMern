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
// In-memory transcript store
// uses session ID as key to store transcripts
const transcripts = {}; 
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

function getRandomPath(folder = "./output_voices") {
  const rand = Math.random().toString(36).substring(2, 10);
  return path.join(folder, `output-${rand}.wav`);
}



// Use streaming in whisper.
function STT(filePath) {
  return new Promise((resolve, reject) => {
    const output_file_path = getRandomPath();
    const full_path = path.resolve(__dirname, output_file_path);
    const ffmpegCmd = `ffmpeg -y -i "${filePath}" -ar 16000 -ac 1 -c:a pcm_s16le "${full_path}"`;
    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error('FFmpeg processing failed'));
      } else {
        const whisperPath = path.resolve(
          __dirname,
          "../whisper.cpp/build/bin/release/whisper-cli.exe"
        );
        const modelPath = path.resolve(
          __dirname,
          "../whisper.cpp/models/ggml-base.en.bin"
        );
        const cmd = `"${whisperPath}" -m "${modelPath}" -t 8 -otxt -f "${full_path}" `;
        console.log("Running command:", cmd);
        exec(cmd, (err, stdout, stderr) => {
          if (err) return reject(stderr);
          const transcript = fs.readFileSync(full_path + ".txt", "utf-8");
          resolve(transcript.trim());

          // Clean up the temporary text file
          fs.unlink(`${filePath}`, (unlinkErr) => {
            if (unlinkErr) {
              console.error("Failed to delete temp file:", unlinkErr);
            } else {
              console.log("Temporary text file deleted successfully.");
            }
          });
        });
      }
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
const input_voicesDir = path.join(__dirname, "temp_chunks");
if (!fs.existsSync(input_voicesDir)) {
  fs.mkdirSync(input_voicesDir);
}

const upload = multer({ dest: input_voicesDir });

app.post("/voice", upload.none(), async (req, res) => {
  console.log("Received voice request");
  const sessionId = req.headers["x-session-id"];
  if (!sessionId) {
    return res.status(400).json({ error: "No transcript for this session" });
  }

  try {
    await waitForTranscript(sessionId); // Wait for /stream to finish

    let transcript = transcripts[sessionId].message || null;
    console.log("Transcript for session:", sessionId, transcript);
    if (transcript == null) return res.status(500).json({ error: "No transcript" });

    let { history } = req.body;
    history = JSON.parse(history || "[]");
    console.log(history);

    main(transcript, history)
      .then((response) => {
        TTS(response, "output_voices/").then((audioPath) => {
          const audioBuffer = fs.readFileSync(audioPath);
          const audioBase64 = audioBuffer.toString("base64");

          res.json({
            userMessage: transcript,
            modelMessage: response,
            audioBase64: audioBase64,
          });

          transcripts[sessionId] = {
            message: "", 
            completed: false,
            is_last: false,
            pending: 0,}
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      });
  } catch (e) {
    res.status(500).json({ error: "Voice endpoint timeout or error." });
  }
});

app.post("/stream", upload.single("chunk"), async (req, res) => {
  
  if(req.body.is_last){
    console.log("Received final chunk, processing...");
    const sessionId = req.headers["x-session-id"];
    if (!sessionId) return res.status(400).send("Missing session ID");

    // Mark the session as completed
    if (transcripts[sessionId]) {
      transcripts[sessionId]['is_last'] = true;
      console.log("Session completed:", sessionId);
    } else {
      if (!transcripts[sessionId]) {
    transcripts[sessionId] = { message: "", completed: false,is_last: true, pending: 0 };
  }
    }
    return res.status(200).send("Final chunk received");
  }
  
  
  
  const chunk = req.file;
  const sessionId = req.headers["x-session-id"];
  if (!chunk || !sessionId) return res.status(400).send("Missing chunk or session ID");

  const chunkFilename = `chunk-${Date.now()}.webm`;
  const chunkPath = path.join(__dirname, "temp_chunks", chunkFilename);

  fs.renameSync(chunk.path, chunkPath);

  // Always initialize
  if (!transcripts[sessionId]) {
    transcripts[sessionId] = { message: "", completed: false,is_last: false, pending: 0 };
  }
  transcripts[sessionId]['completed'] = false;
  transcripts[sessionId]['pending'] += 1;


  try {
     STT(chunkPath).then((partialTranscript) => {
      console.log("[PARTIAL]", partialTranscript);
          if(!partialTranscript) {return res.status(500).json({ error: "No transcript generated" });}
          transcripts[sessionId].message += partialTranscript + " ";
          transcripts[sessionId]['completed'] = true;
          console.log("Transcript updated for session:", transcripts[sessionId]);
          if(transcripts[sessionId]['pending']>0){
            transcripts[sessionId]['pending'] -= 1;
          }
          res.status(200).send();

    }).catch(err=>{

if(transcripts[sessionId]['pending']>0){
            transcripts[sessionId]['pending'] -= 1;
          }

          res.status(500).json({ error: "STT processing failed", details: err.message });

    });
    
  } catch (error) {
    transcripts[sessionId]['completed'] = true;
    console.error("STT processing failed:", error);
    res.status(500).json({ error: "STT processing failed" });
  }
});

// there is some garbage code in /stream endpoint  , but it works for now

function waitForTranscript(sessionId, timeout = 10000, interval = 200) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      if (transcripts[sessionId] && transcripts[sessionId].pending === 0 && transcripts[sessionId].completed) {
        return resolve();
      }
      if (Date.now() - start > timeout) {
        return reject(new Error("Timeout waiting for transcript"));
      }
      setTimeout(check, interval);
    }
    check();
  });
}

app.listen(3000, () => {
  console.log("listening on *:3000");
});
