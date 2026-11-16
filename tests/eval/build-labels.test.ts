import { describe, it, expect } from 'vitest';
import { classifyCause, mentionedDates, namedRoutes, splitNotices } from '../../scripts/eval/build-labels';
import { auc, averagePrecision } from '../../scripts/eval/metrics';

describe('評価ラベル: 原因の判定', () => {
    it('雪・雨・風は気象', () => {
        expect(classifyCause('降雪による輸送障害が見込まれるため、釧網線の一部列車が運休します。')).toBe('weather');
        expect(classifyCause('強風の影響により、宗谷線の一部列車に運休')).toBe('weather');
    });
    it('「列車が運休」の「車が」を自動車と誤認しない', () => {
        expect(classifyCause('降雪のため、釧網線の一部列車が運休します。')).toBe('weather');
    });
    it('熊・踏切・計画除雪作業は気象としない', () => {
        expect(classifyCause('石勝線で列車と熊が衝突した影響により運休')).toBe('other');
        expect(classifyCause('千歳線の踏切で安全確認を行ったため運休')).toBe('other');
        expect(classifyCause('深夜帯に札幌圏の駅で集中的な除雪作業を行うため、一部の列車が運休します')).toBe('other');
    });
    it('原因が書かれていない運休は不明', () => {
        expect(classifyCause('一部の列車に運休が出ています。')).toBe('unknown');
    });
});

describe('評価ラベル: 日付', () => {
    it('範囲を展開し全角数字も読む', () => {
        expect(mentionedDates('３月４日から３月５日にかけて、低気圧の影響により', '2026-03-03')).toEqual(['2026-03-04', '2026-03-05']);
    });
    it('M/D と D日 を記録月で解釈', () => {
        expect(mentionedDates('【3/12 運転見合わせ】', '2026-03-12')).toEqual(['2026-03-12']);
        expect(mentionedDates('12日の降雨の影響により、13日の一部列車に運休', '2026-07-13')).toEqual(['2026-07-12', '2026-07-13']);
    });
    it('時刻の 17:40 を日付と誤認しない', () => {
        expect(mentionedDates('17:40頃から最終まで', '2026-03-12')).toEqual([]);
    });
    it('1月の記録で12月の日付は前年', () => {
        expect(mentionedDates('12月30日の大雪により', '2026-01-02')).toEqual(['2025-12-30']);
    });
});

describe('評価ラベル: 路線', () => {
    it('「通常通り」と書かれた路線を運休路線にしない', () => {
        const t = '大雪の影響により、特急列車を含め、一部列車に運休が発生します。なお、快速エアポートを含む札幌近郊の列車は現時点では通常通りの運転をします。 ■特急列車 ・特急おおぞら３号';
        const r = namedRoutes(t);
        expect(r).not.toContain('jr-hokkaido.chitose');
        expect(r).toContain('jr-hokkaido.sekisho');
    });
    it('函館線の滝川～旭川を道南側にしない', () => {
        expect(namedRoutes('函館線 滝川～旭川駅間 上下線')).toEqual(['jr-hokkaido.hakodate-main']);
    });
    it('函館線の長万部～蘭越は道南側', () => {
        expect(namedRoutes('函館線 長万部～蘭越間')).toEqual(['jr-hokkaido.hakodate-south']);
    });
    it('連結された複数の告知を分割する', () => {
        expect(splitNotices('熊と衝突。【熊との衝突による列車への影響について】降雪のため運休。【雪による列車への影響について】')).toHaveLength(2);
    });
});

describe('評価指標', () => {
    it('AUC: 完全分離=1、同点=0.5', () => {
        expect(auc([3, 4], [1, 2])).toBe(1);
        expect(auc([1], [1])).toBe(0.5);
    });
    it('AP: 陽性が上位なら1', () => {
        expect(averagePrecision([{ s: 9, y: true }, { s: 5, y: false }])).toBe(1);
        expect(averagePrecision([{ s: 9, y: false }, { s: 5, y: true }])).toBe(0.5);
    });
});
