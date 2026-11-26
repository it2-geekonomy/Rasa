import Image from "next/image";
import { IMG } from "@/lib/rasa/img-map";

type Props = {
  img: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  priority?: boolean;
};

export function RasaImage({
  img,
  alt,
  className = "",
  style,
  width = 1200,
  height = 800,
  priority,
}: Props) {
  const src = IMG[img as keyof typeof IMG];
  if (!src) return null;

  const isLogo =
    img === "logo-color" ||
    img === "logo-white" ||
    img.endsWith("-logo") ||
    img.includes("logo");

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={
        isLogo
          ? `block h-auto w-auto max-w-full bg-transparent object-contain ${className}`
          : `block w-full rounded-rasa bg-plum-d object-cover ${className}`
      }
      style={style}
      priority={priority}
      sizes={isLogo ? undefined : "(max-width: 860px) 100vw, 600px"}
    />
  );
}