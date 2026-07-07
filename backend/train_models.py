import csv
import json
import joblib
import numpy as np
from pathlib import Path
from sklearn.linear_model import LinearRegression

def train_forecast_models():
    print("Reading historical datasets...")
    DS = Path(r"D:\Mega\Hackathon\HackAarambh\HydroMind-AI\Datasets")
    files = [
        DS / 'gwl_manual_quarterly_gujarat-sw-gw_gj_1950_1990.csv',
        DS / 'gwl_manual_quarterly_gujarat-sw-gw_gj_1991_2020.csv'
    ]
    
    # Store data points: district -> { year: [levels] }
    district_data = {}
    
    for file in files:
        if not file.exists(): continue
        with open(file, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                district = row.get('District', '').strip().title()
                date_s = row.get('Data Acquisition Time', '').strip()
                val_s = row.get('Groundwater Level Quarterly Manual (meter)', '').strip()
                if not val_s: val_s = row.get('Level (m)', '').strip()
                if not val_s: val_s = row.get('Depth to water level (m bgl)', '').strip()
                if not val_s: val_s = row.get('Water Level (m bgl)', '').strip()
                
                if district and date_s and val_s:
                    try:
                        val = float(val_s)
                        if val > 150 or val < -50: continue # Ignore outliers
                        
                        yr = None
                        if '-' in date_s:
                            parts = date_s.split(' ')[0].split('-')
                            if len(parts[0]) == 4:
                                yr = int(parts[0])
                            else:
                                yr = int(parts[2])
                        if yr:
                            if district not in district_data:
                                district_data[district] = {}
                            if yr not in district_data[district]:
                                district_data[district][yr] = []
                            district_data[district][yr].append(val)
                    except ValueError:
                        pass
                        
    print(f"Extracted data for {len(district_data)} districts. Training ML models...")
    print("NOTE: Using recent data (2005-2020) for accurate current-trend prediction.")
    
    # Focus on recent 15 years to capture current trend, not 70-year history
    RECENT_FROM = 2005
    
    models = {}
    district_slopes = {}
    district_accuracy = {}
    
    for dist, yearly_vals in district_data.items():
        years = []
        levels = []
        for y, vals in sorted(yearly_vals.items()):
            if y >= RECENT_FROM:  # Only recent data
                years.append([y])
                levels.append(sum(vals)/len(vals))
            
        if len(years) > 3:  # Need at least 4 recent data points
            X = np.array(years)
            y = np.array(levels)
            
            # --- BACKTESTING: Train on first 80%, test on last 20% ---
            split = max(int(len(X) * 0.8), 5)
            X_train, X_test = X[:split], X[split:]
            y_train, y_test = y[:split], y[split:]
            
            test_model = LinearRegression()
            test_model.fit(X_train, y_train)
            r2 = round(float(test_model.score(X_test, y_test)), 3) if len(X_test) > 0 else 0.0
            
            # --- FINAL MODEL: Train on all data for best future prediction ---
            model = LinearRegression()
            model.fit(X, y)
            
            models[dist] = model
            slope = model.coef_[0]
            district_slopes[dist] = round(float(slope), 3)
            district_accuracy[dist] = r2

    # Save the trained ML models to disk
    models_path = DS / 'trained_linear_models.joblib'
    joblib.dump(models, models_path)
    print(f"[OK] Trained {len(models)} Linear Regression models -> {models_path}")
    
    # Save slope lookup cache for the dashboard API
    cache_path = DS / 'district_forecast_slopes.json'
    with open(cache_path, 'w') as f:
        json.dump(district_slopes, f)
    print(f"[OK] Slope cache saved -> {cache_path}")
    
    # Save R2 accuracy cache
    accuracy_path = DS / 'district_forecast_accuracy.json'
    with open(accuracy_path, 'w') as f:
        json.dump(district_accuracy, f)
    print(f"[OK] Accuracy (R2) cache saved -> {accuracy_path}")
    
    # Print backtest summary
    print("\n--- BACKTEST RESULTS (80/20 split) ---")
    print(f"{'District':<22} {'R2':>6}  {'Slope m/yr':>10}  Direction")
    print("-" * 55)
    for d, acc in sorted(district_accuracy.items(), key=lambda x: -x[1]):
        slope = district_slopes.get(d, 0)
        direction = "Declining" if slope > 0 else "Recovering"
        print(f"  {d:<20} {acc:>6.3f}  {slope:>+10.3f}  [{direction}]")

if __name__ == '__main__':
    train_forecast_models()

