// Minimal Serial diagnostic for Arduino Uno Q (STM32U585 + Zephyr core).
//
// IMPORTANT: On Uno Q, the global `Serial` object is wired to UART pins 0/1,
// NOT to the USB CDC channel that the Arduino IDE Serial Monitor uses.
// USB CDC traffic goes through the `Monitor` object provided by the
// Arduino_RouterBridge library. This is documented at:
//   https://forum.arduino.cc/t/uno-q-serial-as-monitor-alias/1435776
//   https://forum.arduino.cc/t/arduino-uno-q-via-ide-no-serial-monitor-output/1411255
// A future Arduino release will alias Serial → Monitor; until then, use Monitor.
//
// Expected: every second, the on-board LED blinks AND a line is printed.

#include <Arduino_RouterBridge.h>

const unsigned long INTERVAL_MS = 1000;
unsigned long lastTickMs = 0;
unsigned long tickCount = 0;
bool ledOn = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Monitor.begin();
  Monitor.println("HELLO from blau_uno_q");
}

void loop() {
  unsigned long now = millis();
  if (now - lastTickMs >= INTERVAL_MS) {
    lastTickMs = now;
    tickCount++;
    ledOn = !ledOn;
    digitalWrite(LED_BUILTIN, ledOn ? HIGH : LOW);
    Monitor.print("tick ");
    Monitor.println(tickCount);
  }
}
