#include "esp_camera.h"
#include <WiFi.h>
#include <WebSocketsClient.h>

// ===== WIFI =====
const char* ssid = "DESKTOP-O41GSSF 8493";
const char* password = "123456789";

// ===== SERVER =====
const char* server_ip = "192.168.187.26";  // 🔥 PUT YOUR PC IP HERE
const int server_port = 8765;

// ===== CAMERA PINS (AI THINKER) =====
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_CONNECTED:
            Serial.println("✅ Connected to server");
            break;
        case WStype_DISCONNECTED:
            Serial.println("❌ Disconnected");
            break;
    }
}

void setup() {
    Serial.begin(115200);

    // ===== CAMERA CONFIG =====
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;

    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    // 🔥 IMPORTANT (LOW RES FOR WEBSOCKET)
    config.frame_size = FRAMESIZE_VGA; // 160x120
    config.jpeg_quality = 10;
    config.fb_count = 1;

    if (esp_camera_init(&config) != ESP_OK) {
        Serial.println("Camera init failed");
        return;
    }

    // ===== WIFI =====
    WiFi.begin(ssid, password);
    WiFi.setSleep(false);

    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nConnected!");

    // ===== WEBSOCKET =====
    webSocket.begin(server_ip, server_port, "/");
    webSocket.setReconnectInterval(5000);

  webSocket.onEvent(webSocketEvent);

    
}

void loop() {
    webSocket.loop();

    // Capture frame
    camera_fb_t * fb = esp_camera_fb_get();

    if (fb) {
        webSocket.sendBIN(fb->buf, fb->len);
        esp_camera_fb_return(fb);
    }

    delay(100); // 🔥 control FPS (IMPORTANT)
}
