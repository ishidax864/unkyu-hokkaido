"""Download two observed winter months from JMA; keep symbols/quality flags.
No absent train bulletin is turned into a normal-operation label.
Run with Python 3 (stdlib only). Public HTML is cached outside the repository.
"""
import calendar, datetime, hashlib, json, pathlib, re, urllib.request
from html.parser import HTMLParser

class DailyTable(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.cells=None; self.text=None
    def handle_starttag(self, tag, attrs):
        if tag=='tr': self.cells=[]
        if tag in ('td','th') and self.cells is not None: self.text=[]
    def handle_data(self, data):
        if self.text is not None: self.text.append(data)
    def handle_endtag(self, tag):
        if tag in ('td','th') and self.text is not None:
            self.cells.append(''.join(self.text).strip()); self.text=None
        if tag=='tr' and self.cells is not None:
            self.rows.append(self.cells); self.cells=None

def value(raw):
    # A dash, missing value or flagged measurement is NOT silently replaced by zero.
    return {'value':float(raw) if re.fullmatch(r'\d+(?:\.\d+)?',raw) else None,'raw':raw,'quality':'unflagged' if re.fullmatch(r'\d+(?:\.\d+)?',raw) else 'symbol-or-flagged'}

root=pathlib.Path(__file__).resolve().parent.parent/'data/historical/jma'
root.mkdir(parents=True,exist_ok=True)
for year,month in [(2022,2),(2026,1)]:
    url=f'https://www.data.jma.go.jp/stats/etrn/view/daily_s1.php?prec_no=14&block_no=47412&year={year}&month={month}&day=&view=a3'
    cache=pathlib.Path('/tmp/unkyu-sources')/f'jma-sapporo-{year}-{month:02}.html'
    cache.parent.mkdir(parents=True,exist_ok=True)
    if not cache.exists():
        with urllib.request.urlopen(url,timeout=30) as response: cache.write_bytes(response.read())
    raw=cache.read_bytes(); text=raw.decode('utf-8')
    if '最大瞬間風速' not in text or '最深積雪' not in text: raise ValueError('Unexpected table schema')
    parser=DailyTable(); parser.feed(text)
    rows=[]
    for row in parser.rows:
        if len(row)!=16 or not row[0].isdigit(): continue
        rows.append({'date':f'{year}-{month:02}-{int(row[0]):02}','meanWindMs':value(row[1]),'maxWindMs':value(row[2]),'maxGustMs':value(row[5]),'snowfallCmCalendarDay':value(row[11]),'maximumSnowDepthCm':value(row[12])})
    if len(rows)!=calendar.monthrange(year,month)[1] or len({row['date'] for row in rows})!=len(rows): raise ValueError('Incomplete or duplicate daily rows')
    record={'source':'気象庁 過去の気象データ検索','kind':'station-observation','station':'札幌','stationCode':'47412','url':url,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceSha256':hashlib.sha256(raw).hexdigest(),'timeZone':'Asia/Tokyo','snowfallWindow':'calendar day; NOT rolling maximum 24h','rows':rows}
    (root/f'sapporo-{year}-{month:02}.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'month':f'{year}-{month:02}','days':len(rows),'stormDays':[r for r in rows if r['date'] in ['2022-02-06','2022-02-21','2026-01-25']]},ensure_ascii=False))
