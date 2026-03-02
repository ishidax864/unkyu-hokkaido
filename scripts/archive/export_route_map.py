
import joblib
import json

le = joblib.load('lib/backtest/route_encoder.pkl')
mapping = dict(zip(le.classes_, le.transform(le.classes_)))

# Convert numpy int64 to int
mapping = {k: int(v) for k, v in mapping.items()}

with open('lib/prediction-engine/route_map.json', 'w') as f:
    json.dump(mapping, f, indent=2)

print("Mapping saved to lib/prediction-engine/route_map.json")
