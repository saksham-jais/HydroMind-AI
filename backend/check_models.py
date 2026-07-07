import json
from pathlib import Path

DATA = Path('app/data')
accuracy = json.load(open(DATA / 'district_forecast_accuracy.json'))
slopes = json.load(open(DATA / 'district_forecast_slopes.json'))

positive_r2 = {k: v for k, v in accuracy.items() if v > 0}
negative_r2  = {k: v for k, v in accuracy.items() if v <= 0}
avg_r2 = sum(accuracy.values()) / len(accuracy)

print(f"Total district models trained: {len(accuracy)}")
print(f"Districts with positive R2 (meaningful linear fit): {len(positive_r2)}")
print(f"  -> {list(positive_r2.items())}")
print(f"Districts with negative R2 (monsoon noise dominated): {len(negative_r2)}")
print(f"Average R2 across all districts: {avg_r2:.3f}")

best_r2_d = max(accuracy, key=accuracy.get)
worst_r2_d = min(accuracy, key=accuracy.get)
print(f"Best  R2: {best_r2_d} = {accuracy[best_r2_d]:.3f}")
print(f"Worst R2: {worst_r2_d} = {accuracy[worst_r2_d]:.3f}")

fastest_decline = max(slopes, key=slopes.get)
fastest_recovery = min(slopes, key=slopes.get)
print(f"Fastest Decline: {fastest_decline} = +{slopes[fastest_decline]:.3f} m/yr")
print(f"Fastest Recovery: {fastest_recovery} = {slopes[fastest_recovery]:.3f} m/yr")
