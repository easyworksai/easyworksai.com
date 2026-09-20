#!/bin/bash
# Local test: handoffs, the assignment gate, stale/overdue, shift report. Fake GHL + fake Telegram on 8898. Never production.
# bash 3.2 (macOS) mangles \"$VAR\" inside "$(...)": always capture into R first, then expect.
# Needs ADMIN_CODE, EA_CODE (onboarded), TECH_CODE (onboarded), REP_CODE. Fresh stub, no handoffs.json / leads-claims.json.
S="$(mktemp -d)"; B=http://localhost:8899/.netlify/functions; G=http://localhost:8898
login(){ curl -s -o /dev/null -c $S/$1.jar -X POST $B/team-auth -H 'Content-Type: application/json' -d "{\"code\":\"$2\"}"; }
login brad "$ADMIN_CODE"; login ea "$EA_CODE"; login tech "$TECH_CODE"; login rep "$REP_CODE"
PASS=0; FAIL=0
expect(){ [ "$2" = "$3" ] && { PASS=$((PASS+1)); echo "ok   $1 [$2]"; } || { FAIL=$((FAIL+1)); echo "FAIL $1 :: got '$2' want '$3'"; }; }
J(){ python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
P(){ curl -s -o $S/o.json -w '%{http_code}' -b $S/$1.jar -X POST $B/$2 -H 'Content-Type: application/json' -d "$3"; }
G_(){ curl -s -b $S/$1.jar "$B/$2"; }

echo "== a Blueprint sale opens one handoff"
P rep team-leads '{"action":"claim","id":"L1"}' >/dev/null
R=$(P rep team-leads '{"action":"status","id":"L1","status":"blueprint-sold"}'); expect "rep sells a Blueprint (rep flow unchanged)" "$R" 200
expect "one handoff, four things missing" "$(G_ ea team-handoffs | J "[(h['name'],h['repName'],len(h['missing'])) for h in d['handoffs']]")" "[('Test Biz 1', 'Test Rep', 4)]"
P rep team-leads '{"action":"status","id":"L1","status":"meeting"}' >/dev/null; P rep team-leads '{"action":"status","id":"L1","status":"blueprint-sold"}' >/dev/null
expect "selling again does not open a second one" "$(G_ ea team-handoffs | J "len(d['handoffs'])")" 1
H=$(G_ ea team-handoffs | J "d['handoffs'][0]['id']")

echo "== a sale marked inside GHL opens one too"
P rep team-leads '{"action":"claim","id":"L2"}' >/dev/null
O2=$(curl -s $G/opportunities/search | J "d['opportunities'][-1]['id']")
curl -s -X POST $G/__set/$O2 -d '{"pipelineStageId":"bef55bb8-9f2c-475b-ae22-53c3a4de97ba"}' >/dev/null
curl -s -o /dev/null -X POST "$B/ghl-stage-hook?k=local-hook" -H 'Content-Type: application/json' -d "{\"opportunity_id\":\"$O2\"}"
expect "handoff opened from the GHL move" "$(G_ ea team-handoffs | J "sorted(h['name'] for h in d['handoffs'])")" "['Test Biz 1', 'Test Biz 2']"

echo "== who can do what"
expect "rep cannot see handoffs" "$(curl -s -o /dev/null -w '%{http_code}' -b $S/rep.jar $B/team-handoffs)" 403
expect "tech cannot see handoffs" "$(curl -s -o /dev/null -w '%{http_code}' -b $S/tech.jar $B/team-handoffs)" 403
R=$(P ea team-handoffs "{\"action\":\"check\",\"id\":\"$H\",\"key\":\"scope\",\"done\":true}"); expect "ea ticks scope" "$R" 200
R=$(P ea team-handoffs "{\"action\":\"check\",\"id\":\"$H\",\"key\":\"payment\",\"done\":true}"); expect "ea cannot confirm payment" "$R" 403
R=$(P brad team-handoffs "{\"action\":\"check\",\"id\":\"$H\",\"key\":\"task\",\"done\":true}"); expect "nobody ticks 'task' by hand" "$R" 400
R=$(P ea team-handoffs "{\"action\":\"close\",\"id\":\"$H\",\"reason\":\"x\"}"); expect "ea cannot close a handoff" "$R" 403
R=$(P ea team-handoffs "{\"action\":\"note\",\"id\":\"$H\",\"text\":\"Emailed the scope sheet\"}"); expect "ea adds a note" "$R" 200
R=$(P ea team-handoffs "{\"action\":\"task\",\"id\":\"$H\"}"); expect "ea creates the build task" "$R" 200
T=$(J "d['handoff']['taskId']" < $S/o.json)
R=$(P ea team-handoffs "{\"action\":\"task\",\"id\":\"$H\"}"); expect "second build task refused" "$R" 409

echo "== paper before production: the gate"
R=$(P tech team-tasks "{\"action\":\"claim\",\"id\":\"$T\"}"); expect "tech cannot claim it yet" "$R" 409
expect "the message names what is missing" "$(J "d['error']" < $S/o.json)" "Handoff not complete. Still missing: intake form complete, payment in."
R=$(P brad team-tasks "{\"action\":\"assign\",\"id\":\"$T\",\"assignee\":\"test-tech\"}"); expect "admin assign is stopped too" "$R" 409
R=$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/team-bot -H 'x-ew-token: local-brief' -H 'Content-Type: application/json' -d "{\"action\":\"task.assign\",\"id\":\"$T\",\"assignee\":\"test-tech\"}"); expect "the Brain is stopped too" "$R" 409
R=$(P ea team-handoffs "{\"action\":\"check\",\"id\":\"$H\",\"key\":\"intake\",\"done\":true}"); expect "ea ticks intake" "$R" 200
TG0=$(curl -s $G/__tg | J "len(d)")
R=$(P brad team-handoffs "{\"action\":\"check\",\"id\":\"$H\",\"key\":\"payment\",\"done\":true}"); expect "admin confirms payment" "$R" 200
expect "handoff closes itself as complete" "$(J "d['handoff']['closed']['reason']" < $S/o.json)" complete
R=$(P tech team-tasks "{\"action\":\"claim\",\"id\":\"$T\"}"); expect "tech can claim it now" "$R" 200
H2=$(G_ ea team-handoffs | J "[h['id'] for h in d['handoffs'] if not h['closed']][0]")
P ea team-handoffs "{\"action\":\"task\",\"id\":\"$H2\"}" >/dev/null; T2=$(J "d['handoff']['taskId']" < $S/o.json)
R=$(P brad team-tasks "{\"action\":\"assign\",\"id\":\"$T2\",\"assignee\":\"test-tech\",\"override\":true}"); expect "admin override assigns early" "$R" 200
expect "and the override is on the record" "$(G_ brad team-tasks | J "[n['text'] for t in d['tasks'] if t['id']=='$T2' for n in t['notes']]")" "['Assigned before the handoff was complete (override).']"
R=$(P ea team-tasks "{\"action\":\"assign\",\"id\":\"$T2\",\"assignee\":\"test-tech\",\"override\":true}"); expect "ea cannot use override (cannot assign at all)" "$R" 403
P brad team-tasks '{"action":"create","title":"Plain task no handoff"}' >/dev/null; T3=$(J "d['task']['id']" < $S/o.json)
R=$(P brad team-tasks "{\"action\":\"assign\",\"id\":\"$T3\",\"assignee\":\"test-tech\"}"); expect "tasks with no handoff are not gated" "$R" 200

