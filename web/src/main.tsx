import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/theme.css";
import { App } from "./App.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('index.html is missing <div id="root">.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
