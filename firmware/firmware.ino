#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>

// WiFi Settings
const char* ssid = "DESKTOP-O41GSSF 8493";
const char* password = "123456789";

// Firebase Settings
#define API_KEY "AIzaSyC3hBiCo-jwu_JJLsDvDO5XU05M7KhNQLk"
#define DATABASE_URL "https://smartparkingsystem-8055-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define USER_EMAIL "245123749025@mvsrec.edu.in"
#define USER_PASSWORD "Login#789"

// Firebase Core Objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Pins Config
const int TRIG1 = D1;
const int ECHO1 = D2;
const int TRIG2 = D3;
const int ECHO2 = D5;

const int RED1 = D4;
const int GREEN1 = D8;
const int RED2 = D6;
const int GREEN2 = D7;

const int threshold = 7; // Distance threshold in cm for occupancy

void setup() {
  Serial.begin(115200);

  // Set pin modes
  pinMode(TRIG1, OUTPUT);
  pinMode(ECHO1, INPUT);
  pinMode(TRIG2, OUTPUT);
  pinMode(ECHO2, INPUT);
  
  pinMode(RED1, OUTPUT);
  pinMode(GREEN1, OUTPUT);
  pinMode(RED2, OUTPUT);
  pinMode(GREEN2, OUTPUT);

  // Default LEDs to OFF
  digitalWrite(RED1, LOW);
  digitalWrite(GREEN1, LOW);
  digitalWrite(RED2, LOW);
  digitalWrite(GREEN2, LOW);

  // Connect to WiFi network
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  // Configure Firebase Client
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("Firebase Connected!");
}

// Function to read ultrasonic distance
float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) return 100.0; // Return arbitrary large distance if no echo
  
  return duration * 0.034 / 2;
}

void loop() {
  float dist1 = getDistance(TRIG1, ECHO1);
  float dist2 = getDistance(TRIG2, ECHO2);

  Serial.print("Dist 1: ");
  Serial.print(dist1);
  Serial.print(" cm | Dist 2: ");
  Serial.print(dist2);
  Serial.println(" cm");

  // Check occupancy
  int slot1 = (dist1 > 0 && dist1 < threshold) ? 1 : 0;
  int slot2 = (dist2 > 0 && dist2 < threshold) ? 1 : 0;

  // Handle Slot 1 LEDs indicator
  if (slot1 == 1) {
    digitalWrite(RED1, HIGH);
    digitalWrite(GREEN1, LOW);
    Serial.println("Slot 1 is Occupied");
  } else {
    digitalWrite(RED1, LOW);
    digitalWrite(GREEN1, HIGH);
    Serial.println("Slot 1 is Available");
  }

  // Handle Slot 2 LEDs indicator
  if (slot2 == 1) {
    digitalWrite(RED2, HIGH);
    digitalWrite(GREEN2, LOW);
    Serial.println("Slot 2 is Occupied");
  } else {
    digitalWrite(RED2, LOW);
    digitalWrite(GREEN2, HIGH);
    Serial.println("Slot 2 is Available");
  }

  // Upload values to Firebase Realtime Database
  if (Firebase.ready()) {
    Firebase.RTDB.setInt(&fbdo, "/parking/slot1", slot1);
    Firebase.RTDB.setInt(&fbdo, "/parking/slot2", slot2);
    Serial.println("Sync to Firebase complete!");
  } else {
    Serial.println("Firebase not ready");
  }

  Serial.println("--------------------");
  delay(2000);
}
