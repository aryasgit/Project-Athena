/** Oversized two-tone statement break, Arc-style. */
export function NorthStar() {
  return (
    <section className="-mx-5 my-24 border-y border-hair px-5 py-20 text-center md:-mx-10 md:px-10">
      <p style={{ fontFamily: "var(--font-display)" }}
        className="mx-auto max-w-[22ch] font-bold leading-[1.02] tracking-[-0.03em] text-muted"
        >
        <span style={{ fontSize: "clamp(1.9rem,4.4vw,3.2rem)" }}>
          If the numbers changed today,{" "}
          <span className="text-ink">would the decision change?</span>
        </span>
      </p>
      <div className="mt-7 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">
        {"— the north star · reallocate the moment the answer is no"}
      </div>
    </section>
  );
}
