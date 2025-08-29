import asyncio
import time
import datetime
from bleak import BleakScanner
from flask import Flask, jsonify
from flask_cors import CORS
import threading

# === Config ===
TARGET_NAME_SUBSTRING = "Yoda1"
MANUFACTURER_ID = None
STABLE_WEIGHT_THRESHOLD = 0.05
STABLE_READINGS_REQUIRED = 3
STABLE_DURATION_SEC = 2.0
SCAN_TIMEOUT_SEC = 30
LOG_FILE = "weight_log.txt"
REPORT_FILE = "body_composition_report.txt"

# State
last_weights = []
last_metrics = None
metrics_printed = False
latest_ble_data = {"weight": 0, "impedance": 0}

app = Flask(__name__)
CORS(app)

# === User Input ===
def get_user_profile():
    print("Enter your profile details for a personalized body composition report:")
    while True:
        try:
            age = int(input("Age (10-120 years): "))#
            if 10 <= age <= 120:
                break
            print("Please enter a valid age (10-120).")
        except ValueError:
            print("Please enter a valid number.")
    while True:
        try:
            height = float(input("Height (100-250 cm): "))
            if 100 <= height <= 250:
                break
            print("Please enter a valid height (100-250 cm).")
        except ValueError:
            print("Please enter a valid number.")
    while True:
        sex_input = input("Sex (M/F): ").strip().lower()
        if sex_input in ['m', 'f']:
            sex = 1 if sex_input == 'm' else 0
            break
        print("Please enter 'M' for male or 'F' for female.")
    return age, height, sex

# === Body Composition Formulas ===
def round5(x):
    return round(x * 100000) / 100000

def calc_bmi(weight, height):
    return max(1.0, min(round5(weight / ((height / 100) ** 2)), 90.0)) if height > 0 else 0

def calc_ffm(weight, height, age, impedance):
    if impedance == 0 or weight == 0:
        return weight * 0.8
    ht2_z = (height ** 2) / impedance
    ffm = 0.7374 * ht2_z + 0.1763 * weight - 0.1773 * age - 2.4658
    return max(weight * 0.5, min(ffm, weight - 1))

def calc_fat_percent(weight, height, sex, age, impedance):
    if weight == 0:
        return 0.0
    ffm = calc_ffm(weight, height, age, impedance)
    fat_mass = max(0, weight - ffm)
    fat_percent = (fat_mass / weight) * 100
    return max(5.0, min(round5(fat_percent), 50.0))

def calc_fat_mass(weight, fat_percent):
    return round5(weight * fat_percent / 100) if weight > 0 else 0

def calc_muscle_percent(weight, height, sex, age, impedance):
    fat_percent = calc_fat_percent(weight, height, sex, age, impedance)
    bone_percent = calc_bone_percent(weight, calc_bone_mass(weight, height, sex, age, impedance))
    muscle_percent = max(24.0, min(42.0, 100 - fat_percent - bone_percent)) if sex == 0 else max(33.0, min(52.0, 100 - fat_percent - bone_percent))
    return round5(muscle_percent)

def calc_muscle_mass(weight, muscle_percent):
    return round5(weight * muscle_percent / 100) if weight > 0 else 0

def calc_skeletal_muscle_percent(muscle_percent):
    return round5(0.7 * muscle_percent)

def calc_water_percent(weight, height, sex, age, impedance):
    ffm = calc_ffm(weight, height, age, impedance)
    water_percent = 0.73 * (ffm / weight) * 100 if weight > 0 else 0
    return max(45.0, min(round5(water_percent), 60.0)) if sex == 0 else max(50.0, min(round5(water_percent), 65.0))

def calc_water_mass(weight, water_percent):
    return round5(weight * water_percent / 100) if weight > 0 else 0

def calc_bone_mass(weight, height, sex, age, impedance):
    bone_mass = 0.042 * weight * (1.1 if sex == 1 else 0.9)
    return max(1.0, min(round5(bone_mass), 5.0))

def calc_bone_percent(weight, bone_mass):
    return round5(bone_mass / weight * 100) if weight > 0 else 0

def calc_protein_percent(muscle_percent):
    protein_percent = max(12.0, min(18.0, 0.412 * muscle_percent)) if muscle_percent > 0 else 0
    return round5(protein_percent) if muscle_percent > 0 else 0

def calc_protein_mass(weight, protein_percent):
    return round5(weight * protein_percent / 100) if weight > 0 else 0

