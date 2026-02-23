import { z } from 'zod';

export const validateCodeParamsSchema = z.object({
  code: z.string().min(1),
});

export const qualifyParamsSchema = z.object({
  id: z.string().uuid(),
});

export const scoreParamsSchema = z.object({
  id: z.string().uuid(),
});

export const pipelineParamsSchema = z.object({
  id: z.string().uuid(),
});

export const pipelineUpdateSchema = z.object({
  status: z.enum([
    'PENDING',
    'QUALIFIED',
    'DEMO_SCHEDULED',
    'MEETING_HELD',
    'WON',
    'LOST',
    'NO_SHOW',
    'NURTURE',
    'DEAD',
  ]).optional(),
  note: z.string().max(2000).optional(),
  demoScheduledAt: z.coerce.date().optional(),
  meetingOutcome: z.string().max(500).optional(),
  nurtureStage: z.coerce.number().int().min(0).optional(),
  nextActionAt: z.coerce.date().optional(),
  // Intent/engagement signal overrides
  usedCalculator: z.boolean().optional(),
  usedDiagnostic: z.boolean().optional(),
  requestedDemo: z.boolean().optional(),
  fromMetaAd: z.boolean().optional(),
  respondedWa: z.boolean().optional(),
  openedMessages: z.coerce.number().int().min(0).optional(),
  responseTimeMin: z.coerce.number().int().min(0).optional(),
});

export const timelineParamsSchema = z.object({
  id: z.string().uuid(),
});

export type PipelineUpdateInput = z.infer<typeof pipelineUpdateSchema>;
