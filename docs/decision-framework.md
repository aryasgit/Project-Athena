# From data to decision

Athena's premise is that a chart is not an answer. Every analysis has to close
the loop to a decision, or it is just decoration. The framework is the same one
a strategy consultant uses on a slide:

> **Observation** — what the data says, quantified.
> **Business Impact** — why it matters, in money, risk, or capability.
> **Recommended Action** — the specific decision that changes as a result.

The `recommendations` table encodes exactly these three fields, plus a
`priority`, a `confidence`, and machine-readable `evidence`.

## How a recommendation is derived

Each recommendation is generated from the warehouse, not hand-written. Example —
the internship recommendation:

1. Split the latest cohort into students with and without a prior internship.
2. Compare placement rates and run a Welch t-test.
3. If the gap is significant, emit a recommendation whose confidence is a
   function of the p-value and whose evidence carries the two rates, the
   t-statistic, and the p-value.

Because the numbers come from the data, they stay honest: when the signal is
weak, the priority drops to Medium and the confidence falls automatically.

## Worked signals in the placement module

| Observation | Impact | Action |
| --- | --- | --- |
| IT Services CTC is falling while it holds the largest hiring share | Drags the headline median regardless of gains elsewhere | Rebalance the recruiter mix; cap the sector's share |
| A region places well below the institution average | Concentrated unplaced-student risk | Targeted employer outreach + coordinator, review next cycle |
| On-campus converts best; referrals pay best | Uniform effort wastes coordinator time | Concentrate effort by channel and outcome |
| Cloud/ML/system-design skills carry a clear premium and rising demand | Cohorts without them funnel into lower-CTC roles | Embed them in pre-placement training |
| Prior interns place materially higher (t-test) | Internships are the strongest controllable predictor | Set a 60%+ internship-conversion target |
| Tier-3 conversion lags Tier-1 sharply | Uniform budgeting misallocates spend | Direct incremental training budget where uplift is largest |

## Why this matters for the portfolio

This is the layer that distinguishes Athena from a dashboard. Agora models how
markets *execute* decisions; Vega evaluates the *quality* of financial
decisions; Athena *supports* organisational decisions by carrying an analysis
all the way to the action it implies.
