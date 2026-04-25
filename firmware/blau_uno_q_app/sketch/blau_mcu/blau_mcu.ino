// Blau Field Station — MCU side (STM32U585 / Zephyr core).
// Exposes Modulino Thermo (HS3003 @ I2C 0x44) reads + button + LED to the
// Linux-side Python brick via Arduino_RouterBridge RPC.

#include <Arduino.h>
#include <Modulino.h>
#include <Arduino_RouterBridge.h>

ModulinoThermo thermo;

// D7 is a free GPIO on the Uno Q headers. We avoid D0/D1 (UART) and D2 just
// in case the Bridge handshake uses it on some firmware revisions. Wire one
// end of a jumper to D7 and touch the other end to GND to trigger.
const int BUTTON_PIN = 7;

static float median5(float v[5]) {
  for (int i = 1; i < 5; i++) {
    float key = v[i];
    int j = i - 1;
    while (j >= 0 && v[j] > key) { v[j + 1] = v[j]; j--; }
    v[j + 1] = key;
  }
  return v[2];
}

float read_temperature() {
  float samples[5];
  for (int i = 0; i < 5; i++) {
    samples[i] = thermo.getTemperature();
    delay(20);
  }
  return median5(samples);
}

float read_humidity() {
  float samples[5];
  for (int i = 0; i < 5; i++) {
    samples[i] = thermo.getHumidity();
    delay(20);
  }
  return median5(samples);
}

bool is_button_pressed() {
  // Hardware debounce: sample twice 20 ms apart, only report pressed when
  // both reads agree. The Python loop polls at 5 Hz, so a real press is
  // sampled multiple times — single-bounce false positives are filtered out.
  if (digitalRead(BUTTON_PIN) != LOW) return false;
  delay(20);
  return digitalRead(BUTTON_PIN) == LOW;
}

bool set_led(bool on) {
  digitalWrite(LED_BUILTIN, on ? HIGH : LOW);
  return on;
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  Modulino.begin();
  thermo.begin();

  // Bridge.begin() last so all RPC handlers are registered before the Linux
  // side can call them. If the Linux brick fires a Bridge.call between MCU
  // boot and provide(), the call returns no-handler instead of garbage.
  Bridge.provide("read_temperature", read_temperature);
  Bridge.provide("read_humidity", read_humidity);
  Bridge.provide("is_button_pressed", is_button_pressed);
  Bridge.provide("set_led", set_led);
  Bridge.begin();
}

void loop() {
  delay(10);
}
