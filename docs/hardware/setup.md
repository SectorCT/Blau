# Blau Hardware Setup — Arduino UNO Q + Modulino Thermo

A standalone field probe that posts real ambient measurements to Blau over
WiFi. The Uno Q's Linux side runs a Python brick that calls the MCU over
`Arduino_RouterBridge` and `POST`s straight to `/api/measurements/`.

The Electron / web client doesn't need to be in the data path — new
measurements show up in the normal **My Measurements** list once the device
saves them.

## Bill of materials

- Arduino UNO Q (ABX00173) — Qualcomm QRB2210 (Debian Linux) + STM32U585
  (Zephyr) dual-brain SBC
- Arduino Modulino Thermo (ABX00103, HS3003 @ I²C 0x44)
- Qwiic / STEMMA QT cable (or 4 jumper wires for SDA / SCL / 3V3 / GND)
- USB-C cable for power
- One jumper wire (or push button) for the trigger pin
- HDMI display + USB keyboard, **or** a laptop with `adb` installed, for the
  initial Linux-side configuration. Once SSH is up the cable can be removed.

## Wiring

1. Plug the Modulino Thermo into any Qwiic port on the Uno Q.
2. Wire one end of a jumper to **D7** and leave the other end loose — touch it
   to **GND** to trigger a measurement. (Or solder a real momentary button.)
3. Power the Uno Q with USB-C.

## Why this setup (and why we don't use the USB serial path)

On the Uno Q the global `Serial` object on the MCU is **not** the USB CDC
channel. Sketches that print to `Serial` (or even to `Monitor` from
`Arduino_RouterBridge`) cannot be observed reliably from the IDE's Serial
Monitor on macOS, Windows, or Linux without going through `arduino-app-cli`.
Instead of fighting that pipeline we treat the Uno Q as what it actually
is — a Linux SBC with WiFi. Python on the Linux side does the I/O, talks to
the sensor through `Arduino_RouterBridge` RPC, and POSTs to the backend
directly.

Sources for the Serial / Monitor quirk:
<https://forum.arduino.cc/t/uno-q-serial-as-monitor-alias/1435776>,
<https://forum.arduino.cc/t/arduino-uno-q-via-ide-no-serial-monitor-output/1411255>.

## Phase 0 — Linux-side preparation

Plug the Uno Q in and wait ~30 s for the heartbeat pattern on the LED matrix.

### Get a shell on the Linux side

Either:

- (a) Plug a display + USB keyboard. Default GNOME desktop, log in as
  user `arduino` / password `arduino`. Open a terminal.
- (b) From a laptop with `adb` installed (`brew install android-platform-tools`
  on macOS, `sudo apt install adb` on Debian/Ubuntu), connect via USB-C and
  run `adb shell`.

**Change the password immediately:** `passwd`.

### Connect to WiFi

```bash
sudo nmcli dev wifi connect "<SSID>" password "<PASSWORD>"
hostname -I            # note the IP address
```

> Use a **phone hotspot** at the venue. Conference WiFi often blocks port
> 8000, has captive portals, or NATs in ways that break inbound discovery
> from the laptop.

### Enable SSH (highly recommended)

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

From the laptop: `ssh arduino@<UNO_Q_IP>`.

### Verify the backend is reachable

```bash
curl -v http://164.92.135.203:8000/api/auth/login/ \
     -H 'Content-Type: application/json' \
     -d '{"email":"<test_user>","password":"<test_pwd>"}'
```

Expect HTTP 200 and a `token` in the JSON body. If this fails, fix the
network before continuing.

> **Do not run `sudo apt upgrade`** during demo prep. A known forum issue
> reports that newer Linux images break the `Modulino` Arduino library —
> stay on the shipped image.

## Phase 1 — Deploy the app

From a clone of this repository on your laptop (replace `<UNO_Q_IP>` with the
address you noted above):

```bash
scp -r firmware/blau_uno_q_app arduino@<UNO_Q_IP>:~/ArduinoApps/
ssh arduino@<UNO_Q_IP>
cd ~/ArduinoApps/blau_uno_q_app
cp .env.example .env
nano .env       # fill in BLAU_USERNAME and BLAU_PASSWORD with a real Blau account
arduino-app-cli app start ~/ArduinoApps/blau_uno_q_app
```

The first start compiles the MCU sketch, flashes the STM32 side, installs
`requests`, and launches `python/main.py` as a service.

To stream logs:

```bash
arduino-app-cli app logs ~/ArduinoApps/blau_uno_q_app
```

To stop / restart:

```bash
arduino-app-cli app stop  ~/ArduinoApps/blau_uno_q_app
arduino-app-cli app start ~/ArduinoApps/blau_uno_q_app
```

## Phase 2 — Smoke test

You should see:

```
Blau Field Station starting; backend=http://164.92.135.203:8000 user=...
```

Touch the loose end of the **D7 → GND** jumper. Within a second or two the
log shows:

```
Button pressed → triggering measurement
Reading: temp=22.6 °C, humidity=44.7 %
Logging into Blau backend at http://164.92.135.203:8000 …
Login OK
✓ Measurement saved: <uuid>
```

The on-board LED stays solid while reading and blinks 3× on a successful
POST. The new measurement appears in the Blau **My Measurements** list and
can be selected in **New Filter**.

## What's real vs demo

| Field             | Source                                                     |
| ----------------- | ---------------------------------------------------------- |
| `temperature`     | HS3003 ambient temperature, median of 5 reads (real)       |
| `parameters.HUM`  | HS3003 relative humidity, median of 5 reads (real)         |
| `ph`              | Static demo constant `7.4` (no waterproof pH probe in BOM) |

The protocol accepts arbitrary `parameterCode` values, so plugging in a real
pH or EC probe later is a sensor-wiring + a few-line firmware change.

## Troubleshooting

| Symptom                                            | Likely cause / fix                                           |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `BLAU_USERNAME / BLAU_PASSWORD not set` in logs    | `.env` missing or not read; `cd` into the app dir before `app start` |
| `requests.exceptions.ConnectTimeout`               | WiFi or backend unreachable; re-run the `curl` test          |
| HTTP 401 even with correct creds                   | Account locked or wrong email; try logging in via the web UI |
| MCU sketch fails to compile (`Modulino.h` missing) | Linux image was upgraded; reflash a clean image, or fall back to direct I²C reads of HS3003 (see `Wire`-based path in earlier git history) |
| Button presses ignored                             | Hold the jumper to GND for ~200 ms; debounce window is 1.5 s |
| Multiple presses produce only one measurement      | Cooldown window (3 s after a successful POST) is intentional |

## Demo narrative (HackUPC)

> "Blau Field Station is an Arduino UNO Q with a Modulino Thermo sensor.
> The Linux side of the board runs a Python service that, on a button press,
> reads temperature and humidity from the HS3003 and POSTs straight to our
> backend over WiFi. No laptop in the data path. Behind me you can see the
> measurement appearing in the Blau UI in real time, and from there the
> filter generation flow is identical to the manual entry demo."

> Honest note for the jury: temperature and humidity are real sensor
> readings; pH is a static placeholder because we didn't have a waterproof
> pH probe — the protocol accepts arbitrary parameters, so adding a real
> probe is plug-and-play.
