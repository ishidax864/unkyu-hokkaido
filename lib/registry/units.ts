/**
 * JR北海道の公式運行情報が状態を出す単位(線区)。
 * 出典: https://www3.jrhokkaido.co.jp/webunkou/json/master/senku_name_master.json (2026-11-16 確認)
 * 各エリアのフィード area_0{1-5}.json の today/tomorrow.senkuStatus[key] が
 * 0 = 運休・遅延に関する情報なし、1 = 運休・30分以上の遅延・運転見合わせが発生。
 * 18(留萌線)は2026-04-01の全線廃止でマスタから消えている。
 */

export const JR_AREAS = {
    '01': { code: 'spo', name: '札幌近郊' },
    '02': { code: 'doo', name: '道央' },
    '03': { code: 'donan', name: '道南' },
    '04': { code: 'dohoku', name: '道北' },
    '05': { code: 'doto', name: '道東' },
} as const;
export type JrAreaId = keyof typeof JR_AREAS;
export const JR_AREA_IDS = Object.keys(JR_AREAS) as JrAreaId[];

export type SenkuKey =
    | 'express' | 'airport' | 'hakochise' | 'gakuen' | 'muroran' | 'hidaka'
    | 'hakodateLiner' | 'hakodate' | 'soya' | 'sekihoku' | 'furano'
    | 'sekisho' | 'nemuro' | 'hanasaki' | 'senmo';

export interface StatusUnit {
    /** JRマスタの線区番号 */
    senku: string;
    area: JrAreaId;
    key: SenkuKey;
    /** JRマスタの表示名 */
    name: string;
}

/** `${area}:${key}` 形式のID */
export type UnitId = `${JrAreaId}:${SenkuKey}`;

export const STATUS_UNITS: StatusUnit[] = [
    { senku: '01', area: '01', key: 'express', name: '特急列車' },
    { senku: '02', area: '01', key: 'airport', name: 'エアポート' },
    { senku: '03', area: '01', key: 'hakochise', name: '函館・千歳線' },
    { senku: '04', area: '01', key: 'gakuen', name: '学園都市線' },
    { senku: '05', area: '02', key: 'express', name: '特急列車' },
    { senku: '06', area: '02', key: 'airport', name: 'エアポート' },
    { senku: '07', area: '02', key: 'hakochise', name: '函館・千歳線' },
    { senku: '08', area: '02', key: 'gakuen', name: '学園都市線' },
    { senku: '09', area: '02', key: 'muroran', name: '室蘭線' },
    { senku: '10', area: '02', key: 'hidaka', name: '日高線' },
    { senku: '11', area: '03', key: 'express', name: '特急列車' },
    { senku: '12', area: '03', key: 'hakodateLiner', name: 'はこだてライナー' },
    { senku: '13', area: '03', key: 'hakodate', name: '函館線' },
    { senku: '14', area: '04', key: 'express', name: '特急列車' },
    { senku: '15', area: '04', key: 'soya', name: '宗谷線' },
    { senku: '16', area: '04', key: 'sekihoku', name: '石北線' },
    { senku: '17', area: '04', key: 'furano', name: '富良野線' },
    { senku: '19', area: '05', key: 'express', name: '特急列車' },
    { senku: '20', area: '05', key: 'sekisho', name: '石勝線' },
    { senku: '21', area: '05', key: 'nemuro', name: '根室線' },
    { senku: '22', area: '05', key: 'hanasaki', name: '根室線（花咲線）' },
    { senku: '23', area: '05', key: 'senmo', name: '釧網線' },
];

export const unitId = (u: Pick<StatusUnit, 'area' | 'key'>): UnitId => `${u.area}:${u.key}`;
export const UNIT_BY_ID = new Map(STATUS_UNITS.map(u => [unitId(u), u]));
