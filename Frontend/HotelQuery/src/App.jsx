import { useState, useEffect, useRef } from "react";
import axios from "axios";
const BACKEND_URL = "http://localhost:3000"; // Update this as needed

const initialMessages = [
  {
    role: "model",
    parts: [{ text: "Hello! How can I assist you with your hotel needs?" }],
  },
];

const AVATARS = {
  model: "https://randomuser.me/api/portraits/women/44.jpg",
  user: "https://randomuser.me/api/portraits/men/32.jpg",
};

function App() {
  const sessionIdRef = useRef(crypto.randomUUID());
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const sendAudioChunk = async (chunk) => {
    const formData = new FormData();
    formData.append("chunk", chunk, "chunk.webm");

    try {
      await axios.post(`${BACKEND_URL}/stream`, formData, {
        headers: { "x-session-id": sessionIdRef.current },
      });
    } catch (err) {
      console.error("Chunk stream failed:", err);
    }
  };

 const handleRecord = async () => {
  if (isRecording) {
    // Stop recording
    setIsRecording(false);
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Send chunks to /stream
      mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          await sendAudioChunk(e.data); // This goes to /stream
        }
      };

      // When recording stops, call /voice
      mediaRecorder.onstop = async () => {
        const formData = new FormData();
        formData.append("history", JSON.stringify(messages));

        try {
          const st_form_data = new FormData();
          st_form_data.append("is_last", "true"); 
          const st_response = await axios.post(
            `${BACKEND_URL}/stream`,
            st_form_data,
            {
              headers: { "x-session-id": sessionIdRef.current },
            }
          );




          const response = await axios.post(
            `${BACKEND_URL}/voice`, // FINAL call to /voice
            formData,
            {
              headers: { "x-session-id": sessionIdRef.current },
            }
          );

          const { modelMessage, userMessage, audioBase64 } = response.data;

          const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
          await audio.play();

          setMessages((prev) => [
            ...prev,
            { role: "user", parts: [{ text: userMessage }] },
            { role: "model", parts: [{ text: modelMessage }] },
          ]);
        } catch (err) {
          console.error("Final voice failed:", err);
          alert("Voice processing failed.");
        }
      };

      // Start streaming chunks every 3s
      mediaRecorder.start(3000); // correct usage
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission denied.");
      console.error(err);
    }
  }
};




















  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", parts: [{ text: input }] };
    setMessages((prev) => [...prev, userMsg]);

    axios
      .post(`${BACKEND_URL}/message`, {
        history: [...messages, userMsg],
        message: userMsg,
      })
      .then((response) => {
        const newMessage = response.data.response;
        setMessages((prev) => [
          ...prev,
          { role: "model", parts: [{ text: newMessage }] },
        ]);
      });

    setInput("");
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 700);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const styles = {
    container: {
      display: "flex",
      background: "linear-gradient(120deg, #f8fafc 0%, #e0e7ef 100%)",
      minHeight: 0,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
      position: "relative",
      overflow: "hidden",
    },
    main: {
      width: "100%",
      maxWidth: 500,
      minHeight: 600,
      maxHeight: 700,
      background: "#fff",
      borderRadius: 28,
      boxShadow:
        "0 8px 40px 0 rgba(37, 99, 235, 0.10), 0 1.5px 8px 0 rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 0 0 0",
      overflow: "hidden",
      margin: 24,
    },
    chatWrapper: {
      width: "100%",
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 28,
      marginBottom: 24,
      overflowY: "auto",
      minHeight: 0,
      padding: "0 40px",
      maxHeight: 340,
    },
    inputArea: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      background: "#f3f6fa",
      borderRadius: 18,
      padding: 12,
      margin: "0 0 40px 0",
      border: "1.5px solid #e0e7ef",
      maxWidth: 440,
      alignSelf: "center",
      gap: 10,
    },
  };

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <h1
          style={{
            fontSize: isMobile ? 24 : 34,
            fontWeight: 800,
            color: "#1a237e",
          }}
        >
          Hotel AI Agent
        </h1>
        <div style={styles.chatWrapper}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const avatar = AVATARS[msg.role] || AVATARS.model;
            const text = msg.parts?.[0]?.text || "";
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: isUser ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: 16,
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
                  }}
                />
                <div>
                  <div
                    style={{
                      color: isUser ? "#2563eb" : "#8a99b3",
                      fontSize: 13,
                      fontWeight: 600,
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
                    }}
                  >
                    {text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
              fontWeight: 700,
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
            }}
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
