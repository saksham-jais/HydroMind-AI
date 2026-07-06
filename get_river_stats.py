import csv, collections
from pathlib import Path
from datetime import datetime

DS = Path(r'D:\Mega\Hackathon\HackAarambh\HydroMind-AI\Datasets')

river_stats = {}
with open(DS / 'river_discharge_manual_daily_gujarat_sw_gw_gj_2001_2025.csv', encoding='utf-8-sig', errors='replace') as f:
    reader = csv.DictReader(f)
    dist_month = collections.defaultdict(lambda: collections.defaultdict(list))
    for row in reader:
        dist = row.get('District','').strip()
        date_s = row.get('Data Acquisition Time','').strip()
        val_s  = row.get('Manual Daily River Water Discharge (m3/sec)','').strip()
        if dist and date_s and val_s:
            try:
                dt = datetime.strptime(date_s[:10], '%d-%m-%Y')
                dist_month[dist][dt.month].append(float(val_s))
            except: pass

for dist, months in dist_month.items():
    monsoon = [v for m in [6,7,8,9] for v in months.get(m,[])]
    dry     = [v for m in [11,12,1,2,3,4] for v in months.get(m,[])]
    river_stats[dist] = {
        'monsoon_avg': round(sum(monsoon)/len(monsoon),1) if monsoon else 0,
        'dry_avg':     round(sum(dry)/len(dry),1) if dry else 0,
        'peak':        round(max(max(v) for v in months.values()),1) if months else 0,
    }

print('RIVER_STATS = {')
for d,v in sorted(river_stats.items()):
    print(f'    "{d}": {v},')
print('}')
