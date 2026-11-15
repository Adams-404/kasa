import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { seedDemoPack } from "./lib/demoPack";
import "./styles/base.css";
import "./styles/app.css";

seedDemoPack();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
