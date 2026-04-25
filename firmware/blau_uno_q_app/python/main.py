import logging
import math
import os
import time

import requests

# Provided by the App Lab runtime on the Uno Q's Linux side; not installable
# via pip, so static analyzers on a dev laptop will flag this import.
from arduino.app_utils import App, Bridge  # type: ignore[import-not-found]

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("blau")

API_BASE = os.getenv("BLAU_API_BASE", "http://164.92.135.203:8000").rstrip("/")
USERNAME = os.getenv("BLAU_USERNAME", "")
PASSWORD = os.getenv("BLAU_PASSWORD", "")
DEMO_PH = float(os.getenv("BLAU_DEMO_PH", "7.4"))
NAME_PREFIX = os.getenv("BLAU_NAME_PREFIX", "Field measurement")

POLL_INTERVAL_S = 0.2
DEBOUNCE_S = 1.5
COOLDOWN_AFTER_POST_S = 3.0
HTTP_TIMEOUT_S = 10

_token: str | None = None
_last_press_at = 0.0
_measurement_count = 0


def login() -> str:
    log.info("Logging into Blau backend at %s …", API_BASE)
    r = requests.post(
        f"{API_BASE}/api/auth/login/",
        json={"email": USERNAME, "password": PASSWORD},
        timeout=HTTP_TIMEOUT_S,
    )
    if r.status_code != 200:
        log.error("Login failed (HTTP %s): %s", r.status_code, r.text[:300])
        r.raise_for_status()
    token = r.json()["token"]
    log.info("Login OK")
    return token


def ensure_token() -> str:
    global _token
    if _token is None:
        _token = login()
    return _token


def post_measurement(temp_c: float, hum_pct: float) -> str:
    global _token, _measurement_count
    _measurement_count += 1
    payload = {
        "name": f"{NAME_PREFIX} #{_measurement_count}",
        "source": "lab_equipment",
        "temperature": round(temp_c, 1),
        "ph": DEMO_PH,
        "parameters": [
            {
                "parameterCode": "HUM",
                "parameterName": "Relative Humidity",
                "unit": "%",
                "value": round(hum_pct, 1),
            }
        ],
    }
    headers = {"Authorization": f"Bearer {ensure_token()}"}
    r = requests.post(
        f"{API_BASE}/api/measurements/",
        json=payload,
        headers=headers,
        timeout=HTTP_TIMEOUT_S,
    )
    if r.status_code == 401:
        log.warning("Token rejected, refreshing and retrying once")
        _token = None
        headers = {"Authorization": f"Bearer {ensure_token()}"}
        r = requests.post(
            f"{API_BASE}/api/measurements/",
            json=payload,
            headers=headers,
            timeout=HTTP_TIMEOUT_S,
        )
    r.raise_for_status()
    return r.json()["measurementId"]


def take_and_send() -> None:
    Bridge.call("set_led", True)
    try:
        temp = float(Bridge.call("read_temperature"))
        hum = float(Bridge.call("read_humidity"))
        if math.isnan(temp) or math.isnan(hum):
            log.error("Sensor returned NaN (temp=%s, hum=%s); HS3003 likely not detected", temp, hum)
            return
        log.info("Reading: temp=%.1f °C, humidity=%.1f %%", temp, hum)
        mid = post_measurement(temp, hum)
        log.info("✓ Measurement saved: %s", mid)
        for _ in range(3):
            Bridge.call("set_led", False)
            time.sleep(0.1)
            Bridge.call("set_led", True)
            time.sleep(0.1)
    except Exception as exc:
        log.exception("Measurement failed: %s", exc)
    finally:
        Bridge.call("set_led", False)


def loop() -> None:
    global _last_press_at
    now = time.time()
    try:
        # Defensive: Bridge return values are unboxed to native types per the
        # RouterBridge README, but coerce explicitly to avoid truthy wrappers.
        raw = Bridge.call("is_button_pressed")
        pressed = raw is True or raw == 1 or raw == "true"
    except Exception:
        time.sleep(POLL_INTERVAL_S)
        return

    if pressed and (now - _last_press_at) > DEBOUNCE_S:
        _last_press_at = now
        log.info("Button pressed → triggering measurement")
        take_and_send()
        time.sleep(COOLDOWN_AFTER_POST_S)
        return

    time.sleep(POLL_INTERVAL_S)


if __name__ == "__main__":
    if not USERNAME or not PASSWORD:
        log.error("BLAU_USERNAME / BLAU_PASSWORD not set; refusing to start")
        raise SystemExit(1)
    log.info("Blau Field Station starting; backend=%s user=%s", API_BASE, USERNAME)
    App.run(user_loop=loop)
