#!/bin/bash
# Local permission matrix for the ea role. Never point this at production.
# 1. netlify dev --offline with TEAM_LINK_SECRET set and dummy TELEGRAM_BOT_TOKEN / GHL_EASYWORKS_PIT_TOKEN (port 8899)
# 2. As admin, add one ea, one tech, one rep. Pass codes: ADMIN_CODE=.. HEAD_CODE=.. EA_CODE=.. TECH_CODE=.. REP_CODE=.. bash scripts/smoke-ea-role.sh
S="$(mktemp -d)"; B=http://localhost:8899/.netlify/functions
login(){ curl -s -o /dev/null -c $S/$1.jar -X POST $B/team-auth -H 'Content-Type: application/json' -d "{\"code\":\"$2\"}"; }
login brad "$ADMIN_CODE"; login cash "$HEAD_CODE"; login ea "$EA_CODE"; login tech "$TECH_CODE"; login rep "$REP_CODE"
PASS=0; FAIL=0
t(){ if [ "$2" = GET ]; then code=$(curl -s -o $S/out.json -w "%{http_code}" -b $S/$1.jar "$B/$3"); else code=$(curl -s -o $S/out.json -w "%{http_code}" -b $S/$1.jar -X POST "$B/$3" -H 'Content-Type: application/json' -d "$4"); fi
  if [ "$code" = "$5" ]; then PASS=$((PASS+1)); echo "ok   $6 [$code]"; else FAIL=$((FAIL+1)); echo "FAIL $6 [got $code want $5] $(head -c 200 $S/out.json)"; fi; }
chk(){ if python3 -c "import json; d=json.load(open('$S/out.json')); $1"; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); echo "FAIL assertion: $1"; fi; }
signall(){ for d in $(curl -s -b $S/$1.jar $B/team-compliance | python3 -c "import json,sys; print(' '.join(x['key'] for x in json.load(sys.stdin)['docs']))"); do
  n=$(curl -s -b $S/$1.jar "$B/team-compliance?doc=$d" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['acks']))")
  acks=$(python3 -c "print('['+','.join(['true']*$n)+']')")
  t $1 POST team-compliance "{\"action\":\"sign\",\"doc\":\"$d\",\"legalName\":\"Test Person\",\"acks\":$acks}" 200 "$1 signs $d"; done; }