def calc_visceral_fat_level(weight, height, sex, age, impedance):
    fat_percent = calc_fat_percent(weight, height, sex, age, impedance)
    bmi = calc_bmi(weight, height)
    visceral_fat = 0.1 * fat_percent + 0.05 * bmi - 1.0
    return max(1, min(round(visceral_fat), 20))

def calc_visceral_fat_area(visceral_fat_level):
    return round5(5.9 * visceral_fat_level)

def calc_visceral_fat_mass(visceral_fat_level, weight):
    return round5(visceral_fat_level * weight / 100) if weight > 0 else 0

def calc_bmr(weight, height, sex, age):
    if sex == 1:
        val = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        val = 10 * weight + 6.25 * height - 5 * age - 161
    return max(500, min(round(val * 10) / 10.0, 5000))

def calc_metabolic_age(bmr, age, sex):
    ref_bmr = 1500 if sex == 1 else 1200
    metabolic_age = age + (bmr - ref_bmr) / 38 - 3
    return max(16, min(round(metabolic_age), 100))

def calc_subcutaneous_fat_percent(fat_percent):
    return round5(0.99 * fat_percent)

def calc_subcutaneous_fat_mass(weight, subcutaneous_fat_percent):
    return round5(weight * subcutaneous_fat_percent / 100) if weight > 0 else 0

def calc_fat_free_weight(weight, fat_mass):
    return round5(weight - fat_mass) if weight > 0 else 0

def calc_standard_weight(height, sex):
    height_m = height / 100
    return round5(22 * height_m * height_m)

def calc_weight_control(standard_weight, weight):
    return round5(standard_weight - weight)

def calc_fat_control(weight, fat_percent, sex):
    target_fat_percent = 12.0 if sex == 1 else 22.0
    target_fat_mass = round5(weight * target_fat_percent / 100) if weight > 0 else 0
    current_fat_mass = calc_fat_mass(weight, fat_percent)
    return round5(target_fat_mass - current_fat_mass)

def calc_muscle_control(weight, muscle_percent, sex):
    target_muscle_percent = 45.0
    target_muscle_mass = round5(weight * target_muscle_percent / 100) if weight > 0 else 0
    current_muscle_mass = calc_muscle_mass(weight, muscle_percent)
    return round5(target_muscle_mass - current_muscle_mass)

def calc_body_score(weight, height, sex, age, impedance):
    bmi = calc_bmi(weight, height)
    fat_percent = calc_fat_percent(weight, height, sex, age, impedance)
    target_fat = 12 if sex == 1 else 22
    score = 100 - (abs(bmi - 22) * 1.2) - (abs(fat_percent - target_fat) * 1.5)
    return max(0, min(round(score), 100))

def calc_ffmi(weight, height, fat_mass):
    ffmi = (weight - fat_mass) / ((height / 100) ** 2) if height > 0 else 0
    return round5(ffmi)

def calc_body_surface_area(height, weight):
    return round5(0.007184 * (height ** 0.725) * (weight ** 0.425))

def calc_ideal_body_weight(height, sex):
    height_inches = height / 2.54
    if sex == 1:
        ibw = 50 + 2.3 * (height_inches - 60)
    else:
        ibw = 45.5 + 2.3 * (height_inches - 60)
    return round5(ibw)

# === Classification Functions for Layman Report ===
def classify_weight(weight, sex, height):
    avg_range = (50, 90) if sex == 1 else (40, 80)
    if weight < avg_range[0]:
        return "Athletic", f"Your weight is light for your {'taller' if height > 175 else 'height'}, ideal for an active lifestyle! Boost strength with nutrient-rich snacks like nuts or protein shakes."
    elif weight > avg_range[1]:
        return "Needs Boost", f"Your weight is higher for your {'shorter' if height < 160 else 'height'}, which is okay! Small steps like daily walks or balanced meals can enhance energy."
    else:
        return "Standard", f"Your weight is nicely balanced for your {'taller' if height > 175 else 'height'}. Keep up your healthy habits to stay vibrant!"

def classify_bmi(bmi):
    if bmi < 18.5:
        return "Needs Boost", "Your BMI is a bit low, which might affect energy. Try nutrient-dense foods like avocados or yogurt and light exercise to feel stronger."
    elif 18.5 <= bmi <= 24.9:
        return "Standard", "Your BMI is in a healthy range—fantastic! Keep up balanced meals and regular activity to stay energized."
    else:
        return "Needs Boost", "Your BMI is slightly high. Activities like walking or adding more veggies can help you feel even better." if 25 <= bmi <= 29.9 else "Your BMI is above average. Small changes like walking or drinking more water can make a big difference over time."

