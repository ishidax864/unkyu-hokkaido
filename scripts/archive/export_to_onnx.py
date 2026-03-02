
import joblib
import numpy as np
from skl2onnx import to_onnx
from skl2onnx.common.data_types import FloatTensorType
import onnx

# Load Models
clf = joblib.load('lib/backtest/status_classifier.pkl')
reg = joblib.load('lib/backtest/recovery_regressor.pkl')

# Define Input Type
# 8 features: route_code, month, wind_speed, wind_gust, snowfall, snow_depth, temperature, pressure
initial_type = [('float_input', FloatTensorType([None, 11]))]

# Convert Classifier
print("Converting Status Classifier...")
onx_clf = to_onnx(clf, initial_types=initial_type, target_opset=12, options={'zipmap': False})
with open("lib/prediction-engine/status_classifier.onnx", "wb") as f:
    f.write(onx_clf.SerializeToString())

# Convert Regressor
print("Converting Recovery Regressor...")
onx_reg = to_onnx(reg, initial_types=initial_type, target_opset=12)
with open("lib/prediction-engine/recovery_regressor.onnx", "wb") as f:
    f.write(onx_reg.SerializeToString())

print("Done! ONNX models saved to lib/prediction-engine/")
