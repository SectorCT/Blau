# ESP32 USB Measurement Protocol

This protocol is used between the Blau desktop app and the field probe MCU
over USB serial. Today the probe is built around an ESP32 with a moisture
sense electrode plus a small parameter battery; the same protocol scales to
any MCU that can speak newline-delimited JSON over USB CDC.

## Serial Settings

- Baud rate: `115200`
- Framing: `8N1`
- Message format: newline-delimited JSON (`\n`)

## Request

Desktop sends:

```json
{ "cmd": "READ_MEASUREMENT", "requestId": "uuid-string" }
```

## Responses

ESP may send an ACK first:

```json
{ "type": "ACK", "requestId": "uuid-string" }
```

Then exactly one terminal response:

- Dry:

```json
{ "type": "MEASUREMENT", "requestId": "uuid-string", "status": "DRY", "reason": "probes_not_wet" }
```

- Wet:

```json
{
  "type": "MEASUREMENT",
  "requestId": "uuid-string",
  "status": "WET",
  "measurement": {
    "source": "lab_equipment",
    "temperature": 21.4,
    "ph": 7.63,
    "parameters": [
      {
        "file": "blau-probe-esp32",
        "parameterCode": "EC",
        "parameterName": "Electrical Conductance",
        "unit": "uS/cm",
        "value": 422
      }
    ]
  }
}
```

## Calibration Ranges

The firmware uses these ranges (drawn from the GFQA p5–p95 envelope for
European surface waters) to validate sensor reads before reporting them as
`WET`. Out-of-range samples are flagged for manual review.

- `temperature`: `6.0` to `28.0` (`TEMP`, deg C)
- `ph`: `6.5` to `8.5` (`pH`, dimensionless)
- `EC`: `50` to `2000` (`uS/cm`)
- `O2-Dis`: `3.0` to `13.0` (`mg/l`)
- `TURB`: `0.5` to `50.0` (`NTU`)
- `Cl-Tot`: `2.0` to `300.0` (`mg/l`)

## Hardware Team Checklist

- Keep pulsed sensor power from `powerPin` to reduce corrosion.
- Use median-of-5 ADC reads for wet/dry classification.
- Calibrate threshold per probe batch (dry and wet histograms).
- Maintain stable ground and sensor wiring.
- Return one terminal JSON per request.