def classify_fat_percent(fat_percent, sex, age):
    if sex == 1:
        if fat_percent < 6:
            return "Athletic", "Your body fat is very low, perfect for an active life! Ensure enough healthy fats (e.g., nuts, olive oil) to stay energized."
        elif 6 <= fat_percent <= 13:
            return "Excellent", "Your body fat is in a fit, healthy range—great job! Keep up your active habits."
        elif 14 <= fat_percent <= 20:
            return "Standard", "Your body fat is typical and healthy. Continue balanced nutrition and exercise to maintain it."
        else:
            return "Needs Boost", f"Your body fat is a bit high. Try {'light strength training' if age > 50 else 'cardio like brisk walking'} and fiber-rich foods to shift toward lean muscle."
    else:
        if fat_percent < 14:
            return "Athletic", "Your body fat is low, ideal for an active lifestyle! Include healthy fats (e.g., avocados) for energy."
        elif 14 <= fat_percent <= 20:
            return "Excellent", "Your body fat is in a healthy range—awesome! Maintain with balanced meals and movement."
        elif 21 <= fat_percent <= 30:
            return "Standard", "Your body fat is normal. Keep active and eat nutrient-rich foods to stay strong."
        else:
            return "Needs Boost", f"Your body fat is above average. {'Add yoga or swimming' if age > 50 else 'Try HIIT or walking'} and reduce sugary drinks to feel lighter."

def classify_muscle_percent(muscle_percent, sex, age):
    if sex == 1:
        if muscle_percent < 33:
            return "Needs Boost", f"Your muscle level could grow. Try {'gentle resistance like bands' if age > 50 else 'squats or light weights'} 3x/week to build strength."
        elif 33 <= muscle_percent <= 52:
            return "Standard", "Your muscle level is great for daily activities—well done! Keep moving to maintain it."
        else:
            return "Athletic", "Your muscles are strong and impressive, supporting mobility and energy!"
    else:
        if muscle_percent < 24:
            return "Needs Boost", f"Your muscle level could use a boost. Start with {'yoga or walking' if age > 50 else 'body-weight exercises'} to build strength."
        elif 24 <= muscle_percent <= 42:
            return "Standard", "Your muscles are in a healthy range—great job! Stay active to keep them strong."
        else:
            return "Athletic", "Your muscle level is outstanding, enhancing your strength and vitality!"

