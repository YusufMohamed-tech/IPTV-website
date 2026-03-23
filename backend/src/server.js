import app from "./app.js";
import connectDb from "./config/db.js";
import { env } from "./config/env.js";

const PORT = env.PORT;

const startServer = async () => {
  await connectDb();

  const server = app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Closing server...`);
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
