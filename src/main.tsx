import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const stored = localStorage.getItem("theme");
const isDark = stored ? stored === "dark" : prefersDark;
if (isDark) document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
