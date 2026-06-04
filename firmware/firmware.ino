#include <FB_Const.h>
#include <FB_Error.h>
#include <FB_Network.h>
#include <FB_Utils.h>
#include <Firebase.h>
#include <FirebaseFS.h>
#include <Firebase_ESP_Client.h>

#include <FB_Const.h>
#include <FB_Error.h>
#include <FB_Network.h>
#include <FB_Utils.h>
#include <Firebase.h>
#include <FirebaseFS.h>
#include <Firebase_ESP_Client.h>

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>

// ================= WIFI =================
#define WIFI_SSID "DESKTOP-O41GSSF 8493"
#define WIFI_PASSWORD "123456789"

// ================= FIREBASE =================
#define API_KEY "AIzaSyC3hBiCo-jwu_JJLsDvDO5XU05M7KhNQLk"
#define DATABASE_URL "https://smartparkingsystem-8055-default-rtdb.asia-southeast1.firebasedatabase.app/"

// 🔐 Firebase Login
#define USER_EMAIL "245123749025@mvsrec.edu.in"
#define USER_PASSWORD "Login#789"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ===== SENSOR PINS =====
#define TRIG1 D1
#define ECHO1 D2
#define TRIG2 D3
#define ECHO2 D5

// ===== LED PINS =====
#define RED1 D4
#define GREEN1 D8
#define RED2 D6
#define GREEN2 D7

#define THRESHOLD 7  // cm

// ================= DISTANCE FUNCTION =================
float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) return 100;  // no object detected

  float distance = duration * 0.034 / 2;
  return distance;
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\nSystem Starting...");

  // Sensor pins
  pinMode(TRIG1, OUTPUT);
  pinMode(ECHO1, INPUT);
  pinMode(TRIG2, OUTPUT);
  pinMode(ECHO2, INPUT);

  // LED pins
  pinMode(RED1, OUTPUT);
  pinMode(GREEN1, OUTPUT);
  pinMode(RED2, OUTPUT);
  pinMode(GREEN2, OUTPUT);

  // Turn OFF LEDs
  digitalWrite(RED1, LOW);
  digitalWrite(GREEN1, LOW);
  digitalWrite(RED2, LOW);
  digitalWrite(GREEN2, LOW);

  // ===== WIFI CONNECTION =====
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int timeout = 0;

  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    Serial.print(".");
    delay(500);
    timeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi FAILED! Check SSID/password");
  }

  // ===== FIREBASE SETUP =====
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  config.token_status_callback = nullptr;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase Ready!");
}

// ================= LOOP =================
void loop() {

  float d1 = getDistance(TRIG1, ECHO1);
  float d2 = getDistance(TRIG2, ECHO2);

  Serial.print("Distance1: ");
  Serial.print(d1);
  Serial.print(" cm | Distance2: ");
  Serial.println(d2);

  int slot1 = 0;
  int slot2 = 0;

  // ===== SLOT 1 =====
  if (d1 > 0 && d1 < THRESHOLD) {
    digitalWrite(RED1, HIGH);
    digitalWrite(GREEN1, LOW);
    slot1 = 1;
    Serial.println("Slot 1: OCCUPIED");
  } else {
    digitalWrite(RED1, LOW);
    digitalWrite(GREEN1, HIGH);
    slot1 = 0;
    Serial.println("Slot 1: AVAILABLE");
  }

  // ===== SLOT 2 =====
  if (d2 > 0 && d2 < THRESHOLD) {
    digitalWrite(RED2, HIGH);
    digitalWrite(GREEN2, LOW);
    slot2 = 1;
    Serial.println("Slot 2: OCCUPIED");
  } else {
    digitalWrite(RED2, LOW);
    digitalWrite(GREEN2, HIGH);
    slot2 = 0;
    Serial.println("Slot 2: AVAILABLE");
  }

  // ===== SEND TO FIREBASE =====
  if (Firebase.ready() && WiFi.status() == WL_CONNECTED) {

    bool s1 = Firebase.RTDB.setInt(&fbdo, "/parking/slot1", slot1);
    bool s2 = Firebase.RTDB.setInt(&fbdo, "/parking/slot2", slot2);

    if (s1 && s2) {
      Serial.println("Firebase Update SUCCESS");
    } else {
      Serial.print("Firebase Error: ");
      Serial.println(fbdo.errorReason());
    }

  } else {
    Serial.println("Firebase/WiFi not ready");
  }

  Serial.println("----------------------");
  delay(2000);
}
