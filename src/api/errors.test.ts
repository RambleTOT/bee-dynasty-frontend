import { describe, expect, it } from 'vitest';
import { ApiError, errorMessage, toApiError } from './errors';

describe('toApiError', () => {
  it('middleware: {error: {code, message}}', () => {
    const error = toApiError(401, {
      error: { code: 'UNAUTHORIZED', message: 'Неверный логин или пароль' },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Неверный логин или пароль',
    });
  });

  it('HTTPException: {detail: {error: {code, message, details}}}', () => {
    const error = toApiError(409, {
      detail: {
        error: {
          code: 'STALE_PROPOSAL',
          message: 'План уже изменился',
          details: { plan_id: 'p2' },
        },
      },
    });
    expect(error).toMatchObject({
      status: 409,
      code: 'STALE_PROPOSAL',
      message: 'План уже изменился',
      details: { plan_id: 'p2' },
    });
  });

  it('422 ErrorResponse: {detail: string, code, context}', () => {
    const context = { errors: [{ field: 'window' }] };
    const error = toApiError(422, {
      detail: 'Ошибка валидации входных данных',
      code: 'COMMENT_REQUIRED',
      context,
    });
    expect(error).toMatchObject({
      status: 422,
      code: 'COMMENT_REQUIRED',
      message: 'Ошибка валидации входных данных',
      details: context,
    });
  });

  it('422 ErrorResponse без code → VALIDATION_ERROR', () => {
    expect(toApiError(422, { detail: 'Ошибка валидации входных данных' }).code).toBe(
      'VALIDATION_ERROR',
    );
  });

  it('422 FastAPI HTTPValidationError: {detail: [...]}', () => {
    const detail = [{ loc: ['body', 'login'], msg: 'Field required', type: 'missing' }];
    expect(toApiError(422, { detail })).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Проверьте заполнение полей',
      details: detail,
    });
  });

  it.each([
    ['пустое тело', undefined],
    ['текст вместо JSON', '<html>502 Bad Gateway</html>'],
    ['незнакомый объект', { message: 'boom' }],
  ])('неизвестный формат (%s) → UNKNOWN', (_, body) => {
    expect(toApiError(502, body)).toMatchObject({
      status: 502,
      code: 'UNKNOWN',
      message: 'Не удалось выполнить запрос. Повторите',
    });
  });

  it('{error} без code и message — запасные значения', () => {
    expect(toApiError(500, { error: {} })).toMatchObject({ code: 'UNKNOWN', message: 'Не удалось выполнить запрос. Повторите' });
  });
});

describe('errorMessage', () => {
  it('ApiError → сообщение бэка, иначе общий текст', () => {
    expect(errorMessage(new ApiError(409, 'SLOT_TAKEN', 'Окно уже занято'))).toBe(
      'Окно уже занято',
    );
    expect(errorMessage(new Error('x'))).toBe('Не удалось выполнить запрос. Повторите');
  });
});
