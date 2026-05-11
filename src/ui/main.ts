import App from "./App.svelte";
import { mount } from "svelte";
import "./styles/global.css";

const target = document.getElementById("app");

if (!target) {
  throw new Error("Missing #app target element.");
}

mount(App, { target });
