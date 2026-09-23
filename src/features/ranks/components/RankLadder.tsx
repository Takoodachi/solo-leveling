import { TIERS, MAX_RATING } from '../tiers'
import RankBadge from './RankBadge'

/** The nine tiers plus a plain-language explanation of the rating. */
export default function RankLadder() {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t, i) => (
          <div key={t.key} className="flex flex-col items-center gap-1 rounded-2xl bg-secondary/60 px-1 py-3">
            <RankBadge tier={t.key} size={48} />
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: t.color }}>{t.name}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {t.min}–{i < TIERS.length - 1 ? TIERS[i + 1].min - 1 : MAX_RATING}
            </p>
          </div>
        ))}
      </div>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-foreground/85">
        <li>Every set gets a <b>1–1000 strength rating</b> from its estimated 1RM (Epley, reps capped at 20), compared with lifters of your sex at your bodyweight on that day.</li>
        <li>Roughly: 150 = beginner, 300 = novice, 450 = intermediate (median gym-goer), 650 = advanced, 850 = elite. Olympian is beyond elite.</li>
        <li>Each tier has three divisions (III → II → I). A lift’s rank is its <b>best set ever</b>, so ranks never drop.</li>
        <li>Each lift ranks the <b>muscles it trains most</b> (a deadlift ranks lower back, glutes and hamstrings). A muscle takes its best lift, and a group takes its best muscle. Train every muscle to fill in the bodygraph.</li>
        <li>Your <b>overall rank</b> blends the six groups (legs and back count most) once three are ranked.</li>
        <li>Dumbbell lifts use the weight of <b>one</b> dumbbell. For pull-ups, dips and push-ups, enter only <b>added</b> weight (or assistance for assisted versions). Planks and hangs are rated by hold time.</li>
        <li><b>Running</b> has its own rank (not part of overall): every run of 5 km+ is converted to the 5K time it’s worth (Riegel’s formula) and compared with runners of your sex. A longer run at a steady pace is worth more than a short one at the same pace.</li>
        <li>Standards are based on public strength and running data and rounded, so treat ranks as motivation, not a lab test.</li>
      </ul>
    </div>
  )
}
