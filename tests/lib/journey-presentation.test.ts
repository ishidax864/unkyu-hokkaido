import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ForecastResult } from '@/components/journey-result';
import { journeyDesignFixture } from '../fixtures/journey-result';

const now = new Date('2026-01-15T03:00:00Z');
function render(scenario: Parameters<typeof journeyDesignFixture>[0]) {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(createElement(ForecastResult, {
        result: journeyDesignFixture(scenario, now), deadline: '', refresh() {}, selectDate() {}, edit() {},
    }));
    return container;
}
afterEach(() => vi.useRealTimers());

describe('Journey decisions remain clear across operational states', () => {
    it('does not show an empty recovery estimate for normal service', () => {
        const screen = render('normal');
        expect(screen.querySelector('.status-value')?.textContent).toBe('平常運転');
        expect(screen.querySelector('#recovery-title')).toBeNull();
        expect(screen.querySelector('.recommended')).toBeNull();
    });
    it('keeps an announced recovery time visible and prioritizes indoor waiting for a short suspension', () => {
        const screen = render('official');
        expect(screen.querySelector('.recovery-value')?.textContent).toBe('13:30頃');
        expect(screen.querySelector('.action-card.recommended')?.textContent).toContain('近くのカフェ');
        expect(screen.querySelector('.official-detail')?.hasAttribute('open')).toBe(true);
    });
    it('prioritizes accommodation for all-day suspension without inventing a clock time', () => {
        const screen = render('all-day');
        expect(screen.querySelector('.recovery-value')?.textContent).toBe('終日運休');
        expect(screen.querySelector('.action-card.recommended')?.textContent).toContain('近くの宿泊先');
    });
    it('keeps an unknown recovery unknown and offers other transport', () => {
        const screen = render('unknown');
        expect(screen.querySelector('.recovery-value')?.textContent).toBe('未定');
        expect(screen.querySelector('.action-card.recommended')?.textContent).toContain('バス・他の交通');
    });
    it('does not turn unavailable official or weather data into reassurance', () => {
        const screen = render('unavailable');
        expect(screen.querySelector('.status-value')?.textContent).toBe('運行状況は不明');
        expect(screen.querySelector('.weather-heading strong')?.textContent).toBe('不明');
        expect(screen.textContent).not.toContain('平常運転');
    });
});
