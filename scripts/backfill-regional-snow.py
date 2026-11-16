"""Archive JMA MSM's 24-hour lead forecasts from Open-Meteo for known storms.

JMA does not supply native gust/snow fields. Snowfall here is Open-Meteo's
temperature/precipitation derivation, not a JMA-issued snow-depth forecast.
"""
import datetime, hashlib, json, math, pathlib, urllib.parse, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
directory = root / 'data/historical/regional-weather'
directory.mkdir(parents=True, exist_ok=True)
fields = ['temperature_2m', 'precipitation', 'snowfall', 'wind_speed_10m']
suffix = '_previous_day1'
manifest = []
for window in json.loads((root / 'data/historical/weather-windows.json').read_text()):
    params = {'latitude': ','.join(str(p['lat']) for p in window['points']),
              'longitude': ','.join(str(p['lon']) for p in window['points']),
              'start_date': window['start'], 'end_date': window['end'], 'timezone': 'Asia/Tokyo',
              'wind_speed_unit': 'ms', 'models': 'jma_msm',
              'hourly': ','.join(field + suffix for field in fields)}
    url = 'https://previous-runs-api.open-meteo.com/v1/forecast?' + urllib.parse.urlencode(params)
    target = directory / (window['stormId'] + '-jma-msm-24h.json')
    if target.exists():
        record = json.loads(target.read_text())
        if record['url'] != url: raise ValueError('Cached source changed')
    else:
        with urllib.request.urlopen(url, timeout=35) as response:
            payload = json.load(response)
        record = {'stormId': window['stormId'], 'kind': 'forecast-24h', 'model': 'jma_msm',
                  'leadHours': 24, 'snowfallMethod': 'Open-Meteo derivation: below 0 C, precipitation multiplied by 0.7 cm/mm',
                  'unsupportedFields': ['wind_gusts_10m', 'snow_depth'], 'url': url,
                  'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'points': window['points'], 'payload': payload}
        target.write_text(json.dumps(record, ensure_ascii=False) + '\n')
    series = record['payload'] if isinstance(record['payload'], list) else [record['payload']]
    expected = ((datetime.date.fromisoformat(window['end']) - datetime.date.fromisoformat(window['start'])).days + 1) * 24
    if len(series) != len(window['points']): raise ValueError('Point count mismatch')
    available, missing = 0, 0
    missing_by_field = {field: 0 for field in fields}
    for point in series:
        if point.get('utc_offset_seconds') != 32400 or len(point['hourly']['time']) != expected:
            raise ValueError('Incorrect timezone or coverage')
        expected_times = [(datetime.datetime.fromisoformat(window['start']) + datetime.timedelta(hours=i)).isoformat(timespec='minutes') for i in range(expected)]
        if point['hourly']['time'] != expected_times: raise ValueError('Missing, duplicated or shifted timestamps')
        for field, unit in [('temperature_2m', '°C'), ('precipitation', 'mm'), ('snowfall', 'cm'), ('wind_speed_10m', 'm/s')]:
            if point['hourly_units'][field + suffix] != unit: raise ValueError('Unexpected units')
        for index in range(expected):
            valid = []
            for field in fields:
                value = point['hourly'][field + suffix][index]
                ok = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and (field == 'temperature_2m' or value >= 0)
                valid.append(ok)
                if not ok: missing_by_field[field] += 1
            if all(valid): available += 1
            else: missing += 1
    entry = {'file': target.name, 'stormId': window['stormId'], 'model': 'jma_msm',
             'kind': 'forecast-24h', 'leadHours': 24, 'availableRows': available, 'missingRows': missing, 'missingByField': missing_by_field,
             'status': 'complete' if missing == 0 else 'incomplete',
             'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'url': url}
    manifest.append(entry)
    (directory / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: entry[key] for key in ['file', 'availableRows', 'missingRows']}), flush=True)
