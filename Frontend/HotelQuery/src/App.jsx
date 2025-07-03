import { useState, useEffect, useRef } from "react";
import axios from "axios";
const BACKEND_URL = "http://localhost:3000"; // Update with your backend URL

const initialMessages = [
  {
    role: "model",
    parts: [{ text: "Hello How are you" }],
  },
];

const AVATARS = {
  model: "https://randomuser.me/api/portraits/women/44.jpg",
  user: "https://randomuser.me/api/portraits/men/32.jpg",
};

function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {}, []); // GET INITAL data from backend but there is not inital data in backend bro ? why r u so dumb

  // Responsive styles
  const styles = {
    container: {
      display: "flex",
      // height: "100vh",
      background: "linear-gradient(120deg, #f8fafc 0%, #e0e7ef 100%)",
      minHeight: 0,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
      position: "relative",
      // width: "100vw",
      // maxWidth: "100vw",
      // maxHeight: "100vh",
      overflow: "hidden",
    },
    main: {
      width: "100%",
      maxWidth: 500,
      minHeight: 600,
      maxHeight: 700, // limit card height
      background: "#fff",
      borderRadius: 28,
      boxShadow: "0 8px 40px 0 rgba(37, 99, 235, 0.10), 0 1.5px 8px 0 rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 0 0 0",
      overflow: "hidden", // hide overflow
      margin: 24,
    },
    chatWrapper: {
      width: "100%",
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 28,
      marginBottom: 24,
      overflowY: "auto", // enable vertical scroll
      minHeight: 0,
      padding: "0 40px",
      maxHeight: 340, // set max height for scroll
      scrollbarWidth: "thin",
      scrollbarColor: "#e0e7ef #fff",
    },
    inputArea: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      background: "#f3f6fa",
      borderRadius: 18,
      padding: 12,
      margin: "0 0 40px 0",
      boxShadow: "0 1.5px 8px rgba(37,99,235,0.04)",
      border: "1.5px solid #e0e7ef",
      maxWidth: 440,
      alignSelf: "center",
      gap: 10,
    },
  };
  // Responsive sidebar: collapse on small screens
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 700);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    const oldhistory = messages;
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        parts: [{ text: input }],
      },
    ]);

    axios
      .post(`${BACKEND_URL}/message`, {
        history: oldhistory,
        message: {
          role: "user",
          parts: [{ text: input }],
        },
      })
      .then((response) => {
        const newMessage = response.data.response;
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            parts: [{ text: newMessage }],
          },
        ]);
      });
    setInput("");
  };

  // --- Voice Recording ---
  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    } else {
      // Start recording
      audioChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new window.MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          // Send to backend
          const formData = new FormData();
          formData.append("audio", audioBlob, "voice.webm");
          formData.append("history", JSON.stringify(messages));
          try {
            const res = await axios.post(`${BACKEND_URL}/voice`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });

            const { userMessage, modelMessage, audioBase64 } = res.data;

            console.log("User:", userMessage);
            console.log("Model:", modelMessage);

            const audioBlob = base64ToBlob(audioBase64, "audio/wav");
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            audio.play().catch(() => {
              // Playback failed
            });

            function base64ToBlob(base64, mime) {
              const byteChars = atob(base64);
              const byteNumbers = new Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) {
                byteNumbers[i] = byteChars.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              return new Blob([byteArray], { type: mime });
            }

            setMessages((prev) => [
              ...prev,
              {
                role: "user",
                parts: [{ text: userMessage }],
              },
              {
                role: "model",
                parts: [{ text: modelMessage }],
              },
            ]);
          } catch {
            alert("Voice message failed.");
          }
        };
        mediaRecorder.start();
        setIsRecording(true);
      } catch {
        alert("Microphone access denied or not available.");
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Decorative SVG background */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <defs>
          <radialGradient id="bg1" cx="50%" cy="40%" r="80%" fx="60%" fy="30%" gradientTransform="rotate(20)">
            <stop offset="0%" stopColor="#e0e7ef" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b6c6e6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <ellipse cx="1100" cy="120" rx="420" ry="180" fill="url(#bg1)" />
        <ellipse cx="300" cy="800" rx="340" ry="120" fill="url(#bg2)" />
        <ellipse cx="1400" cy="900" rx="200" ry="80" fill="#e0e7ef" fillOpacity="0.13" />
      </svg>
      {/* Main Chat Area Only */}
      <main style={{ ...styles.main, zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 440, textAlign: "center", marginBottom: 18 }}>
          <h1
            style={{
              fontSize: isMobile ? 24 : 34,
              fontWeight: 800,
              marginBottom: 10,
              letterSpacing: "-1.5px",
              color: "#1a237e",
              lineHeight: 1.1,
            }}
          >
            Hotel AI Agent
          </h1>
          <div
            style={{
              color: "#5c6f8c",
              fontSize: isMobile ? 15 : 18,
              marginBottom: 36,
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            Your personal assistant for all hotel queries.
          </div>
        </div>
        <div style={styles.chatWrapper}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const avatar = AVATARS[msg.role] || AVATARS["model"];
            const text =
              msg.parts && msg.parts.length > 0 ? msg.parts[0].text : "";
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: isUser ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: 16,
                  marginBottom: 2,
                  ...(isUser
                    ? {}
                    : { marginLeft: isMobile ? 12 : 32 }), // More left margin for bot
                }}
              >
                <img
                  src={avatar}
                  alt="avatar"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: isUser ? "2px solid #2563eb" : "2px solid #e0e7ef",
                    boxShadow: isUser ? "0 2px 8px #2563eb22" : "0 1px 4px #e0e7ef33",
                  }}
                />
                <div>
                  <div
                    style={{
                      color: isUser ? "#2563eb" : "#8a99b3",
                      fontSize: 13,
                      marginBottom: 3,
                      textAlign: isUser ? "right" : "left",
                      fontWeight: 600,
                      letterSpacing: "0.2px",
                    }}
                  >
                    {isUser ? "You" : "AI Agent"}
                  </div>
                  <div
                    style={{
                      background: isUser ? "#2563eb" : "#f3f6fa",
                      color: isUser ? "#fff" : "#1a237e",
                      borderRadius: 16,
                      padding: isMobile ? "10px 14px" : "14px 22px",
                      maxWidth: isMobile ? 240 : 340,
                      fontSize: isMobile ? 15 : 17,
                      boxShadow: isUser
                        ? "0 2px 8px #2563eb22"
                        : "0 1px 4px #e0e7ef33",
                      marginLeft: isUser ? "auto" : 0,
                      marginRight: isUser ? 0 : "auto",
                      wordBreak: "break-word",
                      border: isUser ? "none" : "1.5px solid #e0e7ef",
                      transition: "background 0.2s, color 0.2s",
                    }}
                  >
                    {text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Input area */}
        <div style={styles.inputArea}>
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: isMobile ? 15 : 17,
              padding: isMobile ? "10px 6px" : "14px 10px",
              color: "#1a237e",
              borderRadius: 10,
              marginRight: 6,
            }}
          />
          <button
            onClick={handleSend}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: isMobile ? "10px 18px" : "12px 28px",
              fontSize: isMobile ? 15 : 17,
              fontWeight: 700,
              cursor: "pointer",
              marginLeft: 4,
              transition: "background 0.2s",
              boxShadow: "0 1.5px 8px #2563eb22",
              letterSpacing: "0.2px",
            }}
          >
            Send
          </button>
          <button
            onClick={handleRecord}
            style={{
              background: isRecording ? "#e53935" : "#fff",
              color: isRecording ? "#fff" : "#2563eb",
              border: "2px solid #2563eb",
              borderRadius: "50%",
              width: 44,
              height: 44,
              marginLeft: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
              outline: isRecording ? "2px solid #e53935" : "none",
              boxShadow: isRecording
                ? "0 2px 8px #e5393522"
                : "0 1px 4px #e0e7ef33",
            }}
            title={isRecording ? "Stop Recording" : "Record Voice"}
          >
            <span role="img" aria-label="mic">
              {isRecording ? "⏺️" : "🎤"}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