echo "== EA before onboarding"
t ea GET team-tasks '' 200 "ea can read board before onboarding (same as tech)"
t ea POST team-tasks '{"action":"create","title":"x"}' 403 "ea create blocked until onboarded"
t ea GET team-admin '' 403 "ea ops numbers blocked until onboarded"
echo "== onboarding"
t ea POST team-onboard '{"action":"profile","email":"ea@test.local","contact":"+1 555","skill":"Executive assistant"}' 200 "ea saves profile"
t ea POST team-tasks '{"action":"create","title":"x"}' 403 "still blocked: docs unsigned"
signall ea
t ea GET team-compliance '' 200 "ea compliance status"; chk "assert d['exempt'] is False and d['complete'] is True"
t tech POST team-onboard '{"action":"profile","email":"t@test.local","contact":"+1 555","skill":"Design"}' 200 "tech profile"
signall tech
echo "== EA on the Bench"
t ea POST team-tasks '{"action":"create","title":"EA task","assignee":"test-tech","priority":"p1"}' 200 "ea creates task assigned to tech"
ID=$(python3 -c "import json; print(json.load(open('$S/out.json'))['task']['id'])")
t ea POST team-tasks '{"action":"create","title":"EA self","assignee":"test-ea"}' 200 "ea create naming self as assignee"; chk "assert d['task']['assignee'] is None"
ID2=$(python3 -c "import json; print(json.load(open('$S/out.json'))['task']['id'])")
t brad POST team-tasks "{\"action\":\"assign\",\"id\":\"$ID2\",\"assignee\":\"test-ea\"}" 200 "admin tries to assign to ea"
t ea GET team-tasks '' 200 "ea sees all tasks"; chk "t=[x for x in d['tasks'] if x['id']=='$ID2'][0]; assert t['assignee'] is None; assert 'test-ea' not in [m['slug'] for m in d['team']]; assert len(d['tasks'])>=2"
t ea POST team-tasks "{\"action\":\"note\",\"id\":\"$ID\",\"text\":\"ea note\"}" 200 "ea notes any task"
t ea POST team-tasks "{\"action\":\"nudge\",\"id\":\"$ID\"}" 200 "ea nudges"
t ea POST team-tasks "{\"action\":\"nudge\",\"id\":\"$ID\"}" 429 "second nudge within the hour refused"
t ea POST team-tasks "{\"action\":\"nudge\",\"id\":\"$ID2\"}" 400 "nudge on unassigned refused"
t ea POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"blocked\",\"reason\":\"waiting on client\"}" 200 "ea -> blocked"
t ea POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"in-progress\"}" 200 "ea blocked -> in-progress"
t ea POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"review\"}" 403 "ea cannot move to review"
t ea POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"done\"}" 403 "ea cannot set done"
t ea POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"backlog\"}" 403 "ea cannot move to backlog"
t tech POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"review\"}" 200 "tech moves own task to review"
t tech GET team-tasks '' 200 "tech reads board"; chk "t=[x for x in d['tasks'] if x['id']=='$ID'][0]; assert 'nudgedAt' not in t"
t ea POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"done\"}" 403 "ea cannot approve QC (review -> done)"
t ea POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"in-progress\"}" 403 "ea cannot send back from review"
t ea POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"blocked\"}" 403 "ea cannot block a task in review"
t ea POST team-tasks "{\"action\":\"assign\",\"id\":\"$ID\",\"assignee\":\"test-tech\"}" 403 "ea cannot reassign"
t ea POST team-tasks "{\"action\":\"claim\",\"id\":\"$ID2\"}" 403 "ea cannot claim"
t ea POST team-tasks "{\"action\":\"delete\",\"id\":\"$ID2\"}" 403 "ea cannot delete"
echo "== EA on the Floor (read only)"
t ea GET team-admin '' 200 "ea reads ops numbers"; chk "s=json.dumps(d); assert 'EW-' not in s and '\"code\"' not in s; assert 'test-ea' not in [r['slug'] for r in d['reps']]"
t ea POST team-admin '{}' 403 "ea POST team-admin refused"
t ea GET team-stats '' 200 "ea reads wire + leaderboard"; chk "assert 'test-ea' not in [r['slug'] for r in d['leaderboard']]"
t ea GET 'team-auth?roster=1' '' 200 "ea roster request"; chk "assert 'roster' not in d"
t ea GET 'team-compliance?team=1' '' 403 "ea cannot see team codes"
t ea GET 'team-compliance?config=1' '' 200 "config param ignored for ea"; chk "assert 'docs' in d and 'enforced' in d"
t ea GET 'team-onboard?slug=test-tech' '' 403 "ea cannot read pay details"
t ea POST team-auth '{"action":"add","name":"Sneaky Rep"}' 403 "ea cannot add members"
t ea POST team-auth '{"action":"deactivate","slug":"test-rep"}' 403 "ea cannot remove members"
t ea POST team-auth '{"action":"setrole","slug":"test-rep","role":"lead"}' 403 "ea cannot setrole"
t ea POST team-compliance '{"action":"enforce","on":true}' 403 "ea cannot flip the gate"
t ea POST team-progress '{"action":"incentive","title":"x"}' 403 "ea cannot set incentive"
t ea POST team-progress '{"module":"kit"}' 403 "ea cannot log training"
t ea POST team-leads '{"action":"claim","id":"nope"}' 403 "ea cannot claim leads"
echo "== existing roles unchanged"
t brad POST team-auth '{"action":"setrole","slug":"test-ea","role":"lead"}' 400 "setrole still rep/lead only"
t rep GET team-tasks '' 403 "rep still barred from Bench"
t rep GET team-admin '' 403 "rep still barred from ops"
t tech GET team-admin '' 403 "tech still barred from ops"
t tech POST team-tasks "{\"action\":\"nudge\",\"id\":\"$ID\"}" 403 "tech cannot nudge"
t tech POST team-tasks '{"action":"create","title":"x"}' 403 "tech still cannot create"
t rep POST team-progress '{"module":"kit"}' 200 "rep training still logs"
t rep POST team-leads '{"action":"claim","id":"nope"}' 404 "rep lead claim path unchanged"
t cash POST team-tasks "{\"action\":\"status\",\"id\":\"$ID\",\"status\":\"done\"}" 200 "head approves QC"
t brad GET 'team-compliance?team=1' '' 200 "admin team view lists ea"; chk "assert any(m['role']=='ea' for m in d['team'])"
echo "PASS=$PASS FAIL=$FAIL"
