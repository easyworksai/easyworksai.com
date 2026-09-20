#!/bin/bash
# Local test for team-today against the fake GHL (ghl-stub.mjs on 8898). Sandbox only, never production.
# Needs: ADMIN_CODE, EA_CODE (onboarded ea), TECH_CODE, REP_CODE. Start from a fresh stub and no today-cache.json.
S="$(mktemp -d)"; B=http://localhost:8899/.netlify/functions; G=http://localhost:8898
login(){ curl -s -o /dev/null -c $S/$1.jar -X POST $B/team-auth -H 'Content-Type: application/json' -d "{\"code\":\"$2\"}"; }
login brad "$ADMIN_CODE"; login ea "$EA_CODE"; login tech "$TECH_CODE"; login rep "$REP_CODE"
PASS=0; FAIL=0
expect(){ [ "$2" = "$3" ] && { PASS=$((PASS+1)); echo "ok   $1 [$2]"; } || { FAIL=$((FAIL+1)); echo "FAIL $1 :: got '$2' want '$3'"; }; }
J(){ python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
code(){ curl -s -o /dev/null -w '%{http_code}' -b $S/$1.jar ${3:+-X $3} "$B/$2"; }
ncalls(){ curl -s $G/__calls | J "len(d)"; }

python3 - > $S/seed.json <<'PY'
import json,datetime as dt
now=dt.datetime.now(dt.timezone.utc); iso=lambda d:d.isoformat()
ago=lambda days:(now-dt.timedelta(days=days)).isoformat().replace('+00:00','Z')
NEW,CON,MEET,PROP,LOST='89707cb7-632a-4e36-b65c-79f94566a5f0','141829e9-7a54-4978-bab7-d29c456e552b','e297db98-c2c5-470d-a5a2-b3f98c59a51c','bef55bb8-9f2c-475b-ae22-53c3a4de97ba','1eae97f4-01ab-4c6d-87b0-d1a12157d256'
soon=now+dt.timedelta(minutes=5)
print(json.dumps({
 "events":[
  {"id":"e1","calendarId":"cal-1","startTime":iso(soon),"endTime":iso(soon),"title":"Discovery: Maple Dental <script>x</script>","appointmentStatus":"confirmed","contactId":"ct1"},
  {"id":"e2","calendarId":"cal-2","startTime":iso(soon),"endTime":iso(soon),"title":"Cancelled one","appointmentStatus":"cancelled","contactId":"ct2"},
  {"id":"e3","calendarId":"cal-1","startTime":iso(now+dt.timedelta(days=2)),"endTime":iso(now),"title":"In two days","appointmentStatus":"confirmed"},
  {"id":"e4","calendarId":"cal-off","startTime":iso(soon),"endTime":iso(soon),"title":"Inactive calendar","appointmentStatus":"confirmed"}],
 "opps":[
  {"id":"s1","name":"Stuck New 3d","pipelineStageId":NEW,"lastStageChangeAt":ago(3),"monetaryValue":9999,"contactId":"ct3","contact":{"id":"ct3","name":"A","phone":"+15550001111","tags":["rep-test-rep"]}},
  {"id":"s2","name":"Fresh New","pipelineStageId":NEW,"lastStageChangeAt":ago(0),"contact":{"tags":[]}},
  {"id":"s3","name":"Stuck Contacted 6d","pipelineStageId":CON,"lastStageChangeAt":ago(6),"monetaryValue":4000,"contact":{"phone":"+15550002222","tags":[]}},
  {"id":"s4","name":"Proposal 2d fine","pipelineStageId":PROP,"lastStageChangeAt":ago(2),"contact":{"tags":[]}},
  {"id":"s5","name":"Old but lost","pipelineStageId":LOST,"status":"lost","lastStageChangeAt":ago(40),"contact":{"tags":[]}}],
 "contacts":[
  {"id":"c1","businessName":"Bright Smiles","phone":"+15550003333","email":"x@y.z","tags":["scan","scan-needs-attention"],"dateAdded":ago(1)},
  {"id":"c2","contactName":"Has Owner","tags":["scan"],"assignedTo":"u1","dateAdded":ago(1)},
  {"id":"c3","contactName":"Has Rep","tags":["scan","rep-test-rep"],"dateAdded":ago(1)},
  {"id":"c4","contactName":"Too Old","tags":["scan"],"dateAdded":ago(10)}]}))
PY
curl -s -X POST $G/__seed -d @$S/seed.json >/dev/null

echo "== access"
expect "rep refused" "$(code rep team-today)" 403
expect "tech refused" "$(code tech team-today)" 403
expect "logged out refused" "$(curl -s -o /dev/null -w '%{http_code}' $B/team-today)" 401
expect "POST refused (read only)" "$(code ea team-today POST)" 405
if [ -n "$FRESH_EA_CODE" ]; then login fresh "$FRESH_EA_CODE"; expect "ea who has not onboarded refused" "$(code fresh team-today)" 403; fi

echo "== content for the EA"
C0=$(ncalls); curl -s -b $S/ea.jar $B/team-today > $S/ea.json
expect "meetings today: confirmed only, active calendars only" "$(J "[m['title'][:9] for m in d['meetings']]" < $S/ea.json)" "['Discovery']"
expect "stuck deals, worst first" "$(J "[(x['name'],x['days'],x['rep']) for x in d['stuck']]" < $S/ea.json)" "[('Stuck Contacted 6d', 6, None), ('Stuck New 3d', 3, 'Test Rep')]"
expect "scan leads with no owner, last 7 days" "$(J "[(x['name'],x['band']) for x in d['scanLeads']]" < $S/ea.json)" "[('Bright Smiles', 'needs attention')]"
expect "no errors" "$(J "d['errors']" < $S/ea.json)" "[]"
expect "no phones, emails, dollar values, ids or links in the EA payload" "$(python3 -c "
s=open('$S/ea.json').read()
print(any(k in s for k in ['+1555','phone','x@y.z','monetaryValue','9999','4000','contactId','oppId','\"link\"','gohighlevel']))")" False
expect "bench block present" "$(J "sorted(d['bench'].keys())" < $S/ea.json)" "['blocked', 'nudged', 'review']"

echo "== admin gets links, still no money or phones"
curl -s -b $S/brad.jar $B/team-today > $S/ad.json
expect "admin rows carry a GHL link" "$(J "all('link' in x for x in d['stuck'])" < $S/ad.json)" True
expect "admin payload has no phones or dollar values" "$(python3 -c "s=open('$S/ad.json').read(); print(any(k in s for k in ['+1555','monetaryValue','9999']))")" False

echo "== cache"
C1=$(ncalls); curl -s -o /dev/null -b $S/ea.jar $B/team-today
expect "second open within 5 min makes no GHL calls" "$(( $(ncalls) - C1 ))" 0
curl -s -o /dev/null -b $S/ea.jar "$B/team-today?refresh=1"
expect "refresh within a minute makes no GHL calls" "$(( $(ncalls) - C1 ))" 0
expect "one full load cost this many GHL calls" "$(( C1 - C0 ))" 5

echo "== bench is live even when cached; GHL down"
T=$(curl -s -b $S/brad.jar -X POST $B/team-tasks -H 'Content-Type: application/json' -d '{"action":"create","title":"Today panel test task","assignee":"test-tech"}' | J "d['task']['id']")
curl -s -o /dev/null -b $S/brad.jar -X POST $B/team-tasks -H 'Content-Type: application/json' -d "{\"action\":\"status\",\"id\":\"$T\",\"status\":\"blocked\",\"reason\":\"needs logins\"}"
expect "new blocked task shows at once despite the cache" "$(curl -s -b $S/ea.jar $B/team-today | J "[(t['title'],t['why']) for t in d['bench']['blocked'] if t['id']=='$T']")" "[('Today panel test task', 'needs logins')]"
find ~/Projects/easyworksai.com/.netlify/blobs-serve -name today-cache.json -delete
curl -s -X POST $G/__down -d '{"down":true}' >/dev/null
curl -s -b $S/ea.jar $B/team-today > $S/down.json
expect "GHL down: blocks flagged, not a crash" "$(J "sorted(d['errors'])" < $S/down.json)" "['meetings', 'scanLeads', 'stuck']"
expect "GHL down: bench still loads" "$(J "len(d['bench']['blocked'])>0" < $S/down.json)" True
curl -s -X POST $G/__down -d '{"down":false}' >/dev/null
expect "a failed read is not cached: next open works" "$(curl -s -b $S/ea.jar $B/team-today | J "len(d['stuck'])")" 2
curl -s -o /dev/null -b $S/brad.jar -X POST $B/team-tasks -H 'Content-Type: application/json' -d "{\"action\":\"delete\",\"id\":\"$T\"}"
echo "PASS=$PASS FAIL=$FAIL"
