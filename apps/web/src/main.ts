import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error('Missing "#app" mount target');

mount(App, { target });

if (import.meta.env.DEV) {
  void import("#lib/auth/client").then((authClient) => {
    Object.defineProperty(window, "__vibeAuthClient", {
      configurable: true,
      value: authClient,
    });
  });
}
