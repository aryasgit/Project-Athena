import { getScenarioBaseline } from "@/lib/queries";
import { getModule } from "@/lib/module";
import { MODULE_META } from "@/lib/moduleMeta";
import { Simulator } from "@/components/Simulator";
import { PageHeader, PlateLabel, ModuleNotice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const module = await getModule();
  if (module !== "placement") {
    return (
      <>
        <PageHeader plate="Plate I" label="Decision Simulator"
          title={<>Change the assumptions, <em>watch the decision move</em>.</>} />
        <ModuleNotice moduleName={MODULE_META[module].name} />
      </>
    );
  }
  const baseline = await getScenarioBaseline();

  return (
    <>
      <PageHeader
        plate="Plate I"
        label="Decision Simulator"
        title={<>Change the assumptions, <em>watch the decision move</em>.</>}
        lede="This is not a report you read. Move a lever and Athena recomputes the projected outcome from the same model the data was built on, then tells you whether the scenario is worth pursuing."
      />

      <PlateLabel plate="Plate II" label="The what-if bench" />
      <Simulator baseline={baseline} />

      <p className="mt-8 max-w-[62ch] text-[0.82rem] leading-relaxed text-muted">
        Projections come from a logit placement model and multiplicative salary factors
        calibrated to the observed 2024 to 2025 cohort. Confidence falls as a scenario moves
        further from what the data has actually seen, so large extrapolations are flagged as
        less certain rather than presented as fact.
      </p>
    </>
  );
}
