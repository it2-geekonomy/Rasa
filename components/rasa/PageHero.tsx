import { RasaImage } from "./RasaImage";
import { ph1, ph1In } from "@/lib/rasa/ui";

type Props = {
  title: string;
  lead?: string;
  children?: React.ReactNode;
};

export function PageHero({ title, lead, children }: Props) {
  return (
    <div className={ph1}>
      <div className={ph1In}>
        <RasaImage
          img="logo-white"
          alt="RASA, Roots to Rhythm"
          width={900}
          height={450}
          className="mb-3.5 !h-11 !w-auto"
        />
        <h1 className="font-display font-semibold">{title}</h1>
        {lead ? <p>{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}