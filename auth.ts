import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200)
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Informe e-mail e senha válidos." });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const result = await pool.query(
      "SELECT id, email, password_hash, role, active FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role },
      config.JWT_SECRET,
      { subject: user.id, expiresIn: "8h" }
    );

    return res.json({
      token,
      tokenType: "Bearer",
      expiresIn: 28800,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.authUser });
});
