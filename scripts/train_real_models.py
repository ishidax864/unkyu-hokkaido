import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, classification_report, mean_squared_error, mean_absolute_error
from sklearn.preprocessing import LabelEncoder
import joblib

# Load Data
df = pd.read_csv('lib/backtest/dataset_real.csv')

# Handle any missing values (though TS script filtered some)
df.fillna(0, inplace=True)

# Converter: Only train where status is valid (0=normal, 1=delayed, 2=suspended)
status_map = {'normal': 0, 'delayed': 1, 'suspended': 2}
df['status_int'] = df['status'].map(status_map)
df = df.dropna(subset=['status_int'])

# Preprocessing
# Convert route_id to numeric
le_route = LabelEncoder()
df['route_code'] = le_route.fit_transform(df['route_id'])

# Features (Same as old model)
features = ['route_code', 'month', 'wind_speed', 'wind_dir', 'wind_gust', 'snowfall', 'snow_depth', 'temperature', 'pressure', 'wind_change', 'pressure_change']
X = df[features]

y_status = df['status_int']
y_recovery = df['recovery_time']

# Split Data
X_train, X_test, y_status_train, y_status_test, y_rec_train, y_rec_test = train_test_split(
    X, y_status, y_recovery, test_size=0.2, random_state=42
)

print(f"Dataset Total: {len(df)}")
print(f"Training on {len(X_train)} samples, Testing on {len(X_test)} samples.")
print(f"Class distribution: Normal={sum(y_status==0)}, Delayed={sum(y_status==1)}, Suspended={sum(y_status==2)}")

# ==========================================
# 1. Status Classifier (Gradient Boosting)
# ==========================================
print("\n=== Training Status Classifier on REAL DATA ===")
clf = GradientBoostingClassifier(n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42)
clf.fit(X_train, y_status_train)

y_status_pred = clf.predict(X_test)
acc = accuracy_score(y_status_test, y_status_pred)
print(f"Accuracy: {acc:.4f}")
print("Detailed Classification Report:")
# Some classes might not exist in test set if data is heavily skewed
try:
    print(classification_report(y_status_test, y_status_pred))
except Exception as e:
    print(f"Report formatting error: {e}")

# Save Real Models
joblib.dump(clf, 'lib/backtest/real_status_classifier.pkl')
joblib.dump(le_route, 'lib/backtest/real_route_encoder.pkl')
print("\nNew real data models saved to lib/backtest/")
