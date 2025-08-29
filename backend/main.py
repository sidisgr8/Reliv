# backend/main.py
import asyncio
import threading
from bleak import BleakScanner
from flask import Flask, jsonify
from flask_cors import CORS

# --- Configuration ---
TARGET_NAME_SUBSTRING = "Yoda1"
SCAN_TIMEOUT_SEC = 20  # Scan for 20 seconds at a time

# --- Global State ---
# This dictionary will store the latest data received from the BLE device.
latest_ble_data = {"weight": None, "impedance": None, "error": "Not scanned yet."}
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for your React app

def parse_advertisement_data(data: bytes):
    """Parses weight and impedance from the raw BLE advertisement data."""
    if len(data) < 4:
        print("Received data is too short for parsing.")
        return None, None
    
    weight_raw = int.from_bytes(data[0:2], 'big')
    impedance_raw = int.from_bytes(data[2:4], 'big')
    
    weight_kg = weight_raw * 0.01
    impedance = impedance_raw / 10 if impedance_raw > 0 else 0
    
    if weight_kg <= 0:
        print("Invalid weight data (0 or negative).")
        return None, None
        
    return weight_kg, impedance

def detection_callback(device, advertisement_data):
    """Callback function that is executed when a BLE device is found."""
    global latest_ble_data
    device_name = device.name if device.name else "Unknown"
    
    # Check if the device name contains our target substring
    if TARGET_NAME_SUBSTRING.lower() in device_name.lower():
        print(f"Found target device: {device_name} ({device.address})")
        
        if advertisement_data.manufacturer_data:
            # Assuming the first manufacturer data entry is the one we want
            for manu_id, data in advertisement_data.manufacturer_data.items():
                weight, impedance = parse_advertisement_data(data)
                if weight is not None:
                    print(f"Received Weight: {weight:.2f} kg, Impedance: {impedance} ohms")
                    latest_ble_data = {"weight": weight, "impedance": impedance, "error": None}
                    break # Stop after finding the first valid data

async def scan_for_devices():
    """Continuously scans for BLE devices."""
    while True:
        print(f"Scanning for '{TARGET_NAME_SUBSTRING}' for {SCAN_TIMEOUT_SEC} seconds...")
        # --- THIS IS THE CORRECTED LINE ---
        scanner = BleakScanner(detection_callback=detection_callback)
        await scanner.start()
        await asyncio.sleep(SCAN_TIMEOUT_SEC)
        await scanner.stop()
        print("Scan cycle finished. Waiting before next scan...")
        await asyncio.sleep(5) # Wait 5 seconds before the next scan

def run_ble_scanner_in_thread():
    """Runs the asyncio event loop in a separate thread."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(scan_for_devices())

# --- Flask API Endpoint ---
@app.route('/get_ble_data', methods=['GET'])
def get_ble_data():
    """Endpoint for the React app to fetch the latest device data."""
    print("Data requested from React app. Sending:", latest_ble_data)
    return jsonify(latest_ble_data)

if __name__ == "__main__":
    # Start the BLE scanner in a background thread so it doesn't block the web server
    ble_thread = threading.Thread(target=run_ble_scanner_in_thread, daemon=True)
    ble_thread.start()
    
    # Start the Flask web server
    app.run(port=5001, debug=True)