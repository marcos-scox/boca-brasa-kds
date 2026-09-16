import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  calculateOrderTotal,
  createOrderRecord,
  getOrderRecord,
  getWhatsappSetting,
  listActiveOrderRecords,
  updateOrderStatusRecord,
  updateWhatsappSetting,
} from "./db";

const orderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  quantity: z.number().int().min(1).max(99),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  orders: router({
    create: publicProcedure
      .input(z.object({
        tableNumber: z.string().trim().min(1).max(10),
        items: z.array(orderItemSchema).min(1),
      }))
      .mutation(({ input }) => {
        const totalCents = calculateOrderTotal(input.items);
        return createOrderRecord({ ...input, totalCents });
      }),
    getById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getOrderRecord(input.id)),
    active: publicProcedure.query(() => listActiveOrderRecords()),
    updateStatus: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["recebido", "preparando", "pronto", "entregue"]),
      }))
      .mutation(({ input }) => updateOrderStatusRecord(input.id, input.status)),
  }),
  settings: router({
    get: publicProcedure.query(() => getWhatsappSetting().then((whatsapp) => ({ whatsapp }))),
    updateWhatsapp: publicProcedure
      .input(z.object({ whatsapp: z.string().regex(/^\d{8,15}$/, "Use apenas números, com DDI e DDD") }))
      .mutation(({ input }) => updateWhatsappSetting(input.whatsapp).then((whatsapp) => ({ whatsapp }))),
  }),
});

export type AppRouter = typeof appRouter;
