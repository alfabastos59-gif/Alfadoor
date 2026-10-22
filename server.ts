import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { authRouter } from "./routes/auth.js";
import { advertisersRouter } from "./routes/advertisers.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok", service: "alfadoor-api", database: "connected" });
  } catch {
    return res.status(503).json({ status: "degraded", service: "alfadoor-api", database: "unavailable" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/advertisers", advertisersRouter);

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Erro interno da API:", error);
  return res.status(500).json({ error: "Erro interno do servidor." });
});

async function bootstrap() {
  const passwordHash = await bcrypt.hash(config.ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [config.ADMIN_EMAIL.toLowerCase(), passwordHash]
  );

  app.listen(config.PORT, "127.0.0.1", () => {
    console.log(`AlfaDoor API disponível em http://localhost:${config.PORT}`);
    console.log("Modo local: a API aceita conexões apenas deste computador.");
  });
}

bootstrap().catch(error => {
  console.error("Não foi possível iniciar a AlfaDoor API:", error);
  process.exit(1);
});