# === Parse Manufacturer-Specific Advertisement Data ===
def parse_advertisement_data(data: bytes, age, height, sex):
    global latest_ble_data
    print(f"Raw manufacturer data: {data.hex()}")
    if len(data) < 8:
        print("Data too short for parsing")
        return None

    weight_raw = int.from_bytes(data[0:2], 'big')
    impedance_raw = int.from_bytes(data[2:4], 'big')
    weight_kg = weight_raw * 0.01
    impedance = impedance_raw / 10 if impedance_raw > 0 else 0
    latest_ble_data = {"weight": weight_kg, "impedance": impedance}

    if weight_kg <= 0:
        print("Invalid weight data (0 or negative) received from device. Please step on the scale again for re-measurement.")
        return None

    fat_percent = calc_fat_percent(weight_kg, height, sex, age, impedance)
    fat_mass = calc_fat_mass(weight_kg, fat_percent)
    muscle_percent = calc_muscle_percent(weight_kg, height, sex, age, impedance)
    muscle_mass = calc_muscle_mass(weight_kg, muscle_percent)
    
    # Check for other invalid metrics
    if any(metric == 0 for metric in [fat_percent, muscle_mass, muscle_percent]):
        print("Invalid body composition data (e.g., fat or muscle mass is 0). Please step on the scale again for re-measurement.")
        return None

    skeletal_muscle_percent = calc_skeletal_muscle_percent(muscle_percent)
    water_percent = calc_water_percent(weight_kg, height, sex, age, impedance)
    water_mass = calc_water_mass(weight_kg, water_percent)
    bone_mass = calc_bone_mass(weight_kg, height, sex, age, impedance)
    bone_percent = calc_bone_percent(weight_kg, bone_mass)
    protein_percent = calc_protein_percent(muscle_percent)
    protein_mass = calc_protein_mass(weight_kg, protein_percent)
    visceral_fat_level = calc_visceral_fat_level(weight_kg, height, sex, age, impedance)
    visceral_fat_area = calc_visceral_fat_area(visceral_fat_level)
    visceral_fat_mass = calc_visceral_fat_mass(visceral_fat_level, weight_kg)
    subcutaneous_fat_percent = calc_subcutaneous_fat_percent(fat_percent)
    subcutaneous_fat_mass = calc_subcutaneous_fat_mass(weight_kg, subcutaneous_fat_percent)
    bmr = calc_bmr(weight_kg, height, sex, age)
    metabolic_age = calc_metabolic_age(bmr, age, sex)
    ffmi = calc_ffmi(weight_kg, height, fat_mass)

    return {
        'weight_kg': weight_kg,
        'impedance': impedance,
        'age': age,
        'height_cm': height,
        'sex': sex,
        'bmi': calc_bmi(weight_kg, height),
        'fat_percent': fat_percent,
        'fat_mass': fat_mass,
        'muscle_percent': muscle_percent,
        'muscle_mass': muscle_mass,
        'skeletal_muscle_percent': skeletal_muscle_percent,
        'water_percent': water_percent,
        'water_mass': water_mass,
        'bone_mass': bone_mass,
        'bone_percent': bone_percent,
        'protein_percent': protein_percent,
        'protein_mass': protein_mass,
        'visceral_fat_level': visceral_fat_level,
        'visceral_fat_area': visceral_fat_area,
        'visceral_fat_mass': visceral_fat_mass,
        'bmr': bmr,
        'metabolic_age': metabolic_age,
        'subcutaneous_fat_percent': subcutaneous_fat_percent,
        'subcutaneous_fat_mass': subcutaneous_fat_mass,
        'fat_free_weight': calc_fat_free_weight(weight_kg, fat_mass),
        'body_surface_area': calc_body_surface_area(height, weight_kg),
        'ideal_body_weight': calc_ideal_body_weight(height, sex),
        'standard_weight': calc_standard_weight(height, sex),
        'weight_control': calc_weight_control(calc_standard_weight(height, sex), weight_kg),
        'fat_control': calc_fat_control(weight_kg, fat_percent, sex),
        'muscle_control': calc_muscle_control(weight_kg, muscle_percent, sex),
        'body_score': calc_body_score(weight_kg, height, sex, age, impedance),
        'ffmi': ffmi
    }

