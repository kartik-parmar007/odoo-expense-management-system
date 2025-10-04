// Application entry point
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Render the main application component
createRoot(document.getElementById("root")!).render(<App />);
