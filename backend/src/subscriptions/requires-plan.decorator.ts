import { SetMetadata } from '@nestjs/common';

export type RequiredPlan = 'basico' | 'estandar' | 'premium';
export const REQUIRED_PLAN_KEY = 'required-sismarket-plan';
export const RequiresPlan = (plan: RequiredPlan) => SetMetadata(REQUIRED_PLAN_KEY, plan);
