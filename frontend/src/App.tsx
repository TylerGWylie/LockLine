import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function App() {
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status === "ok" ? "ok" : "error"))
      .catch(() => setApiStatus("error"));
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Confidence League</h1>
      <p>
        Backend API:{" "}
        {apiStatus === "checking" && "checking..."}
        {apiStatus === "ok" && "connected"}
        {apiStatus === "error" && "not reachable"}
      </p>
    </main>
  );
}

export default App;
