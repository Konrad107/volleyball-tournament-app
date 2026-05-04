import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Shield, Smartphone, Monitor, Lock, RotateCcw } from "lucide-react";

const DEFAULT_TEAMS = [
  "THE BALLERS",
  "Serves You Right",
  "To Be Confirmed",
  "The Lion and the Sun",
  "Friends",
  "Salt n Peppered",
  "To spike or to be spiked",
  "Kings and Queens",
  "Block Party",
  "Daddy and his ducks",
  "Hit Happens",
  "Leeds Uni",
  "The Tiny Grass Giants",
  "Kings back",
  "Barnsley",
  "Touch Grass",
  "Your mum can’t pass",
  "block bros",
  "Angry Brids",
  "Crispy Pancakes",
  "Cats and Crows",
  "Hunters",
  "Hits dont lie",
  "Spikelogical warfare",
  "Wakefield",
  "BALLERS",
  "HUDDERSFIELD VOLLEYBALL 2 (tbc)",
  "bam bam on soundcloud",
  "Mikasa es su casa",
  "Bringing Setsy Back",
  "Huddersfield Volleyball",
  "Dewsbury",
  "FIRE TRAP",
  "Double Trouble",
  "The ATeam",
  "Ajk",
];

const courts = "ABCDEFGHI".split("");
const groupFixtureTemplate = [
  [0, 1, 2],
  [2, 3, 0],
  [0, 2, 1],
  [1, 3, 2],
  [0, 3, 1],
  [1, 2, 3],
];

function chunk(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
}

