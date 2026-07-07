/** Giant Arc-style wordmark at the page foot. */
export function WordmarkFooter() {
  return (
    <div className="mx-auto max-w-[1320px] px-5 pb-14 pt-28 md:px-10">
      <div className="mb-4 flex justify-between font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">
        <span>decision intelligence platform</span>
        <span className="hidden sm:inline">reallocate the moment the answer is no</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)" }}
        className="select-none text-[19vw] font-extrabold leading-[0.8] tracking-[-0.055em] text-ink">
        athena<span className="text-str">.</span>
      </div>
    </div>
  );
}
