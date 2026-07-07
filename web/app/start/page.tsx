import { PageHeader, PlateLabel } from "@/components/ui";
import { StartConsole } from "./StartConsole";

export const dynamic = "force-dynamic";

export default function StartPage() {
  return (
    <>
      <PageHeader
        plate="00"
        label="Enterprise Decision Intelligence Platform"
        title={<>Choose a <em>domain</em>.</>} tail="Bring your data. One engine."
        lede="One analytics engine, interchangeable datasets. Pick a business domain, then run the demo or upload your own file. The engine is the same, only the data changes."
      />
      <PlateLabel plate="Plate II" label="Domain and dataset" />
      <StartConsole />
    </>
  );
}