echo "== due dates, overdue, stale"
P brad team-tasks '{"action":"create","title":"Late task","due":"2026-01-05","assignee":"test-tech"}' >/dev/null; T4=$(J "d['task']['id']" < $S/o.json)
expect "date text becomes a real due date" "$(J "d['task']['dueDate']" < $S/o.json)" 2026-01-05
P brad team-tasks '{"action":"create","title":"Free text due","due":"end of month"}' >/dev/null
expect "free text due still accepted, not a date" "$(J "(d['task']['due'],d['task']['dueDate'])" < $S/o.json)" "('end of month', None)"
python3 - "$T3" <<'PY'
import json,glob,os,sys,time
p=glob.glob(os.path.expanduser('~/Projects/easyworksai.com/.netlify/blobs-serve/entries/*/site:sales-team/tasks.json'))[0]
d=json.load(open(p))
for t in d['tasks']:
    if t['id']==sys.argv[1]: t['status']='in-progress'; t['up']=int((time.time()-3*86400)*1000)
json.dump(d,open(p,'w'))
PY
G_ ea team-today > $S/today.json
expect "Today shows the overdue task" "$(J "[t['title'] for t in d['bench']['overdue']]" < $S/today.json)" "['Late task']"
expect "Today shows work gone quiet for 3 days" "$(J "[(t['title'],t['days']) for t in d['bench']['stale'] if t['id']=='$T3']" < $S/today.json)" "[('Plain task no handoff', 3)]"
expect "Today shows the open handoff with what is missing" "$(J "[(h['name'],h['missing']) for h in d['handoffs']]" < $S/today.json)" "[('Test Biz 2', ['Scope sheet signed', 'Intake form complete', 'Payment in'])]"