function makeGroups(teams, prefix, count, courtStart = 0) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix} ${i + 1}`,
    court: courts[courtStart + i] || "-",
    teams: teams.slice(i * 4, i * 4 + 4),
  }));
}

function fixturesForGroup(group) {
  return groupFixtureTemplate.map(([a, b, ref], idx) => ({
    id: `${group.id}-M${idx + 1}`,
    groupId: group.id,
    court: group.court,
    matchNo: idx + 1,
    team1: group.teams[a] || "",
    team2: group.teams[b] || "",
    referee: group.teams[ref] || "",
  }));
}

function tableForGroup(group, scores) {
  const rows = group.teams.map((team, idx) => ({
    team,
    groupId: group.id,
    originalOrder: idx,
    played: 0,
    wins: 0,
    losses: 0,
    diff: 0,
    points: 0,
  }));
  const lookup = new Map(rows.map((r) => [r.team, r]));

  fixturesForGroup(group).forEach((fixture) => {
    const score = scores[fixture.id];
    if (!score || score.s1 === "" || score.s2 === "") return;
    const s1 = Number(score.s1);
    const s2 = Number(score.s2);
    if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) return;
    const r1 = lookup.get(fixture.team1);
    const r2 = lookup.get(fixture.team2);
    if (!r1 || !r2) return;
    r1.played += 1;
    r2.played += 1;
    r1.diff += s1 - s2;
    r2.diff += s2 - s1;
    if (s1 > s2) {
      r1.wins += 1;
      r1.points += 1;
      r2.losses += 1;
    } else {
      r2.wins += 1;
      r2.points += 1;
      r1.losses += 1;
    }
  });

  return rows
    .sort((a, b) => b.points - a.points || b.diff - a.diff || a.originalOrder - b.originalOrder)
    .map((r, idx) => ({ ...r, rank: idx + 1 }));
}

function buildQualified(round1Tables) {
  const winners = [];
  const runnersUp = [];
  const thirds = [];
  const fourths = [];

  round1Tables.forEach((table) => {
    table.forEach((row) => {
      if (row.rank === 1) winners.push(row);
      if (row.rank === 2) runnersUp.push(row);
      if (row.rank === 3) thirds.push(row);
      if (row.rank === 4) fourths.push(row);
    });
  });

  const rankedThirds = thirds.sort((a, b) => b.points - a.points || b.diff - a.diff || a.groupId.localeCompare(b.groupId));
  const cupThirds = rankedThirds.slice(0, 2);
  const shieldThirds = rankedThirds.slice(2);

  const cupTeams = [...winners, ...runnersUp, ...cupThirds];
  const shieldTeams = [...shieldThirds, ...fourths];

  return { winners, runnersUp, rankedThirds, cupThirds, shieldThirds, cupTeams, shieldTeams };
}

function seededCupGroups(winners, runnersUp, cupThirds) {
  const win = [...winners].sort((a, b) => b.points - a.points || b.diff - a.diff);
  const run = [...runnersUp].sort((a, b) => b.points - a.points || b.diff - a.diff);
  const third = [...cupThirds].sort((a, b) => b.points - a.points || b.diff - a.diff);

  const groups = Array.from({ length: 5 }, (_, i) => ({ id: `Cup G${i + 1}`, court: courts[i], teams: [] }));

  // Snake seeding: winners 1-5, runners 5-1, winners 6-9 + thirds, remaining runners.
  win.slice(0, 5).forEach((r, i) => groups[i].teams.push(r.team));
  run.slice(0, 5).forEach((r, i) => groups[4 - i].teams.push(r.team));

  const pot3 = [...win.slice(5), ...third];
  pot3.forEach((r, i) => groups[i % 5].teams.push(r.team));

  const pot4 = run.slice(5);
  pot4.forEach((r, i) => groups[i % 5].teams.push(r.team));

  return groups.map((g) => ({ ...g, teams: g.teams.slice(0, 4) }));
}

function seededShieldGroups(shieldTeams) {
  const ordered = [...shieldTeams].sort((a, b) => b.points - a.points || b.diff - a.diff || a.groupId.localeCompare(b.groupId));
  const groups = Array.from({ length: 4 }, (_, i) => ({ id: `Shield G${i + 1}`, court: courts[5 + i], teams: [] }));
  ordered.forEach((r, i) => {
    const target = i < 4 ? i : i < 8 ? 7 - i : i < 12 ? i - 8 : 15 - i;
    groups[target].teams.push(r.team);
  });
  return groups;
}

function FixtureTable({ groups, scores, setScores }) {
  const fixtures = groups.flatMap(fixturesForGroup);
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="p-3 text-left">Group</th>
            <th className="p-3 text-center">Court</th>
            <th className="p-3 text-center">Match</th>
            <th className="p-3 text-left">Team 1</th>
            <th className="p-3 text-center">Score</th>
            <th className="p-3 text-left">Team 2</th>
            <th className="p-3 text-left">Referee</th>
          </tr>
        </thead>
        <tbody>
          {fixtures.map((m) => {
            const score = scores[m.id] || { s1: "", s2: "" };
            const tied = score.s1 !== "" && score.s2 !== "" && Number(score.s1) === Number(score.s2);
            return (
              <tr key={m.id} className="border-t">
                <td className="p-3 font-medium">{m.groupId}</td>
                <td className="p-3 text-center"><Badge>{m.court}</Badge></td>
                <td className="p-3 text-center">{m.matchNo}</td>
                <td className="p-3">{m.team1}</td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      className="w-16 text-center"
                      value={score.s1}
                      type="number"
                      min="0"
                      onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: { ...score, s1: e.target.value } }))}
                    />
                    <span>-</span>
                    <Input
                      className="w-16 text-center"
                      value={score.s2}
                      type="number"
                      min="0"
                      onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: { ...score, s2: e.target.value } }))}
                    />
                  </div>
                  {tied && <div className="mt-1 text-center text-xs font-semibold text-red-600">No ties — play one more point</div>}
                </td>
                <td className="p-3">{m.team2}</td>
                <td className="p-3 text-slate-600">{m.referee}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Standings({ groups, scores }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <Card key={group.id} className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{group.id}</h3>
              <Badge>Court {group.court}</Badge>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-2 text-left">#</th>
                  <th className="py-2 text-left">Team</th>
                  <th className="py-2 text-center">Pts</th>
                  <th className="py-2 text-center">Diff</th>
                </tr>
              </thead>
              <tbody>
                {tableForGroup(group, scores).map((r) => (
                  <tr key={r.team} className="border-b last:border-b-0">
                    <td className="py-2 font-semibold">{r.rank}</td>
                    <td className="py-2">{r.team}</td>
                    <td className="py-2 text-center">{r.points}</td>
                    <td className="py-2 text-center">{r.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RankingTable({ title, rows, icon }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 text-left">Rank</th>
                <th className="py-2 text-left">Team</th>
                <th className="py-2 text-left">Group</th>
                <th className="py-2 text-center">Pts</th>
                <th className="py-2 text-center">Diff</th>
                <th className="py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.team}-${i}`} className="border-b last:border-b-0">
                  <td className="py-2 font-semibold">{i + 1}</td>
                  <td className="py-2">{r.team}</td>
                  <td className="py-2">{r.groupId}</td>
                  <td className="py-2 text-center">{r.points}</td>
                  <td className="py-2 text-center">{r.diff}</td>
                  <td className="py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VolleyballTournamentApp() {
  const [teams, setTeams] = useState(DEFAULT_TEAMS);
  const [round1Scores, setRound1Scores] = useState({});
  const [cupScores, setCupScores] = useState({});
  const [shieldScores, setShieldScores] = useState({});
  const [knockoutScores, setKnockoutScores] = useState({});

  const round1Groups = useMemo(() => makeGroups(teams, "Group", 9, 0), [teams]);
  const round1Tables = useMemo(() => round1Groups.map((g) => tableForGroup(g, round1Scores)), [round1Groups, round1Scores]);
  const q = useMemo(() => buildQualified(round1Tables), [round1Tables]);
  const cupGroups = useMemo(() => seededCupGroups(q.winners, q.runnersUp, q.cupThirds), [q]);
  const shieldGroups = useMemo(() => seededShieldGroups(q.shieldTeams), [q]);
  const cupTables = useMemo(() => cupGroups.map((g) => tableForGroup(g, cupScores)), [cupGroups, cupScores]);
  const shieldTables = useMemo(() => shieldGroups.map((g) => tableForGroup(g, shieldScores)), [shieldGroups, shieldScores]);

  const cupWinnerRanking = useMemo(() => {
    return cupTables
      .map((table, idx) => ({ ...table[0], cupGroup: cupGroups[idx]?.id }))
      .sort((a, b) => b.points - a.points || b.diff - a.diff || a.cupGroup.localeCompare(b.cupGroup))
      .map((r, idx) => ({ ...r, status: idx < 4 ? "Semi-final" : "Out", groupId: r.cupGroup }));
  }, [cupTables, cupGroups]);

  const shieldWinners = useMemo(() => {
    return shieldTables.map((table, idx) => ({ ...table[0], status: "Semi-final", groupId: shieldGroups[idx]?.id }));
  }, [shieldTables, shieldGroups]);

  const resetScores = () => {
    setRound1Scores({});
    setCupScores({});
    setShieldScores({});
    setKnockoutScores({});
  };

  const cupSemiTeams = [cupWinnerRanking[0]?.team, cupWinnerRanking[3]?.team, cupWinnerRanking[1]?.team, cupWinnerRanking[2]?.team];
  const shieldSemiTeams = [shieldWinners[0]?.team, shieldWinners[3]?.team, shieldWinners[1]?.team, shieldWinners[2]?.team];

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">Volleyball Tournament App</h1>
              <p className="mt-2 text-slate-300">Timed 20-minute games • 1 point per win • Points difference tie-breaker • No tied matches</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={resetScores} className="gap-2 rounded-2xl"><RotateCcw size={16} /> Reset Scores</Button>
            </div>
          </div>
        </header>

        <Tabs defaultValue="mobile" className="space-y-4">
          <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm md:grid-cols-6">
            <TabsTrigger value="mobile" className="gap-2 rounded-xl"><Smartphone size={16} /> Score Entry</TabsTrigger>
            <TabsTrigger value="round1" className="rounded-xl">Round 1</TabsTrigger>
            <TabsTrigger value="split" className="rounded-xl">Cup/Shield Split</TabsTrigger>
            <TabsTrigger value="round2" className="rounded-xl">Round 2</TabsTrigger>
            <TabsTrigger value="knockout" className="rounded-xl">Knockout</TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2 rounded-xl"><Monitor size={16} /> Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="mobile" className="space-y-4">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <h2 className="mb-2 text-xl font-bold">Mobile Score Entry</h2>
                <p className="mb-4 text-sm text-slate-600">Teams enter scores here. If a game is tied at time, play one more point and enter a winner.</p>
                <FixtureTable groups={round1Groups} scores={round1Scores} setScores={setRound1Scores} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="round1" className="space-y-4">
            <Standings groups={round1Groups} scores={round1Scores} />
          </TabsContent>

          <TabsContent value="split" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <RankingTable title="Best 3rd Places" icon={<Trophy size={20} />} rows={q.rankedThirds.map((r, i) => ({ ...r, status: i < 2 ? "Cup" : "Shield" }))} />
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <h3 className="mb-3 text-lg font-bold">Qualification Summary</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-amber-50 p-4">
                      <div className="text-3xl font-black">20</div>
                      <div className="text-sm text-slate-600">Cup teams: top 2 from each group + best 2 thirds</div>
                    </div>
                    <div className="rounded-2xl bg-sky-50 p-4">
                      <div className="text-3xl font-black">16</div>
                      <div className="text-sm text-slate-600">Shield teams: remaining thirds + fourth places</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="round2" className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4 space-y-4">
                <h2 className="text-xl font-bold">Cup Round 2 Score Entry</h2>
                <FixtureTable groups={cupGroups} scores={cupScores} setScores={setCupScores} />
              </CardContent>
            </Card>
            <Standings groups={cupGroups} scores={cupScores} />
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4 space-y-4">
                <h2 className="text-xl font-bold">Shield Round 2 Score Entry</h2>
                <FixtureTable groups={shieldGroups} scores={shieldScores} setScores={setShieldScores} />
              </CardContent>
            </Card>
            <Standings groups={shieldGroups} scores={shieldScores} />
          </TabsContent>

          <TabsContent value="knockout" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <RankingTable title="Cup Winners Overall Ranking" icon={<Trophy size={20} />} rows={cupWinnerRanking} />
              <RankingTable title="Shield Group Winners" icon={<Shield size={20} />} rows={shieldWinners} />
            </div>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <h3 className="mb-4 text-xl font-bold">Semi-finals</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border bg-white p-4"><b>Cup SF1:</b> {cupSemiTeams[0] || "TBC"} vs {cupSemiTeams[1] || "TBC"}</div>
                  <div className="rounded-2xl border bg-white p-4"><b>Cup SF2:</b> {cupSemiTeams[2] || "TBC"} vs {cupSemiTeams[3] || "TBC"}</div>
                  <div className="rounded-2xl border bg-white p-4"><b>Shield SF1:</b> {shieldSemiTeams[0] || "TBC"} vs {shieldSemiTeams[1] || "TBC"}</div>
                  <div className="rounded-2xl border bg-white p-4"><b>Shield SF2:</b> {shieldSemiTeams[2] || "TBC"} vs {shieldSemiTeams[3] || "TBC"}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <RankingTable title="Cup Semi-final Race" icon={<Trophy size={20} />} rows={cupWinnerRanking} />
              <RankingTable title="Shield Semi-finalists" icon={<Shield size={20} />} rows={shieldWinners} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
