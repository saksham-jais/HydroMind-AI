import csv, collections, json
from pathlib import Path
from datetime import datetime

DS = Path(r'D:\Mega\Hackathon\HackAarambh\HydroMind-AI\Datasets')

# Output cache file
CACHE_FILE = DS / 'telemetry_cache_2021_2025.json'

target_file = DS / 'gwl_tel_6_hourly_gujarat_sw_gw_gj_2021_2025.csv'
if not target_file.exists():
    print("File not found:", target_file.name)
    exit(1)

print("Processing 1.07GB 6-hourly telemetry dataset. This will take a moment...")

# We want to find the average GWL in 2021 vs 2024 for each district
# to see if the recent trend is recovering or depleting.
dist_year_stats = collections.defaultdict(lambda: collections.defaultdict(list))

# To avoid running out of memory, we just process line by line and keep a running sum/count,
# but keeping lists for each year is usually fine since it's only ~200k-500k rows per district per year.
# Actually, running sum/count is safer.
dist_year_sum = collections.defaultdict(lambda: collections.defaultdict(float))
dist_year_cnt = collections.defaultdict(lambda: collections.defaultdict(int))
dist_min_max = collections.defaultdict(lambda: {'min': 9999, 'max': -9999})

processed_rows = 0
with open(target_file, encoding='utf-8-sig', errors='replace') as f:
    reader = csv.DictReader(f)
    # the exact data column name
    data_col = None
    for row in reader:
        if not data_col:
            # find the right column name dynamically
            for k in row.keys():
                if k and 'Telemetry Quadridaily' in k:
                    data_col = k
            if not data_col: data_col = reader.fieldnames[-1]

        processed_rows += 1
        if processed_rows % 500000 == 0:
            print(f"  ...processed {processed_rows/1000000:.1f} million rows")

        dist = row.get('District', '').strip()
        date_s = row.get('Data Acquisition Time', '').strip()
        val_s = row.get(data_col, '').strip()

        if dist and date_s and val_s:
            try:
                # Some files have different formats, try typical dd-mm-yyyy HH:MM
                yr_str = date_s[6:10]
                if not yr_str.isdigit():
                    yr_str = date_s[:4] # if yyyy-mm-dd
                
                yr = int(yr_str)
                if 2020 <= yr <= 2025:
                    val = float(val_s)
                    # Filter out garbage
                    if -300 < val < 100:
                        dist_year_sum[dist][yr] += val
                        dist_year_cnt[dist][yr] += 1
                        if val < dist_min_max[dist]['min']: dist_min_max[dist]['min'] = val
                        if val > dist_min_max[dist]['max']: dist_min_max[dist]['max'] = val
            except:
                pass

print("Finished processing file. Computing averages...")

final_stats = {}
for dist in dist_year_sum:
    years = {}
    for yr in dist_year_sum[dist]:
        cnt = dist_year_cnt[dist][yr]
        if cnt > 0:
            avg = dist_year_sum[dist][yr] / cnt
            years[str(yr)] = round(avg, 2)
    
    # Calculate trend 2021 vs 2024 (or nearest available)
    start_yr = '2021' if '2021' in years else str(min(int(y) for y in years)) if years else None
    end_yr = '2024' if '2024' in years else str(max(int(y) for y in years)) if years else None
    
    trend_msg = "No sufficient data"
    recent_depletion = 0
    if start_yr and end_yr and start_yr != end_yr:
        # Negative means deeper water level (for confined) or positive depending on scale.
        # Let's just track the raw difference
        diff = years[end_yr] - years[start_yr]
        recent_depletion = round(diff, 2)
        trend_msg = f"{recent_depletion:+.2f}m change from {start_yr} to {end_yr}"
    
    final_stats[dist] = {
        'yearly_averages': years,
        'recent_trend': trend_msg,
        'recent_depletion': recent_depletion,
        'historical_min': round(dist_min_max[dist]['min'], 2),
        'historical_max': round(dist_min_max[dist]['max'], 2),
        'total_readings': sum(dist_year_cnt[dist].values())
    }

with open(CACHE_FILE, 'w') as f:
    json.dump(final_stats, f, indent=2)

print(f"Successfully cached recent telemetry data to {CACHE_FILE.name}")
for d, s in list(final_stats.items())[:5]:
    print(f"  {d}: {s['recent_trend']} (Readings: {s['total_readings']})")
