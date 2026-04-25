#!/usr/bin/env bash
# Blau filter generation test curls
# Usage: bash test_curls.sh
# Or source it and call individual functions.
#
# Set these before running:
BASE_URL="http://localhost:8000"
EMAIL="blautest@example.com"
PASSWORD="TestPass123!"
STUDY_ID=""   # leave empty to auto-create a study on first run

# ── Auth ─────────────────────────────────────────────────────────────────────

get_token() {
  local raw
  raw=$(curl -s -X POST "$BASE_URL/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  local tok
  tok=$(echo "$raw" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
  if [[ -z "$tok" ]]; then
    echo "ERROR: login failed — $raw" >&2
    return 1
  fi
  echo "$tok"
}

# ── Auto-create or reuse study ───────────────────────────────────────────────

ensure_study() {
  local token="$1"
  if [[ -n "$STUDY_ID" ]]; then
    echo "$STUDY_ID"
    return
  fi
  local raw
  raw=$(curl -s -X POST "$BASE_URL/api/studies/" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d '{"name":"Test Curls Study","description":"auto-created by test_curls.sh"}')
  local sid
  sid=$(echo "$raw" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
  if [[ -z "$sid" ]]; then
    echo "ERROR: could not create study — $raw" >&2
    return 1
  fi
  STUDY_ID="$sid"
  echo "$sid"
}

# ── Poll + fetch helper ───────────────────────────────────────────────────────

poll_and_print() {
  local filter_id="$1"
  local token="$2"
  echo "Filter ID: $filter_id"
  while true; do
    STATUS=$(curl -s "$BASE_URL/api/filters/$filter_id/status/" \
      -H "Authorization: Bearer $token" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
    echo "  status: $STATUS"
    [[ "$STATUS" == "Success" || "$STATUS" == "Failed" ]] && break
    sleep 5
  done
  curl -s "$BASE_URL/api/filters/$filter_id/" \
    -H "Authorization: Bearer $token" \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
fi = d.get('filterInfo', {}) or {}
rp = fi.get('resultPayload', {}) or {}
sm = fi.get('summaryMetrics', {}) or {}
print('  layers:', sm.get('layer_count'), '| combined efficiency:', sm.get('removalEfficiency'), '%')
print('  enrichmentEnabled:', sm.get('enrichmentEnabled'))
for l in rp.get('layers', []):
    if l['mode'] == 'enrichment':
        rr = l.get('releaseRate')
        rate_str = f'{rr:.1f}%' if rr is not None else 'N/A'
        print(f'    {l[\"mode\"]:12s} {l[\"pollutantSymbol\"]:4s}  {l[\"bindingEnergy\"]:+.3f} eV  release={rate_str}  {l[\"method\"]}')
    else:
        print(f'    {l[\"mode\"]:12s} {l[\"pollutantSymbol\"]:4s}  {l[\"bindingEnergy\"]:+.3f} eV  {l[\"removalEfficiency\"]:5.1f}%  {l[\"method\"]}  merged={l.get(\"mergedPollutants\")}')
"
}

generate_filter() {
  local meas_id="$1"
  local token="$2"
  local target_codes="$3"
  local enrichment="$4"
  local raw
  raw=$(curl -s -X POST "$BASE_URL/api/filters/generate/" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "{\"measurementId\":\"$meas_id\",\"studyId\":\"$STUDY_ID\",\"targetParameterCodes\":$target_codes,\"useQuantumComputer\":false,\"enrichment\":$enrichment}")
  local fid
  fid=$(echo "$raw" | python3 -c "import sys,json; print(json.load(sys.stdin)['filterId'])" 2>/dev/null)
  if [[ -z "$fid" ]]; then
    echo "ERROR: generate_filter failed — $raw" >&2
    return 1
  fi
  echo "$fid"
}

create_measurement() {
  local name="$1"
  local temp="$2"
  local ph="$3"
  local params="$4"
  local token="$5"
  local raw
  raw=$(curl -s -X POST "$BASE_URL/api/measurements/" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "{\"study\":\"$STUDY_ID\",\"name\":\"$name\",\"source\":\"manual\",\"temperature\":$temp,\"ph\":$ph,\"parameters\":$params}")
  local mid
  mid=$(echo "$raw" | python3 -c "import sys,json; print(json.load(sys.stdin)['measurementId'])" 2>/dev/null)
  if [[ -z "$mid" ]]; then
    echo "ERROR: create_measurement failed — $raw" >&2
    return 1
  fi
  echo "$mid"
}

# ── Scenario 1: Heavy metals only (HF quantum path) ──────────────────────────
# Pb + Cd + Hg — all ionic, 3 separate filtration layers, method=hf

test_heavy_metals() {
  local TOKEN
  TOKEN=$(get_token) || return 1
  ensure_study "$TOKEN" > /dev/null || return 1
  echo "=== Scenario 1: Heavy metals (Pb + Cd + Hg) ==="

  local MEAS_ID
  MEAS_ID=$(create_measurement \
    "Heavy metals Pb/Cd/Hg" 20.0 6.5 \
    '[{"parameterCode":"pb","value":0.15,"unit":"mg/L"},{"parameterCode":"cadmium","value":0.08,"unit":"mg/L"},{"parameterCode":"mercury","value":0.05,"unit":"mg/L"}]' \
    "$TOKEN")

  local FILTER_ID
  FILTER_ID=$(generate_filter "$MEAS_ID" "$TOKEN" \
    '["pb","cadmium","mercury"]' \
    '{"enabled":false,"minerals":[]}')

  poll_and_print "$FILTER_ID" "$TOKEN"
}

# ── Scenario 2: Microplastics only (vdW empirical path) ──────────────────────
# PE + PP + PS → merge into 1 C layer; PET → O layer; PVC → Cl layer
# All use method=vdw_empirical

test_microplastics() {
  local TOKEN
  TOKEN=$(get_token) || return 1
  ensure_study "$TOKEN" > /dev/null || return 1
  echo "=== Scenario 2: Microplastics (PE+PP+PS merge, PET, PVC) ==="

  local MEAS_ID
  MEAS_ID=$(create_measurement \
    "Microplastics PE/PP/PS/PET/PVC" 25.0 7.0 \
    '[{"parameterCode":"pe","value":1.20,"unit":"mg/L"},{"parameterCode":"pp","value":0.90,"unit":"mg/L"},{"parameterCode":"ps","value":0.60,"unit":"mg/L"},{"parameterCode":"pet","value":0.40,"unit":"mg/L"},{"parameterCode":"pvc","value":0.25,"unit":"mg/L"}]' \
    "$TOKEN")

  local FILTER_ID
  FILTER_ID=$(generate_filter "$MEAS_ID" "$TOKEN" \
    '["pe","pp","ps","pet","pvc"]' \
    '{"enabled":false,"minerals":[]}')

  poll_and_print "$FILTER_ID" "$TOKEN"
}

# ── Scenario 3: Mixed contamination + enrichment ──────────────────────────────
# Metals (HF) + microplastics (vdW) + Ca/Mg enrichment layers

test_mixed_with_enrichment() {
  local TOKEN
  TOKEN=$(get_token) || return 1
  ensure_study "$TOKEN" > /dev/null || return 1
  echo "=== Scenario 3: Mixed (metals + microplastics) + Ca/Mg enrichment ==="

  local MEAS_ID
  MEAS_ID=$(create_measurement \
    "Mixed contamination" 22.0 7.2 \
    '[{"parameterCode":"lead","value":0.20,"unit":"mg/L"},{"parameterCode":"arsenic","value":0.10,"unit":"mg/L"},{"parameterCode":"pe","value":0.80,"unit":"mg/L"},{"parameterCode":"pet","value":0.35,"unit":"mg/L"},{"parameterCode":"nylon","value":0.15,"unit":"mg/L"}]' \
    "$TOKEN")

  local FILTER_ID
  FILTER_ID=$(generate_filter "$MEAS_ID" "$TOKEN" \
    '["lead","arsenic","pe","pet","nylon"]' \
    '{"enabled":true,"minerals":["calcium","magnesium"]}')

  poll_and_print "$FILTER_ID" "$TOKEN"
}

# ── Scenario 4: Anions (nitrate + fluoride + phosphate + sulfate) ─────────────
# All ionic anions → HF path; K and Se as enrichment minerals

test_anions() {
  local TOKEN
  TOKEN=$(get_token) || return 1
  ensure_study "$TOKEN" > /dev/null || return 1
  echo "=== Scenario 4: Anions (NO3 + F + PO4 + SO4) + K/Se enrichment ==="

  local MEAS_ID
  MEAS_ID=$(create_measurement \
    "Anions NO3/F/PO4/SO4" 18.0 8.0 \
    '[{"parameterCode":"no3n","value":15.0,"unit":"mg/L"},{"parameterCode":"fluoride","value":2.5,"unit":"mg/L"},{"parameterCode":"orthophosphate","value":1.2,"unit":"mg/L"},{"parameterCode":"sulfate","value":80.0,"unit":"mg/L"}]' \
    "$TOKEN")

  local FILTER_ID
  FILTER_ID=$(generate_filter "$MEAS_ID" "$TOKEN" \
    '["no3n","fluoride","orthophosphate","sulfate"]' \
    '{"enabled":true,"minerals":["potassium","selenium"]}')

  poll_and_print "$FILTER_ID" "$TOKEN"
}

# ── Scenario 5: Single pollutant, extreme conditions ─────────────────────────
# Mercury at 65°C and pH 4.5 — temperature and pH corrections reduce efficiency

test_extreme_conditions() {
  local TOKEN
  TOKEN=$(get_token) || return 1
  ensure_study "$TOKEN" > /dev/null || return 1
  echo "=== Scenario 5: Single pollutant (Hg), hot water (65°C), acid pH (4.5) ==="

  local MEAS_ID
  MEAS_ID=$(create_measurement \
    "Mercury extreme conditions" 65.0 4.5 \
    '[{"parameterCode":"hg","value":0.30,"unit":"mg/L"}]' \
    "$TOKEN")

  local FILTER_ID
  FILTER_ID=$(generate_filter "$MEAS_ID" "$TOKEN" \
    '["hg"]' \
    '{"enabled":false,"minerals":[]}')

  poll_and_print "$FILTER_ID" "$TOKEN"
}

# ── Scenario 6: Full mineral enrichment suite ─────────────────────────────────
# Minimal filtration target, all 6 enrichment minerals

test_enrichment_suite() {
  local TOKEN
  TOKEN=$(get_token) || return 1
  ensure_study "$TOKEN" > /dev/null || return 1
  echo "=== Scenario 6: All 6 enrichment minerals (Ca/Mg/K/Zn/Se/Si) ==="

  local MEAS_ID
  MEAS_ID=$(create_measurement \
    "Enrichment all minerals" 25.0 7.0 \
    '[{"parameterCode":"chloride","value":0.10,"unit":"mg/L"}]' \
    "$TOKEN")

  local FILTER_ID
  FILTER_ID=$(generate_filter "$MEAS_ID" "$TOKEN" \
    '["chloride"]' \
    '{"enabled":true,"minerals":["calcium","magnesium","potassium","zinc","selenium","silicate"]}')

  poll_and_print "$FILTER_ID" "$TOKEN"
}

# ── Run all ───────────────────────────────────────────────────────────────────

run_all() {
  test_heavy_metals
  echo
  test_microplastics
  echo
  test_mixed_with_enrichment
  echo
  test_anions
  echo
  test_extreme_conditions
  echo
  test_enrichment_suite
}

# Uncomment the scenario(s) you want to run:
# test_heavy_metals
# test_microplastics
# test_mixed_with_enrichment
# test_anions
# test_extreme_conditions
# test_enrichment_suite
# run_all