# === Detailed Metrics Printing ===
def print_metrics(m):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("\n=== Body Composition (Detailed) ===")
    print(f"Timestamp: {timestamp}")
    print(f"Weight: {m['weight_kg']:.2f} kg {'(Standard)' if (m['sex'] == 1 and 50 <= m['weight_kg'] <= 90) or (m['sex'] == 0 and 40 <= m['weight_kg'] <= 80) else '(Athletic)' if (m['sex'] == 1 and m['weight_kg'] < 50) or (m['sex'] == 0 and m['weight_kg'] < 40) else '(Needs Boost)'}")
    print(f"BMI: {m['bmi']:.1f} {'(Needs Boost)' if m['bmi'] < 18.5 or m['bmi'] > 24.9 else '(Standard)'}")
    print(f"Body Fat %: {m['fat_percent']:.1f} {'(Athletic)' if (m['sex'] == 1 and m['fat_percent'] < 6) or (m['sex'] == 0 and m['fat_percent'] < 14) else '(Excellent)' if (m['sex'] == 1 and 6 <= m['fat_percent'] <= 13) or (m['sex'] == 0 and 14 <= m['fat_percent'] <= 20) else '(Standard)' if (m['sex'] == 1 and 14 <= m['fat_percent'] <= 20) or (m['sex'] == 0 and 21 <= m['fat_percent'] <= 30) else '(Needs Boost)'}")
    print(f"Body Fat Mass: {m['fat_mass']:.1f} kg (Individual variation, no standard classification)")
    print(f"Subcutaneous Fat %: {m['subcutaneous_fat_percent']:.1f} {'(Athletic)' if (m['sex'] == 1 and m['subcutaneous_fat_percent'] < 10) or (m['sex'] == 0 and m['subcutaneous_fat_percent'] < 15) else '(Standard)' if (m['sex'] == 1 and 10 <= m['subcutaneous_fat_percent'] <= 20) or (m['sex'] == 0 and 15 <= m['subcutaneous_fat_percent'] <= 25) else '(Needs Boost)'}")
    print(f"Subcutaneous Fat Mass: {m['subcutaneous_fat_mass']:.1f} kg")
    print(f"Muscle %: {m['muscle_percent']:.1f} {'(Needs Boost)' if (m['sex'] == 1 and m['muscle_percent'] < 33) or (m['sex'] == 0 and m['muscle_percent'] < 24) else '(Standard)' if (m['sex'] == 1 and 33 <= m['muscle_percent'] <= 52) or (m['sex'] == 0 and 24 <= m['muscle_percent'] <= 42) else '(Athletic)'}")
    print(f"Muscle Mass: {m['muscle_mass']:.1f} kg {'(Needs Boost)' if (m['sex'] == 1 and m['muscle_mass'] < 35) or (m['sex'] == 0 and m['muscle_mass'] < 25) else '(Standard)' if (m['sex'] == 1 and 35 <= m['muscle_mass'] <= 50) or (m['sex'] == 0 and 25 <= m['muscle_mass'] <= 40) else '(Athletic)'}")
    print(f"Skeletal Muscle %: {m['skeletal_muscle_percent']:.1f} {'(Needs Boost)' if (m['sex'] == 1 and m['skeletal_muscle_percent'] < 23) or (m['sex'] == 0 and m['skeletal_muscle_percent'] < 17) else '(Standard)' if (m['sex'] == 1 and 23 <= m['skeletal_muscle_percent'] <= 36) or (m['sex'] == 0 and 17 <= m['skeletal_muscle_percent'] <= 29) else '(Athletic)'}")
    print(f"Body Water %: {m['water_percent']:.1f} {'(Needs Boost)' if (m['sex'] == 1 and (m['water_percent'] < 50 or m['water_percent'] > 65)) or (m['sex'] == 0 and (m['water_percent'] < 45 or m['water_percent'] > 60)) else '(Standard)'}")
    print(f"Body Water Mass: {m['water_mass']:.1f} kg")
    print(f"Bone %: {m['bone_percent']:.1f} (Individual variation, no standard classification)")
    print(f"Bone Mass: {m['bone_mass']:.2f} kg {'(Needs Boost)' if (m['sex'] == 1 and m['bone_mass'] < 2.5) or (m['sex'] == 0 and m['bone_mass'] < 2.0) else '(Standard)' if (m['sex'] == 1 and 2.5 <= m['bone_mass'] <= 4.0) or (m['sex'] == 0 and 2.0 <= m['bone_mass'] <= 3.5) else '(Athletic)'}")
    print(f"Protein %: {m['protein_percent']:.1f} {'(Needs Boost)' if (m['sex'] == 1 and m['protein_percent'] < 15) or (m['sex'] == 0 and m['protein_percent'] < 12) else '(Standard)' if (m['sex'] == 1 and 15 <= m['protein_percent'] <= 20) or (m['sex'] == 0 and 12 <= m['protein_percent'] <= 18) else '(Athletic)'}")
    print(f"Protein Mass: {m['protein_mass']:.2f} kg {'(Needs Boost)' if (m['sex'] == 1 and m['protein_mass'] < 12) or (m['sex'] == 0 and m['protein_mass'] < 10) else '(Standard)' if (m['sex'] == 1 and 12 <= m['protein_mass'] <= 18) or (m['sex'] == 0 and 10 <= m['protein_mass'] <= 15) else '(Athletic)'}")
    print(f"Visceral Fat Level: {m['visceral_fat_level']} {'(Athletic)' if m['visceral_fat_level'] <= 9 else '(Standard)' if 10 <= m['visceral_fat_level'] <= 12 else '(Needs Boost)'}")
    print(f"Visceral Fat Area: {m['visceral_fat_area']:.1f} cm²")
    print(f"Visceral Fat Mass: {m['visceral_fat_mass']:.1f} kg")
    print(f"BMR: {m['bmr']:.1f} kcal {'(Needs Boost)' if (m['sex'] == 1 and m['bmr'] < 1600) or (m['sex'] == 0 and m['bmr'] < 1200) else '(Standard)' if (m['sex'] == 1 and 1600 <= m['bmr'] <= 2200) or (m['sex'] == 0 and 1200 <= m['bmr'] <= 1800) else '(Athletic)'}")
    print(f"Metabolic Age: {m['metabolic_age']} {'(Younger)' if m['metabolic_age'] < m['age'] - 5 else '(Standard)' if abs(m['metabolic_age'] - m['age']) <= 5 else '(Older)'}")
    print(f"Fat-Free Body Weight: {m['fat_free_weight']:.2f} kg")
    print(f"Body Surface Area: {m['body_surface_area']:.2f} m² {'(Needs Boost)' if (m['sex'] == 1 and m['body_surface_area'] < 1.7) or (m['sex'] == 0 and m['body_surface_area'] < 1.5) else '(Standard)' if (m['sex'] == 1 and 1.7 <= m['body_surface_area'] <= 2.2) or (m['sex'] == 0 and 1.5 <= m['body_surface_area'] <= 1.9) else '(Athletic)'}")
    print(f"Ideal Body Weight: {m['ideal_body_weight']:.2f} kg {'(Standard)' if (m['sex'] == 1 and 50 <= m['ideal_body_weight'] <= 90) or (m['sex'] == 0 and 40 <= m['ideal_body_weight'] <= 80) else '(Out of Range)'}")
    print(f"Standard Weight: {m['standard_weight']:.2f} kg")
    print(f"Weight Control: {m['weight_control']:.2f} kg {'(Gain ' + str(abs(m['weight_control'])) + ' kg)' if m['weight_control'] > 0 else '(Reduce ' + str(abs(m['weight_control'])) + ' kg)' if m['weight_control'] < 0 else '(Standard)'}")
    print(f"Fat Control: {m['fat_control']:.2f} kg {'(Gain ' + str(abs(m['fat_control'])) + ' kg fat)' if m['fat_control'] > 0 else '(Reduce ' + str(abs(m['fat_control'])) + ' kg fat)' if m['fat_control'] < 0 else '(Standard)'}")
    print(f"Muscle Control: {m['muscle_control']:.2f} kg {'(Gain ' + str(abs(m['muscle_control'])) + ' kg muscle)' if m['muscle_control'] > 0 else '(Reduce ' + str(abs(m['muscle_control'])) + ' kg muscle)' if m['muscle_control'] < 0 else '(Standard)'}")
    print(f"Body Score: {m['body_score']}")
    print(f"FFMI: {m['ffmi']:.1f} {'(Needs Boost)' if (m['sex'] == 1 and m['ffmi'] < 17) or (m['sex'] == 0 and m['ffmi'] < 14) else '(Standard)' if (m['sex'] == 1 and 17 <= m['ffmi'] <= 25) or (m['sex'] == 0 and 14 <= m['ffmi'] <= 20) else '(Athletic)'}")
    print(f"Impedance: {m['impedance']:.1f} ohms" if m['impedance'] else "Impedance: N/A")
    print(f"Profile: Age {m['age']}, Height {m['height_cm']} cm, Sex {'Male' if m['sex'] == 1 else 'Female'}")
    print("Note: Absolute values like muscle mass vary by frame/height. Use percentages for classification.")
    print("=================================")
    
    with open(LOG_FILE, 'a') as f:
        f.write(f"{timestamp}: {m}\n")

