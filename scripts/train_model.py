
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

# Load Data
df = pd.read_csv('lib/backtest/training_data.csv')

# Preprocessing
# Convert route_id to numeric codes
df['route_code'] = df['route_id'].astype('category').cat.codes

# Features
X = df[['route_code', 'month', 'wind_speed', 'wind_gust', 'snowfall', 'snow_depth', 'temperature', 'precipitation']]
y = df['is_stopped']

# Train/Test Split (80/20)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Model Training (Random Forest)
rf_model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
rf_model.fit(X_train, y_train)

# Model Training (Gradient Boosting)
from sklearn.ensemble import GradientBoostingClassifier
gb_model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
gb_model.fit(X_train, y_train)

# Evaluation function
def evaluate_model(model, name):
    print(f"\n=== {name} Performance ===")
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred))
    
    # Threshold Tuning
    print(f"--- {name} Threshold Tuning ---")
    y_probs = model.predict_proba(X_test)[:, 1]
    for threshold in [0.3, 0.4, 0.5]:
        y_pred_thresh = (y_probs >= threshold).astype(int)
        rec = (y_test * y_pred_thresh).sum() / y_test.sum()
        prec = (y_test * y_pred_thresh).sum() / y_pred_thresh.sum() if y_pred_thresh.sum() > 0 else 0
        print(f"Thresh={threshold}: Recall={rec:.2f}, Precision={prec:.2f}")

evaluate_model(rf_model, "Random Forest")
evaluate_model(gb_model, "Gradient Boosting")

# Save Best Model (Random Forest for now as it supports class_weight natively easier)
joblib.dump(rf_model, 'lib/backtest/random_forest_model.pkl')
print("\nModel saved to lib/backtest/random_forest_model.pkl")

# Feature Importance (RF)
importances = rf_model.feature_importances_
feature_names = X.columns
print("\n=== Feature Importance (RF) ===")
for name, importance in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True):
    print(f"{name}: {importance:.4f}")
