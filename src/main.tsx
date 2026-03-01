import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { StoresProvider } from "./providers/StoresProvider";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoresProvider>
      <App />
    </StoresProvider>
  </StrictMode>,
)
