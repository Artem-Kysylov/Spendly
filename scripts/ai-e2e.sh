#!/usr/bin/env bash
# Usage: ./scripts/ai-e2e.sh <USER_ID>
USER_ID="$1"
if [ -z "$USER_ID" ]; then
  echo "Provide USER_ID"; exit 1
fi

echo "1) Health check"
curl -sS "http://localhost:3000/api/llm/health" | jq .

echo "2) Canonical (no expenses this week) — expects 'No expenses recorded this week.' if empty"
curl -sS -X POST "http://localhost:3000/api/assistant" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"message\":\"Show my expenses this week\"}"

echo "3) Rate limit path"
curl -sS -X POST "http://localhost:3000/api/assistant" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"isPro\":false,\"enableLimits\":true,\"message\":\"Quick summary\"}"

echo "4) Action parse"
curl -sS -X POST "http://localhost:3000/api/assistant" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"message\":\"Add coffee 4.50 to Food budget\"}"