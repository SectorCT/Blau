# Blau Hardware Setup — Arduino Uno Q + Modulino Thermo

A field probe that ingests real ambient temperature and humidity into Blau via
the USB serial protocol described in `esp32-usb-protocol.md`. Uses the
desktop app's existing USB import flow — no extra script required.

## Bill of materials

- Arduino Uno Q (ABX00173)
- Arduino Modulino Thermo (ABX00103, HS3003 @ I²C 0x44)
- Qwiic / STEMMA QT cable (or 4 jumper wires for SDA / SCL / 3V3 / GND)
- USB-C cable
- Optional: a single jumper wire for the wet-probe trigger

## Wiring

1. Plug the Modulino Thermo into any Qwiic port on the Uno Q.
2. Connect the Uno Q to the laptop with USB-C.

That's the entire build.

## Firmware

1. In Arduino IDE, install the Uno Q core:
   - Select **Tools → Board → Arduino UNO Q**. The IDE prompts:
     *"The 'Arduino UNO Q Board [v 0.54.1]' core has to be installed…"* — click
     **YES**. This installs the **Zephyr Community Boards (BETA)** package
     (Uno Q runs on a Zephyr-based core, not the Renesas RA core used by
     Uno R4). Decline the "Updates are available for some of your boards"
     prompt.
2. Install libraries from **Sketch → Include Library → Manage Libraries**:
   - **Arduino_RouterBridge** by Arduino (provides the `Monitor` object —
     required for USB CDC output on Uno Q; see note below)
   - **ArduinoJson** by Benoit Blanchon (6.x or 7.x both fine)
3. Open `firmware/blau_uno_q/blau_uno_q.ino`, select the Uno Q board and the
   correct port, and upload.

> **Uno Q quirk — `Serial` vs `Monitor`:** On the Uno Q the global `Serial`
> object is wired to UART pins 0/1 on the headers, **not** to the USB CDC
> channel that the IDE Serial Monitor and the desktop client use. USB CDC
> traffic must go through the `Monitor` object from
> `Arduino_RouterBridge.h`. A future Arduino release will alias
> `Serial → Monitor`; until then, our firmware uses `Monitor` exclusively.
> See: <https://forum.arduino.cc/t/uno-q-serial-as-monitor-alias/1435776>.
3. The on-board LED is off while idle and lights up briefly while a
   measurement is being read.

## Triggering a "wet" reading

The device classifies WET vs DRY from either of:

- **Wet-probe pin** — short pin **D2** to **GND** (a single jumper wire works).
- **Humidity threshold** — exhale near the Modulino so RH rises above 60%.

Either condition flips the response from `status: "DRY"` to `status: "WET"`.

## Importing into Blau

The desktop app already speaks this protocol (see
`client/src/main/index.ts` → `LabEquipmentService` and the
**USB Entry** panel on the Add Measurement page).

1. Start the Blau backend and desktop app, log in.
2. Open **Add measurement → USB**.
3. Select the Uno Q port, click **Connect device**.
4. Click **Request Measurement**. Hold the wet trigger when the panel says
   "Waiting for probes to get wet".
5. Inspect the readings, then click **Save measurement** to POST to
   `/api/measurements/`. The returned `measurementId` shows up in the panel
   and is then selectable in **New Filter**.

## What's real vs demo

| Field | Source |
| --- | --- |
| `temperature` | HS3003 ambient temperature (real, median-of-5) |
| `parameters.HUM` | HS3003 relative humidity (real, median-of-5) |
| `ph` | Static demo constant `7.4` (no waterproof pH probe available) |

In the pitch we say so out loud — temperature and humidity are real readings;
pH is a demo placeholder. The protocol accepts arbitrary `parameterCode`s, so
adding a real pH or EC probe later is purely a wiring + firmware change.

## Debugging without the desktop app

Use the Arduino IDE's **Serial Monitor** at 115200 baud, "Newline" line ending.
Send the following line to simulate the desktop request:

```
{"cmd":"READ_MEASUREMENT","requestId":"test-1"}
```

The device should reply with one ACK line and then one MEASUREMENT line. If
not, see the troubleshooting checklist in `firmware/blau_uno_q/blau_uno_q.ino`.
