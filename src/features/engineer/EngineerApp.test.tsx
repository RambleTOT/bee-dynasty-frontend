import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMyDay, getMyRoute, postAction } from '@/api/engineer';
import { ApiError } from '@/api/errors';
import { notify } from '@/lib/notify';
import { dayRaw, renderEngineer, visitRaw } from '@/test/engineer';
import { hideDoneToast } from './doneToast';
import EngineerApp from './EngineerApp';

vi.mock('@/api/engineer', () => ({
  getMyDay: vi.fn(),
  getMyRoute: vi.fn(),
  postAction: vi.fn(),
}));
vi.mock('@/lib/notify', () => ({ notify: vi.fn() }));

const renderApp = (url = '/engineer') => renderEngineer({ home: <EngineerApp /> }, url);

beforeEach(() => {
  vi.mocked(getMyDay).mockReset();
  vi.mocked(getMyRoute).mockReset();
  vi.mocked(postAction).mockReset();
  vi.mocked(notify).mockClear();
});

afterEach(() => {
  act(() => hideDoneToast());
});

async function openMenu() {
  fireEvent.click(await screen.findByRole('button', { name: 'Меню' }));
  return screen.getByRole('menu');
}

describe('EngineerApp: состояния страницы (§9.1)', () => {
  it('загрузка — скелетоны, в шапке имя из профиля', () => {
    vi.mocked(getMyDay).mockReturnValue(new Promise(() => {}));
    renderApp();
    expect(screen.getByLabelText('Загрузка')).toBeInTheDocument();
    expect(screen.getByText('Инженер из профиля')).toBeInTheDocument();
  });

  it('ошибка сети — «Повторить» перезапрашивает день', async () => {
    vi.mocked(getMyDay).mockRejectedValueOnce(
      new ApiError(0, 'NETWORK', 'Не удалось связаться с сервером. Повторите'),
    );
    renderApp();
    expect(await screen.findByText('Не удалось связаться с сервером')).toBeInTheDocument();
    vi.mocked(getMyDay).mockResolvedValueOnce(dayRaw([]));
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('На сегодня заявок нет')).toBeInTheDocument();
    expect(getMyDay).toHaveBeenCalledTimes(2);
  });

  it('план не опубликован', async () => {
    vi.mocked(getMyDay).mockResolvedValue(
      dayRaw([visitRaw('A', 1, 'planned')], { plan_published: false }),
    );
    renderApp();
    expect(await screen.findByText('План на сегодня ещё не опубликован')).toBeInTheDocument();
    expect(
      screen.getByText('Он появится, когда диспетчер начнёт рабочий день'),
    ).toBeInTheDocument();
  });

  it('заявок нет', async () => {
    vi.mocked(getMyDay).mockResolvedValue(dayRaw([]));
    renderApp();
    expect(await screen.findByText('На сегодня заявок нет')).toBeInTheDocument();
  });

  it('в шапке — имя инженера из дня', async () => {
    vi.mocked(getMyDay).mockResolvedValue(dayRaw([]));
    renderApp();
    expect(await screen.findByText('А. Мельников')).toBeInTheDocument();
  });
});

describe('меню ⋯ (D-31)', () => {
  it('на смене: «Не могу работать», «Завершить смену», «Выйти»', async () => {
    vi.mocked(getMyDay).mockResolvedValue(dayRaw([visitRaw('A', 1, 'planned')]));
    renderApp();
    await screen.findByText('А. Мельников');
    const menu = await openMenu();
    const items = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(items).toEqual(['Не могу работать', 'Завершить смену', 'Выйти']);
  });

  it('до смены — только «Выйти»', async () => {
    vi.mocked(getMyDay).mockResolvedValue(
      dayRaw([visitRaw('A', 1, 'planned')], { shift_status: 'not_started' }),
    );
    renderApp();
    await screen.findByText('А. Мельников');
    const menu = await openMenu();
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Выйти']);
  });

  it('заявка в пути — «Завершить смену» неактивна', async () => {
    vi.mocked(getMyDay).mockResolvedValue(
      dayRaw([visitRaw('A', 1, 'en_route'), visitRaw('B', 2, 'planned')], {
        active_request_id: 'A',
      }),
    );
    renderApp();
    await screen.findByText('А. Мельников');
    const menu = await openMenu();
    expect(within(menu).getByRole('menuitem', { name: 'Завершить смену' })).toBeDisabled();
  });

  it('«Выйти» — выход из учётной записи', async () => {
    vi.mocked(getMyDay).mockResolvedValue(dayRaw([]));
    const { auth } = renderApp();
    await screen.findByText('А. Мельников');
    const menu = await openMenu();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Выйти' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
  });
});
