"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AnalysisResults } from "@/components/AnalysisResults";
import { buildOccupationAnalysis } from "@/lib/analysis/build";
import type { Occupation } from "@/lib/schemas";
import type { WorkdayResponse } from "@/lib/schemas/workday";
import { useVisualizerStore } from "@/lib/store";

function WorkdayAnalysis({ result, catalog }: { result: WorkdayResponse; catalog: Occupation[] }) {
  const t = useTranslations();
  const occupation =
    catalog.find((row) => row.occupationCode === result.selectedOccupationCode) ?? null;
  if (!occupation) {
    return <p>{t("workday.noMatch")}</p>;
  }
  const analysis =
    result.analysis && result.careerBridges
      ? { ...result.analysis, bridges: result.careerBridges }
      : buildOccupationAnalysis({
          occupation,
          catalog,
          locale: result.locale,
          workday: result,
        });
  return (
    <div className="space-y-3">
      <p>
        {t("workday.shareTasks")}: {Math.round((result.accelerateShare?.low ?? 0) * 100)}–
        {Math.round((result.accelerateShare?.high ?? 0) * 100)} %
      </p>
      <p>
        {t("workday.shareRole")}: {Math.round((result.automatableShare?.low ?? 0) * 100)}–
        {Math.round((result.automatableShare?.high ?? 0) * 100)} %
      </p>
      <AnalysisResults occupation={occupation} catalog={catalog} analysis={analysis} workday={result} />
    </div>
  );
}

export function WorkdayPanel({ catalog }: { catalog: Occupation[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const selectedCode = useVisualizerStore((state) => state.selectedCode);
  const setFilters = useVisualizerStore((state) => state.setFilters);
  const [jobTitle, setJobTitle] = useState("");
  const [workdayText, setWorkdayText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkdayResponse | null>(null);

  async function submit(occupationCode?: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workday/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          jobTitle: jobTitle.trim() || undefined,
          workdayText,
          occupationCode: occupationCode || selectedCode || undefined,
        }),
      });
      const payload = (await response.json()) as WorkdayResponse & { error?: string };
      if (!response.ok) {
        setResult(null);
        setError(payload.error === "model_unavailable" ? t("workday.errorUnavailable") : t("workday.errorGeneric"));
        return;
      }
      setResult(payload);
      if (payload.selectedOccupationCode) {
        setFilters({ selectedCode: payload.selectedOccupationCode });
      }
    } catch {
      setResult(null);
      setError(t("workday.errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-lg border-2 border-[#0f5c5c] bg-white p-4">
      <h2 className="font-serif text-2xl text-[#0b3f3c]">{t("workday.title")}</h2>
      <p className="mt-1 text-sm leading-relaxed text-[#5c6570]">{t("workday.lead")}</p>
      <p className="mt-2 text-xs text-[#5c6570]">{t("workday.privacy")}</p>
      <form
        className="mt-3 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{t("workday.jobTitle")}</span>
          <input
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            maxLength={160}
            className="rounded border border-[#d8d2c6] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{t("workday.description")}</span>
          <textarea
            required
            minLength={20}
            maxLength={2000}
            rows={5}
            value={workdayText}
            onChange={(event) => setWorkdayText(event.target.value)}
            className="rounded border border-[#d8d2c6] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded bg-[#0f5c5c] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? t("workday.pending") : t("workday.submit")}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 rounded border border-[#e6d3b8] bg-[#fff8ee] p-3 text-sm text-[#8a4b12]">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-3 text-sm">
          <p className="rounded border border-[#e6d3b8] bg-[#fff8ee] p-2 text-[#8a4b12]">
            {result.disclaimer}
            {result.fixture ? ` ${t("workday.fixtureNote")}` : ""}
          </p>
          {result.status === "ambiguous" ? (
            <div>
              <p className="font-semibold">{t("workday.ambiguous")}</p>
              <ul className="mt-2 space-y-2">
                {result.matches.map((match) => (
                  <li key={match.occupationCode}>
                    <button
                      type="button"
                      className="rounded border border-[#0f5c5c] px-3 py-2 text-left text-[#0f5c5c]"
                      onClick={() => void submit(match.occupationCode)}
                    >
                      {match.occupationCode}{" "}
                      {locale === "sv"
                        ? match.occupationNameSv
                        : locale === "en"
                          ? match.occupationNameEn
                          : match.occupationNameFi}
                      <span className="block text-xs">
                        {t("workday.confidence")}: {Math.round(match.confidence * 100)} %
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.status === "no_match" ? <p>{t("workday.noMatch")}</p> : null}
          {result.status === "ok" ? <WorkdayAnalysis result={result} catalog={catalog} /> : null}
        </div>
      ) : null}
    </section>
  );
}
