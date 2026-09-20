#!/bin/bash
# Local test for ghl-stage-hook + ghl-stage-reconcile against the fake GHL (ghl-stub.mjs on 8898). Never production.
S="$(mktemp -d)"; B=http://localhost:8899/.netlify/functions; G=http://localhost:8898; K=local-hook
curl -s -o /dev/null -c $S/rep.jar -X POST $B/team-auth -H 'Content-Type: application/json' -d "{\"code\":\"$REP_CODE\"}"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "ok   $1"; }; bad(){ FAIL=$((FAIL+1)); echo "FAIL $1 :: $2"; }
J(){ python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
leads(){ curl -s -b $S/rep.jar -X POST $B/team-leads -H 'Content-Type: application/json' -d "$1"; }
mine(){ curl -s -b $S/rep.jar $B/team-leads | J "next((l['status'] for l in d['mine'] if l['id']=='$1'),'absent')"; }
hook(){ curl -s -w '\n%{http_code}' -X POST "$B/ghl-stage-hook?k=${2-$K}" -H 'Content-Type: application/json' -d "$1"; }
expect(){ [ "$2" = "$3" ] && ok "$1 [$2]" || bad "$1" "got '$2' want '$3'"; }
ST_NEW=89707cb7-632a-4e36-b65c-79f94566a5f0; ST_CON=141829e9-7a54-4978-bab7-d29c456e552b; ST_MEET=e297db98-c2c5-470d-a5a2-b3f98c59a51c
ST_PROP=bef55bb8-9f2c-475b-ae22-53c3a4de97ba; ST_WON=3f082382-70ab-4f65-8631-989a4176c3ab; ST_LOST=1eae97f4-01ab-4c6d-87b0-d1a12157d256

echo "== setup: rep claims L1..L3 (creates stub opportunities)"
for l in L1 L2 L3; do leads "{\"action\":\"claim\",\"id\":\"$l\"}" >/dev/null; done
OPPS=$(curl -s $G/opportunities/search | J "' '.join(o['id'] for o in d['opportunities'])"); set -- $OPPS; O1=$1; O2=$2; O3=$3
expect "three opportunities exist in fake GHL" "$#" 3
FEED0=$(curl -s -b $S/rep.jar $B/team-stats | J "len(d['feed'])"); CALLS0=$(curl -s -b $S/rep.jar $B/team-stats | J "d['me']['calls']")

echo "== auth + junk"
expect "wrong secret refused" "$(hook "{\"opportunity_id\":\"$O1\"}" nope | tail -1)" 401
expect "no secret refused" "$(hook "{\"opportunity_id\":\"$O1\"}" '' | tail -1)" 401
expect "GET refused" "$(curl -s -o /dev/null -w '%{http_code}' "$B/ghl-stage-hook?k=$K")" 405
expect "empty payload skipped" "$(hook '{}' | head -1 | J "d.get('skipped')")" "no id in payload"
expect "unknown opportunity skipped" "$(hook '{"opportunity_id":"zzz"}' | head -1 | J "d.get('skipped')")" "not a Floor lead"

echo "== forged payload cannot set a stage"
hook "{\"opportunity_id\":\"$O1\",\"pipleline_stage\":\"Won\",\"status\":\"won\",\"pipelineStageId\":\"$ST_WON\"}" >/dev/null
expect "L1 still new (we read GHL, not the payload)" "$(mine L1)" new

echo "== GHL moves flow to the Floor"
curl -s -X POST $G/__set/$O1 -d "{\"pipelineStageId\":\"$ST_MEET\"}" >/dev/null
expect "hook reports change" "$(hook "{\"opportunity_id\":\"$O1\"}" | head -1 | J "str(d['from'])+'>'+str(d['to'])")" "new>meeting"
expect "L1 card shows meeting" "$(mine L1)" meeting
expect "same hook again is a no-op" "$(hook "{\"opportunity_id\":\"$O1\"}" | head -1 | J "d['changed']")" False
curl -s -X POST $G/__set/$O1 -d "{\"pipelineStageId\":\"$ST_CON\"}" >/dev/null; hook "{\"id\":\"$O1\"}" >/dev/null
expect "moved back in GHL -> called (payload used 'id')" "$(mine L1)" called
leads '{"action":"status","id":"L2","status":"no-answer"}' >/dev/null
hook "{\"opportunity_id\":\"$O2\"}" >/dev/null
expect "no-answer kept when GHL says Contacted (also proves no loop)" "$(mine L2)" no-answer
CID=$(python3 - <<PY
import json,glob,os
p=glob.glob(os.path.expanduser('~/Projects/easyworksai.com/.netlify/blobs-serve/entries/*/site:sales-team/leads-claims.json'))[0]
print(json.load(open(p))['L2']['ghlId'])
PY
)
curl -s -X POST $G/__set/$O2 -d "{\"pipelineStageId\":\"$ST_PROP\"}" >/dev/null; hook "{\"contact_id\":\"$CID\"}" >/dev/null
expect "payload with only a contact id still finds the deal" "$(mine L2)" blueprint-sold
curl -s -X POST $G/__set/$O2 -d '{"status":"lost"}' >/dev/null; hook "{\"opportunity_id\":\"$O2\"}" >/dev/null
expect "lost in GHL -> dead (drops off the rep's list)" "$(mine L2)" absent

echo "== quiet: no XP, wire or call count from GHL changes"
expect "wire unchanged except the rep's own no-answer? (feed delta)" "$(( $(curl -s -b $S/rep.jar $B/team-stats | J "len(d['feed'])") - FEED0 ))" 0
expect "call count rose only by the rep's own no-answer" "$(( $(curl -s -b $S/rep.jar $B/team-stats | J "d['me']['calls']") - CALLS0 ))" 1

echo "== won"
curl -s -X POST $G/__set/$O3 -d "{\"pipelineStageId\":\"$ST_WON\",\"status\":\"won\",\"monetaryValue\":9000}" >/dev/null
R=$(hook "{\"opportunity_id\":\"$O3\"}" | head -1)
expect "won flagged, ping sent once" "$(echo $R | J "d['won']")" True
expect "status untouched by won" "$(mine L3)" new
expect "no build amount written from GHL" "$(curl -s -b $S/rep.jar $B/team-leads | J "next(l['buildAmount'] for l in d['mine'] if l['id']=='L3')")" 0
expect "second won hook does not ping again" "$(hook "{\"opportunity_id\":\"$O3\"}" | head -1 | J "d['won']")" False
leads '{"action":"claim","id":"L4"}' >/dev/null; leads '{"action":"build","id":"L4","amount":4000}' >/dev/null
O4=$(curl -s $G/opportunities/search | J "d['opportunities'][-1]['id']")
expect "build closed on the Floor: hook is a no-op, no won ping" "$(hook "{\"opportunity_id\":\"$O4\"}" | head -1 | J "str(d['changed'])+str(d['won'])")" FalseFalse

echo "== other pipeline + GHL down"
curl -s -X POST $G/__set/$O1 -d '{"pipelineId":"OTHER","pipelineStageId":"x"}' >/dev/null
expect "other pipeline ignored" "$(hook "{\"opportunity_id\":\"$O1\"}" | head -1 | J "d.get('skipped')")" "other pipeline"
curl -s -X POST $G/__set/$O1 -d "{\"pipelineId\":\"FtnFKVIUyAh7NLy6Hgpt\",\"pipelineStageId\":\"$ST_MEET\"}" >/dev/null
curl -s -X POST $G/__down -d '{"down":true}' >/dev/null
expect "GHL down -> 502 so GHL retries" "$(hook "{\"opportunity_id\":\"$O1\"}" | tail -1)" 502
expect "nothing changed while down" "$(mine L1)" called
curl -s -o /dev/null $B/ghl-stage-reconcile
expect "reconcile while GHL is down changes nothing" "$(mine L1)" called
curl -s -X POST $G/__down -d '{"down":false}' >/dev/null

echo "== nightly reconcile catches the missed webhook (scheduled runs return no body, so test by outcome)"
UP(){ python3 -c "import json,glob,os; p=glob.glob(os.path.expanduser('~/Projects/easyworksai.com/.netlify/blobs-serve/entries/*/site:sales-team/leads-claims.json'))[0]; print(os.path.getmtime(p))"; }
curl -s -o /dev/null $B/ghl-stage-reconcile
expect "reconcile fixed L1" "$(mine L1)" meeting
M1=$(UP); sleep 1; curl -s -o /dev/null $B/ghl-stage-reconcile
expect "second run rewrites nothing" "$(UP)" "$M1"
echo "== rep flow unchanged"
leads '{"action":"status","id":"L1","status":"blueprint-sold"}' >/dev/null
expect "rep can still move their own lead" "$(mine L1)" blueprint-sold
expect "and it still pushed the stage to GHL" "$(curl -s $G/opportunities/$O1 | J "d['opportunity']['pipelineStageId']")" "$ST_PROP"
echo "PASS=$PASS FAIL=$FAIL"
