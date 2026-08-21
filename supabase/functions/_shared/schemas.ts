import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const admissionsAppSchema = z.object({
  applicant_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email address"),
  program_id: z.string().uuid("Invalid program ID"),
});

export const gradeEntrySchema = z.object({
  enrollment_id: z.string().uuid("Invalid enrollment ID"),
  ca_score: z.number().min(0).max(100).optional(),
  exam_score: z.number().min(0).max(100).optional(),
  final_grade: z.string().optional(),
});
