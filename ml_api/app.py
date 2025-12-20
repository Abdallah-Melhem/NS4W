from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from catboost import CatBoostClassifier
import warnings

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)  # ok for local dev

MODEL_PATH = "catboost_final_model.cbm"

model = CatBoostClassifier()
model.load_model(MODEL_PATH)

FEATURE_ORDER = [
    "blood_cell_count_mcl",
    "white_blood_cell_count_thousand_per_microliter",
    "mothers_age",
    "fathers_age",
    "patient_age",
    "genes_in_mothers_side",
    "inherited_from_father",
    "no_of_previous_abortion",
    "ho_substance_abuse",
    "birth_asphyxia",
    "paternal_gene"
]

CORE_FEATURES = [
    "blood_cell_count_mcl",
    "white_blood_cell_count_thousand_per_microliter",
    "patient_age",
    "mothers_age",
    "fathers_age"
]

OPTIONAL_DEFAULTS = {
    "genes_in_mothers_side": "unknown",
    "inherited_from_father": "unknown",
    "paternal_gene": "unknown",
    "birth_asphyxia": "unknown",
    "ho_substance_abuse": "unknown",
    "no_of_previous_abortion": 0
}

NUMERIC_FLOAT = {
    "blood_cell_count_mcl",
    "white_blood_cell_count_thousand_per_microliter"
}
NUMERIC_INT = {
    "patient_age", "mothers_age", "fathers_age", "no_of_previous_abortion"
}
YES_NO_FIELDS = {
    "genes_in_mothers_side",
    "inherited_from_father",
    "ho_substance_abuse",
    "birth_asphyxia",
    "paternal_gene"
}

def normalize_yes_no(val):
    if val is None:
        return None
    if isinstance(val, str):
        v = val.strip().lower()
        if v in ("yes", "y", "true", "1"):
            return "yes"
        if v in ("no", "n", "false", "0"):
            return "no"
        if v in ("unknown", ""):
            return "unknown"
    return val  # keep as-is if it's something else

@app.get("/health")
def health():
    return jsonify({"ok": True})

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    # Treat missing OR null core fields as missing
    missing_core = [f for f in CORE_FEATURES if (f not in data) or (data.get(f) is None)]
    if missing_core:
        return jsonify({
            "error": "Missing core features",
            "missing": missing_core
        }), 400

    used_imputation = False

    # Impute missing optional fields OR optional fields explicitly set to null
    for feature, default in OPTIONAL_DEFAULTS.items():
        if feature not in data or data.get(feature) is None:
            data[feature] = default
            used_imputation = True

    # Normalize yes/no fields
    for f in YES_NO_FIELDS:
        if f in data:
            data[f] = normalize_yes_no(data[f])

    # Cast numeric types safely
    try:
        for f in NUMERIC_FLOAT:
            if f in data and data[f] is not None:
                data[f] = float(data[f])

        for f in NUMERIC_INT:
            if f in data and data[f] is not None:
                data[f] = int(float(data[f]))  # handles "20.0" too
    except Exception as e:
        return jsonify({
            "error": "Invalid numeric value",
            "details": str(e)
        }), 400

    try:
        input_df = pd.DataFrame(
            [[data.get(f, np.nan) for f in FEATURE_ORDER]],
            columns=FEATURE_ORDER
        )

        pred = model.predict(input_df)[0]
        proba = model.predict_proba(input_df)[0]
        confidence = float(np.max(proba))

    except Exception as e:
        return jsonify({
            "error": "Model prediction failed",
            "details": str(e)
        }), 500

    return jsonify({
        "prediction": str(pred),
        "confidence": round(confidence, 3),
        "imputed": used_imputation
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)