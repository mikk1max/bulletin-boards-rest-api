import pino from "pino";

const usePretty = !["production", "test"].includes(process.env.NODE_ENV ?? "");

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.cookie"],
  transport: usePretty ? { target: "pino-pretty" } : undefined,
});

export default logger;