echo "== shift report"
P ea team-tasks "{\"action\":\"nudge\",\"id\":\"$T3\"}" >/dev/null
P ea team-tasks "{\"action\":\"status\",\"id\":\"$T4\",\"status\":\"blocked\",\"reason\":\"no logins\"}" >/dev/null
P ea team-tasks "{\"action\":\"status\",\"id\":\"$T4\",\"status\":\"in-progress\"}" >/dev/null
expect "rep cannot use the report" "$(curl -s -o /dev/null -w '%{http_code}' -b $S/rep.jar $B/team-report)" 403
G_ ea team-report > $S/rep.json
for needle in "Nudged: Plain task no handoff" "Unblocked: Late task" "Marked blocked: Late task (no logins)" "Test Biz 1: scope sheet signed" "Handoff 0d: Test Biz 2" "Overdue since 2026-01-05: Late task"; do
  expect "draft has: $needle" "$(python3 -c "import json; print('$needle' in json.load(open('$S/rep.json'))['draft'])")" True; done
R=$(P ea team-report '{"action":"send","text":"hi"}'); expect "empty report refused" "$R" 400
TG1=$(curl -s $G/__tg | J "len(d)")
python3 -c "import json; print(json.dumps({'action':'send','text':json.load(open('$S/rep.json'))['draft']+' <b>bold?</b>'}))" > $S/send.json
expect "report sends" "$(curl -s -o $S/o.json -w '%{http_code}' -b $S/ea.jar -X POST $B/team-report -H 'Content-Type: application/json' -d @$S/send.json)" 200
expect "Brad's Telegram got exactly one message, HTML escaped" "$(curl -s $G/__tg | J "(len(d)-$TG1, 'Shift report from Test Ea' in d[-1], '&lt;b&gt;bold?' in d[-1])")" "(1, True, True)"
curl -s -X POST $G/__tgdown -d '{"down":true}' >/dev/null
expect "Telegram down: she is told, nothing is counted as sent" "$(curl -s -o $S/o.json -w '%{http_code}' -b $S/ea.jar -X POST $B/team-report -H 'Content-Type: application/json' -d @$S/send.json)" 502
curl -s -X POST $G/__tgdown -d '{"down":false}' >/dev/null
for i in 1 2; do curl -s -o /dev/null -b $S/ea.jar -X POST $B/team-report -H 'Content-Type: application/json' -d @$S/send.json; done
expect "fourth report of the day refused" "$(curl -s -o /dev/null -w '%{http_code}' -b $S/ea.jar -X POST $B/team-report -H 'Content-Type: application/json' -d @$S/send.json)" 429
echo "PASS=$PASS FAIL=$FAIL"
