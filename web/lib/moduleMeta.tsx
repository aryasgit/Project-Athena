import { ReactNode } from "react";
import { ModuleId } from "./module";

/** Per-module display config. The result-table "slots" are shared across
 *  modules; this maps each slot to the right title, unit, and copy. */
export type PanelSrc = "series" | "ranking";

export type ModuleMeta = {
  name: string;
  header: { plate: string; label: string; pre: string; em: string; post: string; lede: string };
  forecastPrimary: { key: string; title: string; hint: string; unit: string; money: boolean };
  forecastVolume: { key: string; title: string; hint: string };
  line: { key: string; title: string; hint: string };
  momentum: { title: string; hint: string; note: string };
  panels: { key: string; src: PanelSrc; title: string; hint: string; tone?: "ink" }[];
};

export const MODULE_META: Record<ModuleId, ModuleMeta> = {
  placement: {
    name: "Placement Intelligence",
    header: {
      plate: "Plate I", label: "Enterprise Decision Intelligence",
      pre: "The executive", em: "reading", post: ".",
      lede: "Placement Intelligence for the 2024 to 2025 cycle. Headline outcomes, forward projections, and the decisions they point to.",
    },
    forecastPrimary: { key: "median_ctc_cycle", title: "Median CTC trajectory", hint: "actuals to next cycle", unit: " LPA", money: true },
    forecastVolume: { key: "placements_monthly", title: "Placement volume outlook", hint: "monthly, Holt projection" },
    line: { key: "placement_rate_by_cycle", title: "Placement rate by cycle", hint: "percent of eligible placed" },
    momentum: {
      title: "Sector salary momentum", hint: "first to latest cycle",
      note: "IT Services is the one sector with declining pay while holding the largest hiring share, a structural drag on the headline median.",
    },
    panels: [
      { key: "placement_rate_by_tier", src: "series", title: "By university tier", hint: "placement rate" },
      { key: "region_placement_rate", src: "ranking", title: "By region", hint: "placement rate", tone: "ink" },
      { key: "channel_effectiveness", src: "ranking", title: "By hiring channel", hint: "placement rate", tone: "ink" },
    ],
  },
  finance: {
    name: "Finance Intelligence",
    header: {
      plate: "Plate I", label: "Enterprise Decision Intelligence",
      pre: "The financial", em: "position", post: ".",
      lede: "Revenue, margin and profit for FY 2024. Where growth and margin concentrate, and the capital-allocation decisions that follow.",
    },
    forecastPrimary: { key: "median_ctc_cycle", title: "Revenue trajectory", hint: "actuals to next year", unit: " Cr", money: true },
    forecastVolume: { key: "placements_monthly", title: "Monthly revenue", hint: "with next-year projection" },
    line: { key: "placement_rate_by_cycle", title: "Gross margin by year", hint: "percent" },
    momentum: {
      title: "Segment revenue momentum", hint: "first to latest year",
      note: "Legacy Licensing is the one segment with declining revenue while holding the largest share, at the lowest margin, a structural drag on the blend.",
    },
    panels: [
      { key: "placement_rate_by_tier", src: "series", title: "Gross margin by segment", hint: "percent" },
      { key: "region_placement_rate", src: "ranking", title: "Margin by region", hint: "gross margin", tone: "ink" },
      { key: "channel_effectiveness", src: "ranking", title: "Margin by channel", hint: "gross margin", tone: "ink" },
    ],
  },
};

export function headerTitle(m: ModuleMeta["header"]): ReactNode {
  return (<>{m.pre} <em>{m.em}</em>{m.post}</>);
}
