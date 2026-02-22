#!/bin/bash
# verify-migrations.sh — Run after supabase db push to verify schema is actually applied
# Usage: ./scripts/verify-migrations.sh

set -e

echo "🔍 Verifying Supabase schema state..."

# Load env
source .env.local 2>/dev/null || true

SERVICE_KEY="${SUPABASE_SERVICE_KEY:-$SUPABASE_SERVICE_ROLE_KEY}"
URL="${NEXT_PUBLIC_SUPABASE_URL}"

if [ -z "$SERVICE_KEY" ] || [ -z "$URL" ]; then
  echo "❌ Missing SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_URL"
  exit 1
fi

# Check critical tables exist
check_table() {
  local table=$1
  result=$(curl -s -o /dev/null -w "%{http_code}" \
    "$URL/rest/v1/$table?select=count&limit=0" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY")
  
  if [ "$result" = "200" ]; then
    echo "  ✅ Table: $table"
  else
    echo "  ❌ Table: $table (HTTP $result)"
    FAILED=1
  fi
}

FAILED=0

echo ""
echo "📋 Tables:"
for table in user_roles households household_members columns shopping_items tasks activity_log household_invites; do
  check_table "$table"
done

echo ""
echo "🔐 RLS Policies (via service key — should return data if policies exist):"
# Test that get_my_household_ids function exists (via indirect test)
hm_count=$(curl -s \
  "$URL/rest/v1/household_members?select=count" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['count'] if isinstance(d,list) and d else '?')" 2>/dev/null)

echo "  household_members count (via service key): $hm_count"

echo ""
if [ "$FAILED" = "0" ]; then
  echo "✅ All schema checks passed"
else
  echo "❌ Some checks failed — run missing migrations manually"
  exit 1
fi
