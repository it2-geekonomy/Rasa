import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("FAQ");
import { FAQ, POLICY } from "@/lib/rasa/catalog";
import { PageBody } from "@/components/rasa/motion/PageBody";
import { wrapTight } from "@/lib/rasa/ui";

export default function FaqPage() {
  return (
    <>
      <PageHero title="FAQ and policies" />
      <PageBody className={`${wrapTight} max-w-[1240px]`}>
        {FAQ.map(([q, a]) => (
          <details key={q} className="border-t border-line py-1.5">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3.5 font-bold text-plum [&::-webkit-details-marker]:hidden after:text-2xl after:content-['+'] open:after:content-['−']">
              {q}
            </summary>
            <p className="max-w-[70ch] pb-3.5 text-muted" dangerouslySetInnerHTML={{ __html: a }} />
          </details>
        ))}
        {POLICY.map((p, i) => (
          <details key={i} className="border-t border-line py-1.5">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3.5 font-bold text-plum [&::-webkit-details-marker]:hidden after:text-2xl after:content-['+'] open:after:content-['−']">
              {p[0]}
            </summary>
            {p[1].map((t) => (
              <p key={t.slice(0, 24)} className="mb-2.5 text-muted">
                {t}
              </p>
            ))}
            {p[2] ? (
              <ol className="mb-2 ml-5 grid list-decimal gap-2 text-muted">
                {p[2].map((t) => (
                  <li key={t.slice(0, 24)} dangerouslySetInnerHTML={{ __html: t }} />
                ))}
              </ol>
            ) : null}
          </details>
        ))}
      </PageBody>
    </>
  );
}