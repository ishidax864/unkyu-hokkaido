
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, classification_report, mean_squared_error, mean_absolute_error
from sklearn.preprocessing import LabelEncoder
import joblib

# Load Data
df = pd.read_csv('lib/backtest/dataset_hourly_trend.csv')

# Preprocessing
# Convert route_id to numeric
le_route = LabelEncoder()
df['route_code'] = le_route.fit_transform(df['route_id'])

# Features (Added wind_change, pressure_change, wind_dir replaced wind_direction)
features = ['route_code', 'month', 'wind_speed', 'wind_dir', 'wind_gust', 'snowfall', 'snow_depth', 'temperature', 'pressure', 'wind_change', 'pressure_change']
X = df[features]

# Target 1: Status (Classification)
# Map status to int: normal=0, delayed=1, suspended=2
status_map = {'normal': 0, 'delayed': 1, 'suspended': 2}
y_status = df['status'].map(status_map)

# Target 2: Recovery Time (Regression)
y_recovery = df['recovery_time']

# Split Data
X_train, X_test, y_status_train, y_status_test, y_rec_train, y_rec_test = train_test_split(
    X, y_status, y_recovery, test_size=0.2, random_state=42
)

print(f"Training on {len(X_train)} samples, Testing on {len(X_test)} samples.")

# ==========================================
# 1. Status Classifier (Gradient Boosting)
# ==========================================
print("\n=== Training Status Classifier ===")
clf = GradientBoostingClassifier(n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42)
clf.fit(X_train, y_status_train)

y_status_pred = clf.predict(X_test)
acc = accuracy_score(y_status_test, y_status_pred)
print(f"Accuracy: {acc:.4f}")
print(classification_report(y_status_test, y_status_pred, target_names=['Normal', 'Delayed', 'Suspended']))

# ==========================================
# 2. Recovery Time Regressor (Random Forest)
# ==========================================
print("\n=== Training Recovery Time Regressor ===")
# We assume the model predicts recovery time for ALL cases, 
# but in UI we typically only show it if status != normal.
# However, training on all data (including 0 recovery for normal) helps it learn "No delay = 0h".
reg = RandomForestRegressor(n_estimators=100, random_state=42)
reg.fit(X_train, y_rec_train)

y_rec_pred = reg.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_rec_test, y_rec_pred))
mae = mean_absolute_error(y_rec_test, y_rec_pred)

print(f"RMSE: {rmse:.4f} hours")
print(f"MAE:  {mae:.4f} hours")

# Check regression performance specifically on "Suspended" cases
mask_suspended = (y_status_test == 2)
if mask_suspended.sum() > 0:
    rmse_susp = np.sqrt(mean_squared_error(y_rec_test[mask_suspended], y_rec_pred[mask_suspended]))
    mae_susp = mean_absolute_error(y_rec_test[mask_suspended], y_rec_pred[mask_suspended])
    print(f"RMSE (Suspended Only): {rmse_susp:.4f} hours")
    print(f"MAE  (Suspended Only): {mae_susp:.4f} hours")

# Save Models
joblib.dump(clf, 'lib/backtest/status_classifier.pkl')
joblib.dump(reg, 'lib/backtest/recovery_regressor.pkl')
joblib.dump(le_route, 'lib/backtest/route_encoder.pkl')
print("\nModels saved to lib/backtest/")
