"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { GalleryUploadField, ImageUploadField } from "./image-upload";
import { BackIcon, fieldClass, labelClass, Notice, Panel, primaryButtonClass, quietButtonClass } from "./ui";

type ArtistDetail = {
  id: string;
  name: string;
  designation: string | null;
  biography: string | null;
  profileImage: string | null;
  socialLinks: Record<string, string | undefined> | null;
  isActive: boolean;
  photos: { id: string; imageUrl: string }[];
};

export function ArtistFormScreen({ artistId }: { artistId?: string }) {
  const { token } = useAdmin();
  const router = useRouter();
  const isEdit = Boolean(artistId);
  const [ready, setReady] = useState(!isEdit);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [extraSocial, setExtraSocial] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState({
    name: "",
    designation: "",
    biography: "",
    profileImage: "",
    ig: "",
    web: "",
    em: "",
    ph: "",
    isActive: true,
    photoUrls: [] as string[],
  });

  useEffect(() => {
    if (!artistId) return;
    api<{ data: ArtistDetail }>(`/artists/${artistId}`, { token })
      .then((result) => {
        const a = result.data;
        const links = a.socialLinks ?? {};
        const { ig, web, em, ph, ...rest } = links;
        setExtraSocial(rest);
        setForm({
          name: a.name,
          designation: a.designation ?? "",
          biography: a.biography ?? "",
          profileImage: a.profileImage ?? "",
          ig: ig ?? "",
          web: web ?? "",
          em: em ?? "",
          ph: ph ?? "",
          isActive: a.isActive,
          photoUrls: a.photos.map((p) => p.imageUrl),
        });
        setReady(true);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the artist"));
  }, [artistId, token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const socialLinks = {
      ...extraSocial,
      ...(form.ig.trim() ? { ig: form.ig.trim() } : {}),
      ...(form.web.trim() ? { web: form.web.trim() } : {}),
      ...(form.em.trim() ? { em: form.em.trim() } : {}),
      ...(form.ph.trim() ? { ph: form.ph.trim() } : {}),
    };
    const body = {
      name: form.name,
      designation: form.designation,
      biography: form.biography,
      profileImage: form.profileImage.trim(),
      socialLinks,
      isActive: form.isActive,
      photoUrls: form.photoUrls,
    };

    try {
      if (isEdit && artistId) {
        await api(`/artists/${artistId}`, { method: "PATCH", token, body });
        router.replace(`/admin/artists/${artistId}`);
      } else {
        const created = await api<{ data: { id: string } }>("/artists", { method: "POST", token, body });
        router.replace(`/admin/artists/${created.data.id}`);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the artist");
      setPending(false);
    }
  }

  if (!ready && !error) return <p className="text-sm text-muted">Loading artist…</p>;

  const backHref = isEdit && artistId ? `/admin/artists/${artistId}` : "/admin/artists";

  return (
    <>
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-plum/80 no-underline hover:text-plum hover:underline"
        >
          <BackIcon />
          {isEdit ? "Artist" : "Artists"}
        </Link>
        <h1 className="mt-1 font-display text-3xl text-plum">
          {isEdit ? "Update artist" : "Create artist"}
        </h1>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <Panel title={form.name || "Artist details"}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Name
            <input
              className={fieldClass}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className={labelClass}>
            Designation / role
            <input
              className={fieldClass}
              value={form.designation}
              onChange={(event) => setForm({ ...form, designation: event.target.value })}
              placeholder="Bharatanatyam dancer"
            />
          </label>
          <div className="md:col-span-2">
            <ImageUploadField
              label="Profile image"
              value={form.profileImage}
              onChange={(profileImage) => setForm({ ...form, profileImage })}
              token={token}
              folder="artists"
            />
          </div>
          <label className={`${labelClass} md:col-span-2`}>
            Biography
            <textarea
              className={`${fieldClass} min-h-32`}
              value={form.biography}
              onChange={(event) => setForm({ ...form, biography: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            Instagram handle
            <input
              className={fieldClass}
              value={form.ig}
              onChange={(event) => setForm({ ...form, ig: event.target.value })}
              placeholder="handle without @"
            />
          </label>
          <label className={labelClass}>
            Website
            <input
              className={fieldClass}
              value={form.web}
              onChange={(event) => setForm({ ...form, web: event.target.value })}
              placeholder="example.com"
            />
          </label>
          <label className={labelClass}>
            Email
            <input
              className={fieldClass}
              type="email"
              value={form.em}
              onChange={(event) => setForm({ ...form, em: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            Phone / WhatsApp
            <input
              className={fieldClass}
              value={form.ph}
              onChange={(event) => setForm({ ...form, ph: event.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 py-1 text-sm text-ink md:col-span-2">
            <input
              type="checkbox"
              className="size-4 accent-plum"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            Active artist
          </label>
          <div className="md:col-span-2">
            <GalleryUploadField
              label="Gallery photos"
              urls={form.photoUrls}
              onChange={(photoUrls) => setForm({ ...form, photoUrls })}
              token={token}
              folder="artists"
            />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <button className={primaryButtonClass} type="submit" disabled={pending || !ready}>
              {pending ? "Saving…" : isEdit ? "Update artist" : "Create artist"}
            </button>
            <Link href={backHref} className={`${quietButtonClass} no-underline`}>
              Cancel
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
