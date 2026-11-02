// What #4471 actually holds, counted the desk's way. Causes come from causes.ts, as the cause table
// counts them. The reports the desk read as a one-day move (desk-notes.json) stay counted where
// they are filed, but they are not a flipped month: the date moves by one day. That is a problem
// of its own, so it gets a row of its own too.
import { groupByCause, readAs, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'move' | 'unplaced';

export const PROBLEMS: Record<Problem, string> = {
  parser: 'the shared parser reads day-first dates month first',
  hint: 'booking-v3 prints an MM/DD hint to day-first tenants',
  move: 'the invite moves by one day, not a swap',
  unplaced: 'no tenant on file',
};

export type ProblemGroup = {
  problem: Problem;
  reports: number;
  // Of these, how many the desk read as a one-day move (for the cause rows), or where they are filed (for move).
  moved: number;
  filedUnder: Problem[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

function span(rs: Report[]): Pick<ProblemGroup, 'tenants' | 'firstSeen' | 'lastSeen'> {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return { tenants: new Set(rs.map((r) => r.tenant)).size, firstSeen: days[0], lastSeen: days[days.length - 1] };
}

export function groupByProblem(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const causes = groupByCause(merged, tenantOf);
  const moved = merged.filter((r) => oneDayMove.includes(r.id));
  const moveRow: ProblemGroup[] = moved.length
    ? [{
        problem: 'move',
        reports: moved.length,
        moved: moved.length,
        filedUnder: causes.filter((g) => readAs(g, oneDayMove) > 0).map((g) => g.cause),
        ...span(moved),
      }]
    : [];
  return [
    ...causes.map((g) => ({
      problem: g.cause,
      reports: g.reports.length,
      moved: readAs(g, oneDayMove),
      filedUnder: [],
      ...span(g.reports),
    })),
    ...moveRow,
  ];
}