# === Layman Report Generation with Customized Insights ===
def generate_layman_report(m):
    age = m['age']
    height = m['height_cm']
    sex = m['sex']
    weight = m['weight_kg']
    bmi = m['bmi']
    fat_percent = m['fat_percent']
    fat_mass = m['fat_mass']
    muscle_percent = m['muscle_percent']
    muscle_mass = m['muscle_mass']
    bmr = m['bmr']
    metabolic_age = m['metabolic_age']
    
    # Get classifications and tips
    weight_class, weight_message = classify_weight(weight, sex, height)
    bmi_class, bmi_message = classify_bmi(bmi)
    fat_class, fat_message = classify_fat_percent(fat_percent, sex, age)
    muscle_class, muscle_message = classify_muscle_percent(muscle_percent, sex, age)
    
    # Determine body type with customized insights
    if bmi < 18.5 or (fat_percent < (13 if sex == 1 else 20) and muscle_percent < (33 if sex == 1 else 24)):
        body_type = "Slim/Lean (Ectomorph-like)"
        body_insight = f"Your lean build suggests a fast metabolism, common for {'taller' if height > 175 else 'slimmer'} individuals. {'Younger folks like you' if age < 40 else 'At your age'} can build strength with calorie-dense foods (e.g., nuts, avocados) and {'gentle resistance like yoga' if age > 50 else 'strength training'}. Aim for {'2,500+ kcal/day' if weight < 70 else 'balanced meals with 500 extra kcal'} to support energy."
    elif (18.5 <= bmi <= 24.9 and fat_percent <= (20 if sex == 1 else 30) and muscle_percent >= (33 if sex == 1 else 24)) or muscle_percent > (42 if sex == 0 else 52):
        body_type = "Athletic/Balanced (Mesomorph-like)"
        body_insight = f"Your balanced build is naturally strong, ideal for {'taller frames' if height > 175 else 'your height'}. {'Younger adults' if age < 40 else 'At your age'} can maintain this with a mix of cardio and {'light weights' if age > 50 else 'weights'}. {'Men' if sex == 1 else 'Women'} benefit from {'bulking with heavy lifts' if sex == 1 and age < 50 else 'Pilates or body-weight moves'}. Aim for 2,000-2,500 kcal with balanced nutrients."
    else:
        body_type = "Rounded/Strong (Endomorph-like)"
        body_insight = f"Your rounded, strong build carries more weight, common for {'shorter' if height < 160 else 'average/taller'} frames. {'Older adults' if age > 50 else 'You'} can boost energy with low-impact activities like {'swimming or yoga' if age > 50 else 'walking or cycling'}. {'Women post-menopause' if sex == 0 and age > 50 else 'Focus on'} fiber-rich meals (veggies, whole grains) and 1,800-2,200 kcal to feel vibrant."

    # Compile personalized goals
    goals = []
    if bmi_class == "Needs Boost":
        if bmi < 18.5:
            goals.append(f"- **BMI ({bmi:.1f}) Needs Boost**: Your weight is a bit low, which might affect energy. **Goal**: Gain 0.5-1 kg/month with nutrient-dense foods (nuts, yogurt, avocados; add {'2,500+ kcal/day' if weight < 70 else '500 extra kcal'}). Try {'gentle resistance like yoga' if age > 50 else 'strength training 3x/week'}. {'Smaller, frequent meals help for your height' if height < 160 else ''}. Check with a doctor for possible medical causes (e.g., thyroid).")
        else:
            goals.append(f"- **BMI ({bmi:.1f}) Needs Boost**: Your weight is a bit high, which might affect mobility. **Goal**: Lose 0.5-1 kg/month with balanced meals (reduce 500 kcal/day) and {'low-impact cardio like walking' if age > 50 else '150 min/week activity'}. {'Taller folks' if height > 175 else ''} may need more calories initially.")
    if muscle_class == "Needs Boost":
        goals.append(f"- **Muscle ({muscle_percent:.1f}%) Needs Boost**: Your muscle level could grow, supporting strength {'and mobility' if age > 50 else ''}. **Goal**: Build 0.5-1 kg muscle/month with {'light weights or bands' if age > 50 else 'squats, push-ups'} 3x/week. Eat 25-40g protein/meal (chicken, beans; 1.6g/kg body weight). {'Add vitamin D for bones' if sex == 0 and age > 50 else ''}. {'Taller folks' if height > 175 else ''} may need extra reps.")
    if fat_class == "Needs Boost":
        goals.append(f"- **Body Fat ({fat_percent:.1f}%) Needs Boost**: Your fat level is high, which can impact health. **Goal**: Reduce 1-2% fat/month with {'low-impact cardio like walking' if age > 50 else '150 min/week cardio (HIIT, jogging)'}. Eat high-protein/fiber (veggies, lean meats; cut 500 kcal/day for 0.5 kg/week loss). {'Add soy/omega-3s for women post-menopause' if sex == 0 and age > 50 else ''}. {'Taller frames' if height > 175 else ''} may need more workout volume.")

    goals_text = "\n".join(goals) if goals else "Your metrics are in fantastic shape—keep shining with your healthy habits!"

    # Generate layman report
    report = f"""
{'='*40}
Your Personalized Body Composition Report
{'='*40}
Timestamp: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Profile: Age {age} years, Height {height} cm, Sex {'Male' if sex == 1 else 'Female'}

1. Weight: {weight:.1f} kg — {weight_class}
   {weight_message}

2. Body Mass Index (BMI): {bmi:.1f} — {bmi_class}
   {bmi_message}

3. Body Fat: {fat_percent:.1f}% — {fat_class}
   {fat_message}
   Fat Mass: {fat_mass:.1f} kg (This is the weight of your body fat, unique to you.)

4. Muscle: {muscle_percent:.1f}% — {muscle_class}
   {muscle_message}
   Muscle Mass: {muscle_mass:.1f} kg (This powers your movement and strength.)

5. Calories Burned at Rest (BMR): {bmr:.1f} kcal — {'Needs Boost' if (1600 > bmr if sex == 1 else 1200 > bmr) else 'Standard' if (1600 <= bmr <= 2200 if sex == 1 else 1200 <= bmr <= 1800) else 'Athletic'}
   This is how many calories your body uses at rest. Eating enough healthy food keeps your energy soaring!

6. Metabolic Age: {metabolic_age} years — {'Younger' if metabolic_age < age - 5 else 'Standard' if abs(metabolic_age - age) <= 5 else 'Older'}
   This reflects your body's energy compared to your age. { 'You\'re thriving!' if metabolic_age <= age else 'More activity or better sleep can make you feel younger!' }

{'-'*40}
Your Body Type: {body_type}
{body_insight}

Your Goals:
{goals_text}

Final Note:
You're truly glowing—your body is a one-of-a-kind powerhouse, bursting with potential! Track your progress weekly to celebrate every small victory and watch your progress soar over time. Stay committed to this amazing journey, and you're on your way to an even healthier, more vibrant you! Consult a doctor if questions arise, but keep shining bright!
{'='*40}
"""
    print(report)
    
    with open(REPORT_FILE, 'a') as f:
        f.write(report + "\n")

