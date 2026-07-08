import time, sys, json
sys.path.insert(0, '.')

from app.services.data_service import DS

# 1. state_trend_cache.json
cache_file = DS / 'state_trend_cache.json'
print(f"state_trend_cache.json exists: {cache_file.exists()}")
t0 = time.time()
if cache_file.exists():
    data = json.load(open(cache_file))
    print(f"  Keys in cache: {len(data)}")
print(f"  File load: {(time.time()-t0)*1000:.1f}ms")

# 2. joblib model
models_path = DS / 'trained_best_models.joblib'
print(f"\ntrained_best_models.joblib exists: {models_path.exists()}")
t0 = time.time()
if models_path.exists():
    import joblib
    m = joblib.load(models_path)
    print(f"  Districts in model: {len(m)}")
print(f"  joblib load: {(time.time()-t0)*1000:.1f}ms")

# 3. Firebase call
print("\nFirebase get_readings call...")
t0 = time.time()
from app.services.firebase import get_readings
result = get_readings('v1', limit=1)
elapsed = (time.time()-t0)*1000
print(f"  Firebase: {elapsed:.1f}ms, got {len(result)} readings")

print("\nDONE")
