/**
 * Типы API. Источник — src/api/schema.d.ts (`npm run gen:types` из живой схемы).
 * Алиасы добавляем вместе с модулями ручек; ответы «без схемы» (FRONTEND_SPEC §5.2) описываем
 * здесь вручную и сверяем со снимками docs/api-examples.
 */
import type { components } from './schema';

export type Schemas = components['schemas'];

export type UserOut = Schemas['UserOut'];
export type LoginIn = Schemas['LoginIn'];
export type LoginOut = Schemas['LoginOut'];
export type RegionOut = Schemas['RegionOut'];

/** Роль пользователя. В схеме `UserOut.role` — просто string, поэтому union задаём сами. */
export type Role = 'dispatcher' | 'operator' | 'engineer';