def is_weight_stable(new_weight):
    global last_weights, metrics_printed
    current_time = time.time()
    last_weights.append((new_weight, current_time))

    if len(last_weights) > STABLE_READINGS_REQUIRED:
        last_weights.pop(0)
        weights, timestamps = zip(*last_weights)
        if (all(abs(weights[i] - weights[i-1]) < STABLE_WEIGHT_THRESHOLD
                for i in range(1, len(weights))) and
                (timestamps[-1] - timestamps[0]) >= STABLE_DURATION_SEC):
            return True
        if any(abs(weights[i] - weights[0]) >= STABLE_WEIGHT_THRESHOLD
               for i in range(1, len(weights))):
            metrics_printed = False
    return False

def detection_callback(device, adv_data, age, height, sex):
    global last_metrics, metrics_printed
    device_name = device.name if device.name else "Unknown"
    
    if TARGET_NAME_SUBSTRING and (device.name is None or TARGET_NAME_SUBSTRING.lower() not in device.name.lower()):
        return

    print(f"Received advertisement from {device_name} ({device.address})")
    print(f"Advertised services: {adv_data.service_uuids if adv_data.service_uuids else 'None'}")

    if adv_data.manufacturer_data:
        for manufacturer_id, data in adv_data.manufacturer_data.items():
            if MANUFACTURER_ID is None or manufacturer_id == MANUFACTURER_ID:
                print(f"Manufacturer ID: {hex(manufacturer_id)}")
                parsed = parse_advertisement_data(data, age, height, sex)
                if parsed and is_weight_stable(parsed['weight_kg']):
                    if not metrics_printed and parsed != last_metrics:
                        print_metrics(parsed)
                        generate_layman_report(parsed)
                        # Check if any metric is 0
                        if any(value == 0 for value in parsed.values() if isinstance(value, (int, float))):
                            print("Zero value detected in metrics. Please step on the scale again for re-measurement.")
                            return
                        # Stop script after printing both reports if no zeros
                        last_metrics = parsed
                        metrics_printed = True
                        print("Stopping script after detailed and layman reports with no zero values.")
                        exit(0)
    else:
        print("No manufacturer-specific data found in advertisement")

@app.route('/get_ble_data', methods=['GET'])
def get_ble_data():
    return jsonify(latest_ble_data)

async def scan_for_advertisements(age, height, sex):
    print(f"Scanning for BLE devices with name containing {TARGET_NAME_SUBSTRING}...")
    scanner = BleakScanner(lambda device, adv_data: detection_callback(device, adv_data, age, height, sex))
    try:
        await scanner.start()
        await asyncio.sleep(SCAN_TIMEOUT_SEC)
        await scanner.stop()
    except Exception as e:
        print(f"Scanning error: {e}")
        print("If the scale requires pairing, please pair it manually in Windows Bluetooth settings:")
        print("1. Go to Settings > Devices > Bluetooth & other devices")
        print("2. Click 'Add Bluetooth or other device' and select 'Bluetooth'")
        print("3. Select 'Yoda1' and complete the pairing process")
        print("Then re-run this script.")

def run_ble_scanner():
    age, height, sex = get_user_profile()
    asyncio.run(scan_for_advertisements(age, height, sex))

if __name__ == "__main__":
    ble_thread = threading.Thread(target=run_ble_scanner)
    ble_thread.daemon = True
    ble_thread.start()
    app.run(port=5001)