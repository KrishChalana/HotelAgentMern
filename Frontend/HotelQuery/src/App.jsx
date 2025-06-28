import { useState, useEffect, useRef } from "react";
import axios from "axios";
const BACKEND_URL = "http://localhost:3000"; // Update with your backend URL
const sidebarItems = [
  { icon: "🏠", label: "Home" },
  { icon: "🔖", label: "Bookings" },
  { icon: "📅", label: "Reservations" },
  { icon: "👤", label: "Account" },
];

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
      height: "100vh",
      background: "#f7f9fb",
      minHeight: 0,
    },
    sidebar: {
      width: 260,
      minWidth: 80,
      background: "#f5f8fa",
      padding: "32px 0",
      borderRight: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transition: "width 0.2s",
    },
    sidebarMobile: {
      width: 60,
      padding: "16px 0",
    },
    main: {
      flex: 1,
      padding: "48px 0 0 0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minWidth: 0,
    },
    chatWrapper: {
      width: "100%",
      maxWidth: 800,
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 24,
      marginBottom: 24,
      overflowY: "auto",
      minHeight: 0,
      height: "calc(100vh - 260px)", // header + input area
    },
    inputArea: {
      width: "100%",
      maxWidth: 800,
      display: "flex",
      alignItems: "center",
      background: "#e9eff4",
      borderRadius: 12,
      padding: 8,
      marginBottom: 32,
    },
  };
  const [audioUrl, setAudioUrl] = useState(null);
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
            audio.play().catch((err) => {
              console.error("Playback failed:", err);
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
          } catch (err) {
            alert("Voice message failed.");
          }
        };
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert("Microphone access denied or not available.");
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside
        style={
          isMobile
            ? { ...styles.sidebar, ...styles.sidebarMobile }
            : styles.sidebar
        }
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 16 : 20,
            marginLeft: isMobile ? 8 : 32,
            marginBottom: isMobile ? 16 : 32,
          }}
        >
          {isMobile ? "🏨" : "Hotel AI Agent"}
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sidebarItems.map((item, idx) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                background: idx === 0 ? "#e9eff4" : "transparent",
                color: idx === 0 ? "#111" : "#444",
                fontWeight: idx === 0 ? 600 : 500,
                padding: isMobile ? "10px 8px" : "12px 32px",
                borderRadius: 12,
                gap: isMobile ? 0 : 16,
                cursor: "pointer",
                fontSize: isMobile ? 20 : 16,
                justifyContent: isMobile ? "center" : "flex-start",
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {!isMobile && (
                <span style={{ marginLeft: 16 }}>{item.label}</span>
              )}
            </div>
          ))}
        </nav>
      </aside>
      {/* Main Chat Area */}
      <main style={styles.main}>
        <div style={{ width: "100%", maxWidth: 800 }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              marginBottom: 8,
              fontSize: isMobile ? 22 : 36,
            }}
          >
            Welcome to Hotel AI Agent
          </h1>
          <div
            style={{
              color: "#444",
              fontSize: isMobile ? 15 : 18,
              marginBottom: 32,
            }}
          >
            Ask me anything about your stay, bookings, or hotel information.
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
                  gap: 12,
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
                    border: "2px solid #e5e7eb",
                  }}
                />
                <div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: 14,
                      marginBottom: 2,
                      textAlign: isUser ? "right" : "left",
                    }}
                  >
                    {isUser ? "User" : "AI Agent"}
                  </div>
                  <div
                    style={{
                      background: isUser ? "#2196f3" : "#e9eff4",
                      color: isUser ? "#fff" : "#222",
                      borderRadius: 16,
                      padding: isMobile ? "8px 12px" : "12px 18px",
                      maxWidth: isMobile ? 220 : 420,
                      fontSize: isMobile ? 15 : 17,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                      marginLeft: isUser ? "auto" : 0,
                      marginRight: isUser ? 0 : "auto",
                      wordBreak: "break-word",
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
              fontSize: isMobile ? 15 : 18,
              padding: isMobile ? "8px 4px" : "12px 8px",
              color: "#222",
            }}
          />
          <button
            onClick={handleSend}
            style={{
              background: "#2196f3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: isMobile ? "8px 16px" : "10px 28px",
              fontSize: isMobile ? 15 : 17,
              fontWeight: 600,
              cursor: "pointer",
              marginLeft: 8,
              transition: "background 0.2s",
            }}
          >
            Send
          </button>
          <button
            onClick={handleRecord}
            style={{
              background: isRecording ? "#e53935" : "#fff",
              color: isRecording ? "#fff" : "#2196f3",
              border: "2px solid #2196f3",
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
              transition: "background 0.2s",
              outline: isRecording ? "2px solid #e53935" : "none",
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
