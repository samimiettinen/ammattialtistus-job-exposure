import { z } from "zod";

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

export const compareQuerySchema = z.object({
  codes: z.string().min(1),
});

export type CompareQuery = z.infer<typeof compareQuerySchema>;
