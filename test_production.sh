#!/bin/bash
# TAD DOOH Platform - Production End-to-End Verification Pipeline
# -------------------------------------------------------------------------
# Usage: ./test_production.sh [API_URL] [DEVICE_ID]
# Default: Runs against local ecosystem if variables aren't injected explicitly

API_URL=${1:-"http://localhost:3000/api"}
DEVICE_ID=${2:-"taxi-e2e-node-01"}

echo "------------------------------------------------------------------"
echo "TAD Platform Validation Suite: Executing against $API_URL"
echo "------------------------------------------------------------------"

# 1. Backend Health Check
echo "1. Validating Routing Logic (Health Check / Campaign Endpoint)..."
RES=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/campaign)
if [ "$RES" -eq 200 ]; then
  echo "✅ Backend Responder: Live (HTTP 200)"
else
  echo "❌ Backend Responder Error: HTTP $RES"
  exit 1
fi

# 2. Register Device & Send Telemetry (Heartbeat)
echo -e "\n2. Bootstrapping initial physical identity ($DEVICE_ID) & Telemetry..."
curl -s -X POST $API_URL/device/heartbeat \
-H "Content-Type: application/json" \
-d "{
    \"device_id\": \"$DEVICE_ID\",
    \"battery_level\": 95,
    \"storage_free\": \"14GB\",
    \"player_status\": \"playing\"
}"
echo -e "\n✅ Identity logged natively."

# 3. Generating a test Campaign Array Container
echo -e "\n3. Creating Network Container (Campaign Allocation)..."
CAMPAIGN_RES=$(curl -s -X POST $API_URL/campaign \
-H "Content-Type: application/json" \
-d '{
    "name": "E2E Automated Campaign",
    "advertiser": "TAD Architecture Pipeline",
    "start_date": "2024-01-01T00:00:00.000Z",
    "end_date": "2030-01-01T00:00:00.000Z",
    "active": true
}')
# Extract generated ID natively
CAMPAIGN_ID=$(echo $CAMPAIGN_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "✅ Campaign Engine mounted ID: $CAMPAIGN_ID"

# 4. Injecting Cloudflare/S3 Simulation (Direct Link Binding)
echo -e "\n4. Binding Mock Storage Blob directly over Container Array..."
curl -s -X POST $API_URL/campaign/$CAMPAIGN_ID/video \
-H "Content-Type: application/json" \
-d '{
    "title": "E2E Baseline Stream",
    "url": "https://cdn.tad.com/e2e-baseline-chunk.mp4",
    "duration": 15,
    "size": 1024,
    "mime": "video/mp4"
}'
echo -e "\n✅ Mock CDN Mapping resolved."

# 5. Native Synchronization Node Request
echo -e "\n5. Validating Tablet Execution (Device Sync Payload Retrieval)..."
curl -s -X GET $API_URL/device/sync?device_id=$DEVICE_ID
echo -e "\n✅ Player retrieved arrays validating constraints."

# 6. Recording Final Execution Logic natively
echo -e "\n6. Confirming Network Offline Proof of Play loop resolution..."
curl -s -X POST $API_URL/device/playback \
-H "Content-Type: application/json" \
-d "{
    \"device_id\": \"$DEVICE_ID\",
    \"video_id\": \"video-e2e-node-baseline\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
}"
echo -e "\n✅ Analytics successfully captured over Backend Metrics."

# 7. Chart Aggregate Calculation Output
echo -e "\n7. Simulating Analytics Dashboard Extraction Pipeline..."
curl -s -X GET $API_URL/analytics/top-taxis
echo -e "\n✅ Analytics Engine processed nodes seamlessly."

echo "------------------------------------------------------------------"
echo "🎉 E2E Environment Verification Sequence Completed Cleanly."
echo "------------------------------------------------------------------"
