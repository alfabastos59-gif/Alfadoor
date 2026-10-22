import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const advertisersRouter = Router();
advertisersRouter.use(requireAuth);

const createSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(254).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable()
});

advertisersRouter.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, company_name AS "companyName", contact_name AS "contactName",
              email, phone, status, notes, created_at AS "createdAt"
       FROM advertisers ORDER BY created_at DESC LIMIT 200`
    );
    return res.json({ items: result.rows });
  } catch (error) {
    return next(error);
  }
});

advertisersRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Dados inválidos.",
        details: parsed.error.issues.map(issue => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const data = parsed.data;
    const result = await pool.query(
      `INSERT INTO advertisers (company_name, contact_name, email, phone, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_name AS "companyName", contact_name AS "contactName",
                 email, phone, status, notes, created_at AS "createdAt"`,
      [
        data.companyName,
        data.contactName || null,
        data.email?.toLowerCase() || null,
        data.phone || null,
        data.notes || null
      ]
    );
    return res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});
