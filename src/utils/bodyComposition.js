// src/utils/bodyComposition.js

function round5(x) {
  return Math.round(x * 100000) / 100000;
}

export function calc_bmi(weight, height) {
  return height > 0 ? Math.max(1.0, Math.min(round5(weight / ((height / 100) ** 2)), 90.0)) : 0;
}

export function calc_ffm(weight, height, age, impedance) {
  if (impedance === 0 || weight === 0) {
    return weight * 0.8;
  }
  const ht2_z = (height ** 2) / impedance;
  const ffm = 0.7374 * ht2_z + 0.1763 * weight - 0.1773 * age - 2.4658;
  return Math.max(weight * 0.5, Math.min(ffm, weight - 1));
}

export function calc_fat_percent(weight, height, sex, age, impedance) {
  if (weight === 0) {
    return 0.0;
  }
  const ffm = calc_ffm(weight, height, age, impedance);
  const fat_mass = Math.max(0, weight - ffm);
  const fat_percent = (fat_mass / weight) * 100;
  return Math.max(5.0, Math.min(round5(fat_percent), 50.0));
}

export function calc_fat_mass(weight, fat_percent) {
  return weight > 0 ? round5(weight * fat_percent / 100) : 0;
}

export function calc_bone_mass(weight, height, sex, age, impedance) {
    const bone_mass = 0.042 * weight * (sex === 1 ? 1.1 : 0.9);
    return Math.max(1.0, Math.min(round5(bone_mass), 5.0));
}

export function calc_bone_percent(weight, bone_mass) {
    return weight > 0 ? round5(bone_mass / weight * 100) : 0;
}


export function calc_muscle_percent(weight, height, sex, age, impedance) {
  const fat_percent = calc_fat_percent(weight, height, sex, age, impedance);
  const bone_mass = calc_bone_mass(weight, height, sex, age, impedance)
  const bone_percent = calc_bone_percent(weight, bone_mass);
  let muscle_percent;
  if (sex === 0) { // Female
    muscle_percent = Math.max(24.0, Math.min(42.0, 100 - fat_percent - bone_percent));
  } else { // Male
    muscle_percent = Math.max(33.0, Math.min(52.0, 100 - fat_percent - bone_percent));
  }
  return round5(muscle_percent);
}

export function calc_muscle_mass(weight, muscle_percent) {
  return weight > 0 ? round5(weight * muscle_percent / 100) : 0;
}

export function calc_skeletal_muscle_percent(muscle_percent) {
  return round5(0.7 * muscle_percent);
}

export function calc_water_percent(weight, height, sex, age, impedance) {
  const ffm = calc_ffm(weight, height, age, impedance);
  const water_percent = weight > 0 ? 0.73 * (ffm / weight) * 100 : 0;
  if (sex === 0) { // Female
    return Math.max(45.0, Math.min(round5(water_percent), 60.0));
  } else { // Male
    return Math.max(50.0, Math.min(round5(water_percent), 65.0));
  }
}

export function calc_water_mass(weight, water_percent) {
  return weight > 0 ? round5(weight * water_percent / 100) : 0;
}

export function calc_protein_percent(muscle_percent) {
  if (muscle_percent > 0) {
    const protein_percent = Math.max(12.0, Math.min(18.0, 0.412 * muscle_percent));
    return round5(protein_percent);
  }
  return 0;
}

export function calc_protein_mass(weight, protein_percent) {
  return weight > 0 ? round5(weight * protein_percent / 100) : 0;
}

export function calc_visceral_fat_level(weight, height, sex, age, impedance) {
  const fat_percent = calc_fat_percent(weight, height, sex, age, impedance);
  const bmi = calc_bmi(weight, height);
  const visceral_fat = 0.1 * fat_percent + 0.05 * bmi - 1.0;
  return Math.max(1, Math.min(Math.round(visceral_fat), 20));
}

export function calc_bmr(weight, height, sex, age) {
    let val;
    if (sex === 1) { // Male
        val = 10 * weight + 6.25 * height - 5 * age + 5;
    } else { // Female
        val = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    return Math.max(500, Math.min(Math.round(val * 10) / 10.0, 5000));
}

export function calc_metabolic_age(bmr, age, sex) {
    const ref_bmr = sex === 1 ? 1500 : 1200;
    const metabolic_age = age + (bmr - ref_bmr) / 38 - 3;
    return Math.max(16, Math.min(Math.round(metabolic_age), 100));
}

// New functions translated from main_code.py
export function calc_subcutaneous_fat_percent(fat_percent) {
    return round5(0.99 * fat_percent);
}

export function calc_subcutaneous_fat_mass(weight, subcutaneous_fat_percent) {
    return weight > 0 ? round5(weight * subcutaneous_fat_percent / 100) : 0;
}

export function calc_fat_free_weight(weight, fat_mass) {
    return weight > 0 ? round5(weight - fat_mass) : 0;
}

export function calc_standard_weight(height) {
    const height_m = height / 100;
    return round5(22 * height_m * height_m);
}

export function calc_weight_control(standard_weight, weight) {
    return round5(standard_weight - weight);
}

export function calc_fat_control(weight, fat_percent, sex) {
    const target_fat_percent = sex === 1 ? 12.0 : 22.0;
    const target_fat_mass = weight > 0 ? round5(weight * target_fat_percent / 100) : 0;
    const current_fat_mass = calc_fat_mass(weight, fat_percent);
    return round5(target_fat_mass - current_fat_mass);
}

export function calc_muscle_control(weight, muscle_percent) {
    const target_muscle_percent = 45.0;
    const target_muscle_mass = weight > 0 ? round5(weight * target_muscle_percent / 100) : 0;
    const current_muscle_mass = calc_muscle_mass(weight, muscle_percent);
    return round5(target_muscle_mass - current_muscle_mass);
}

export function calc_body_score(weight, height, sex, age, impedance) {
    const bmi = calc_bmi(weight, height);
    const fat_percent = calc_fat_percent(weight, height, sex, age, impedance);
    const target_fat = sex === 1 ? 12 : 22;
    const score = 100 - (Math.abs(bmi - 22) * 1.2) - (Math.abs(fat_percent - target_fat) * 1.5);
    return Math.max(0, Math.min(Math.round(score), 100));
}

export function calc_ffmi(weight, height, fat_mass) {
    const ffmi = height > 0 ? (weight - fat_mass) / ((height / 100) ** 2) : 0;
    return round5(ffmi);
}

export function calc_body_surface_area(height, weight) {
    return round5(0.007184 * (height ** 0.725) * (weight ** 0.425));
}

export function calc_ideal_body_weight(height, sex) {
    const height_inches = height / 2.54;
    let ibw;
    if (sex === 1) { // Male
        ibw = 50 + 2.3 * (height_inches - 60);
    } else { // Female
        ibw = 45.5 + 2.3 * (height_inches - 60);
    }
    return round5(ibw);
}