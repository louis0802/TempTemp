import { runLive } from "./live";
import { hourlyLoop } from "./hourly";
import { closeDatabases } from "@/server/db";
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());
try {
  await hourlyLoop(runLive, controller.signal, {
    report: (value) => console.log(JSON.stringify(value)),
  });
} finally {
  await closeDatabases();
}
