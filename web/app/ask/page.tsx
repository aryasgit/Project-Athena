import { PageHeader, PlateLabel } from "@/components/ui";
import { AskConsole } from "./AskConsole";

export const dynamic = "force-dynamic";

export default function AskPage() {
  return (
    <>
      <PageHeader
        plate="Plate I"
        label="Natural Language Interface"
        title={<>Ask the business a <em>question</em>.</>}
        lede="Type a question in plain language. Athena retrieves the relevant analytical results first, then reasons over them, so every answer is grounded in the numbers and cites its evidence."
      />
      <PlateLabel plate="Plate II" label="The decision console" />
      <AskConsole />
      <p className="mt-8 max-w-[62ch] text-[0.8rem] leading-relaxed text-muted">
        Answers are evidence-first: the structured analytics are retrieved before any model
        sees the question. With no AI provider configured, Athena still answers deterministically
        from the retrieved figures. The AI layer only improves the wording, never the facts.
      </p>
    </>
  );
}
