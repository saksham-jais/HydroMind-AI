/*
 * HydroMind AI — ESP32 + HC-SR04 Groundwater Sensor
 *
 * Measures water level in a tank/well, sends to Firebase and HydroMind API.
 * Hardware alert: Green (safe) / Yellow (warning) / Red + Buzzer (critical)
 *
 * Wiring:
 *   HC-SR04 TRIG -> GPIO 12
 *   HC-SR04 ECHO -> GPIO 13
 *   Red LED      -> GPIO 25
 *   Green LED    -> GPIO 26
 *   Yellow LED   -> GPIO 27
 *   Buzzer       -> GPIO 14
 *
 * Libraries: WiFi, HTTPClient, ArduinoJson
 */

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

// --- Configuration (update before flashing) ---
const char *WIFI_SSID = "Airtel_saks_8214";
const char *WIFI_PASS = "Air@35822";
const char *FIREBASE_HOST =
    "https://"
    "hydromind-ai-2116e-default-rtdb.asia-southeast1.firebasedatabase.app";
const char *FIREBASE_AUTH = "TaODOBhlleN8cQFI0KksRz6mv5II3hmwQLD3CtfR";
const char *API_URL = "http://192.168.1.11:8000/api/iot/reading";
const char *VILLAGE_ID = "v1";

// Sensor pins
const int TRIG_PIN = 12;
const int ECHO_PIN = 13;
const int LED_RED = 25;
const int LED_GREEN = 27;
const int LED_YELLOW = 26;
const int BUZZER_PIN = 14;

// Tank calibration (cm from sensor to bottom of tank)
const float TANK_DEPTH_CM = 9.2; // 9.2 cm baseline
const float CM_TO_FT = 0.0328084;

// Alert Thresholds (distance from sensor to object/water in cm)
const float DIST_RED_MIN = 7.0;    // >= 8 cm = Red + Buzzer (empty tank)
const float DIST_YELLOW_MIN = 4.0; // 4-8 cm = Yellow (getting full)
// < 5 cm = Green (full tank)

const unsigned long READ_INTERVAL_MS = 1000;

unsigned long lastRead = 0;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

float measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0)
    return -1;
  return duration * 0.034 / 2.0;
}

float waterLevelFt(float distanceCm) {
  float waterDepthCm = TANK_DEPTH_CM - distanceCm;
  if (waterDepthCm < 0)
    waterDepthCm = 0;
  return waterDepthCm * CM_TO_FT;
}

void setAlert(float distanceCm) {
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  if (distanceCm >= DIST_RED_MIN) {
    digitalWrite(LED_RED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
  } else if (distanceCm >= DIST_YELLOW_MIN) {
    digitalWrite(LED_YELLOW, HIGH);
  } else {
    digitalWrite(LED_GREEN, HIGH);
  }
}

void sendToFirebase(float waterLevel) {
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/readings/" + VILLAGE_ID +
               ".json?auth=" + FIREBASE_AUTH;

  JsonDocument doc;
  doc["villageId"] = VILLAGE_ID;
  doc["waterLevel"] = waterLevel;
  doc["sensorId"] = "HC-SR04";
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(payload);
  Serial.printf("Firebase POST: %d\n", code);
  http.end();
}

void sendToApi(float waterLevel) {
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["villageId"] = VILLAGE_ID;
  doc["waterLevel"] = waterLevel;
  doc["sensorId"] = "HC-SR04";

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  Serial.printf("API POST: %d\n", code);
  http.end();
}

void loop() {
  if (millis() - lastRead < READ_INTERVAL_MS)
    return;
  lastRead = millis();

  float dist = measureDistanceCm();
  if (dist < 0) {
    Serial.println("Sensor error");
    return;
  }

  float level = waterLevelFt(dist);
  Serial.printf("Distance: %.1f cm | Water level: %.1f ft\n", dist, level);

  setAlert(dist);
  sendToFirebase(level);
  sendToApi(level);
}
