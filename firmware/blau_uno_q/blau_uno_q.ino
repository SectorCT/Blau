// Blau — Environmental Context Station
// Hardware: Arduino Uno Q (STM32U585 + Zephyr core) + Modulino Thermo (HS3003 @ I2C 0x44)
// Protocol: docs/hardware/esp32-usb-protocol.md (newline-delimited JSON @ 115200 8N1)
//
// IMPORTANT: On Uno Q the global `Serial` object talks over UART pins 0/1,
// NOT the USB CDC channel that the Arduino IDE Serial Monitor and the
// desktop client use. USB CDC traffic must go through the `Monitor` object
// from the Arduino_RouterBridge library. See:
//   https://forum.arduino.cc/t/uno-q-serial-as-monitor-alias/1435776
//   https://forum.arduino.cc/t/arduino-uno-q-via-ide-no-serial-monitor-output/1411255
// A future Arduino release will alias `Serial → Monitor`; until then, use Monitor.
//
// We also avoid the Modulino library (written for Uno R4 / Renesas) and read
// the HS3003 sensor directly over I2C with the standard Wire library.

#include <Arduino_RouterBridge.h>
#include <Wire.h>
#include <ArduinoJson.h>

// HS3003 (Modulino Thermo) sits on the Qwiic bus at address 0x44.
const uint8_t HS3003_ADDR = 0x44;

// Wet/dry detection: pin D2 shorted to GND, OR humidity above threshold.
const int   WET_PROBE_PIN          = 2;
const float HUMIDITY_WET_THRESHOLD = 60.0;
const float DEMO_PH                = 7.4;
const char* DEVICE_FILE_TAG        = "blau_uno_q";

String inputBuffer;
unsigned long lastHeartbeatMs = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 5000;

static float median5(float v[5]) {
  for (int i = 1; i < 5; i++) {
    float key = v[i];
    int j = i - 1;
    while (j >= 0 && v[j] > key) { v[j + 1] = v[j]; j--; }
    v[j + 1] = key;
  }
  return v[2];
}

static float round1(float v) { return roundf(v * 10.0f) / 10.0f; }

// Trigger a measurement on HS3003 (Measurement Request mode = address-only write).
static void hs3003_request() {
  Wire.beginTransmission(HS3003_ADDR);
  Wire.endTransmission();
}

// Read one (temp_c, hum_pct) sample from HS3003. Returns false on bus error.
// HS3003 frame layout (4 bytes):
//   [0] status(2 bits) | humidity high (6 bits)
//   [1] humidity low (8 bits)
//   [2] temperature high (8 bits)
//   [3] temperature mid (6 bits) | unused (2 bits)
static bool hs3003_read(float& temp_c, float& hum_pct) {
  hs3003_request();
  delay(40);  // datasheet: typical conversion time 33ms; round up to 40ms

  uint8_t got = Wire.requestFrom((int)HS3003_ADDR, 4);
  if (got < 4) return false;

  uint8_t b0 = Wire.read();
  uint8_t b1 = Wire.read();
  uint8_t b2 = Wire.read();
  uint8_t b3 = Wire.read();

  uint16_t hum_raw  = ((uint16_t)(b0 & 0x3F) << 8) | b1;
  uint16_t temp_raw = ((uint16_t)b2 << 6) | (b3 >> 2);

  hum_pct = (float)hum_raw / 16383.0f * 100.0f;
  temp_c  = (float)temp_raw / 16383.0f * 165.0f - 40.0f;
  return true;
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(WET_PROBE_PIN, INPUT_PULLUP);

  Monitor.begin();

  // Startup banner — confirms the sketch is running.
  Monitor.println("{\"type\":\"BOOT\",\"device\":\"blau_uno_q\",\"protocol\":\"v1\"}");

  Wire.begin();
  // Quick I2C ping so the boot banner reports sensor presence.
  Wire.beginTransmission(HS3003_ADDR);
  uint8_t pingErr = Wire.endTransmission();
  Monitor.print("{\"type\":\"INFO\",\"sensor\":\"HS3003\",\"i2cAck\":");
  Monitor.print(pingErr == 0 ? "true" : "false");
  Monitor.println("}");

  lastHeartbeatMs = millis();
}

void loop() {
  while (Monitor.available()) {
    char c = Monitor.read();
    if (c == '\n') {
      if (inputBuffer.length() > 0) handleLine(inputBuffer);
      inputBuffer = "";
    } else if (c != '\r') {
      inputBuffer += c;
      if (inputBuffer.length() > 512) inputBuffer = "";
    }
  }

  // Heartbeat so we can confirm the loop is alive even without commands.
  unsigned long now = millis();
  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = now;
    Monitor.print("{\"type\":\"HEARTBEAT\",\"uptimeMs\":");
    Monitor.print(now);
    Monitor.println("}");
  }
}

void handleLine(const String& line) {
  StaticJsonDocument<256> req;
  if (deserializeJson(req, line)) {
    Monitor.println("{\"type\":\"ERROR\",\"reason\":\"json_parse_failed\"}");
    return;
  }

  const char* cmd = req["cmd"] | "";
  if (strcmp(cmd, "READ_MEASUREMENT") != 0) {
    Monitor.print("{\"type\":\"ERROR\",\"reason\":\"unknown_cmd\",\"cmd\":\"");
    Monitor.print(cmd);
    Monitor.println("\"}");
    return;
  }

  String requestId = String((const char*)(req["requestId"] | ""));

  // 1. ACK
  digitalWrite(LED_BUILTIN, HIGH);
  StaticJsonDocument<128> ack;
  ack["type"]      = "ACK";
  ack["requestId"] = requestId;
  serializeJson(ack, Monitor);
  Monitor.print('\n');

  // 2. Median-of-5 reads from HS3003.
  float temps[5], hums[5];
  bool sensorOk = true;
  for (int i = 0; i < 5; i++) {
    float t, h;
    if (!hs3003_read(t, h)) {
      sensorOk = false;
      break;
    }
    temps[i] = t;
    hums[i]  = h;
    delay(20);
  }

  StaticJsonDocument<512> resp;
  resp["type"]      = "MEASUREMENT";
  resp["requestId"] = requestId;

  if (!sensorOk) {
    resp["status"] = "DRY";
    resp["reason"] = "sensor_read_failed";
    serializeJson(resp, Monitor);
    Monitor.print('\n');
    digitalWrite(LED_BUILTIN, LOW);
    return;
  }

  float t = median5(temps);
  float h = median5(hums);

  bool probeShorted = (digitalRead(WET_PROBE_PIN) == LOW);
  bool wet = probeShorted || (h > HUMIDITY_WET_THRESHOLD);

  if (!wet) {
    resp["status"] = "DRY";
    resp["reason"] = "probes_not_wet";
  } else {
    resp["status"] = "WET";
    JsonObject m = resp.createNestedObject("measurement");
    m["source"]      = "lab_equipment";
    m["temperature"] = round1(t);
    m["ph"]          = DEMO_PH;

    JsonArray params = m.createNestedArray("parameters");

    JsonObject pHum = params.createNestedObject();
    pHum["file"]          = DEVICE_FILE_TAG;
    pHum["parameterCode"] = "HUM";
    pHum["parameterName"] = "Relative Humidity";
    pHum["unit"]          = "%";
    pHum["value"]         = round1(h);
  }

  serializeJson(resp, Monitor);
  Monitor.print('\n');

  digitalWrite(LED_BUILTIN, LOW);
}
