"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown, Loader2, Plus, RefreshCw, Sparkles, Star, Upload, X,
} from "lucide-react";
import {
  CATEGORIES, CLOTHING_TYPES, FABRICS, FITS, GENDERS, PATTERNS, SEASONS,
  STANDARD_SIZES, discountPctOf, slugifyName, suggestSku,
  DEFAULT_LEG_OPENINGS, DEFAULT_WAIST_SIZES,
  PANT_WAIST_GROUP, PANT_LEG_GROUP, PANT_LENGTH_GROUP, isPantLike,
} from "@/lib/clothing";
import type {
  ProductColor, ProductImage, ProductSize, ProductStatus, ProductVisibility,
  VariantInventory, VariantGroup,
} from "@/db/schema";
import UiSelect from "@/components/UiSelect";
import { useGlobalLoading } from "@/lib/loading-store";

export type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  material: string;
  price: number | "";
  compareAtPrice: number | null | "";
  image: string;
  stock: number;
  isNew: boolean;
  isFeatured: boolean;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  subcategory: string;
  collection: string;
  productType: string;
  shortDescription: string;
  costPrice: number | null | "";
  taxPct: number;
  currency: string;
  gender: string;
  clothingType: string;
  fabric: string;
  fabricWeight: string;
  fit: string;
  pattern: string;
  season: string;
  countryOfOrigin: string;
  sizes: ProductSize[];
  colors: ProductColor[];
  variantInventory: VariantInventory[];
  variants: VariantGroup[];
  images: ProductImage[];
  tags: string[];
  isBestSeller: boolean;
  sizeRecommendationEnabled: boolean;
  isOnSale: boolean;
  status: ProductStatus;
  visibility: ProductVisibility;
  trackInventory: boolean;
  allowBackorders: boolean;
  lowStockThreshold: number;
  weightGrams: number | null | "";
  packageWeightGrams: number | null | "";
  lengthCm: number | null | "";
  widthCm: number | null | "";
  heightCm: number | null | "";
  freeShipping: boolean;
  shippingClass: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  canonicalUrl: string;
  seoImage: string;
  features: string[];
  specifications: { label: string; value: string }[];
  warranty: string;
  returnPolicy: string;
  deliveryInfo: string;
};

const EMPTY: ProductFormValues = {
  name: "", slug: "", description: "", material: "", price: "", compareAtPrice: "",
  image: "", stock: 0, isNew: false, isFeatured: false, sku: "", barcode: "",
  brand: "", category: "", subcategory: "", collection: "", productType: "",
  shortDescription: "", costPrice: "", taxPct: 0, currency: "BDT",
  gender: "", clothingType: "", fabric: "", fabricWeight: "", fit: "", pattern: "",
  season: "", countryOfOrigin: "", sizes: [], colors: [], variantInventory: [],
  variants: [], images: [], tags: [], isBestSeller: false, isOnSale: false,
  sizeRecommendationEnabled: false,
  features: [], specifications: [], warranty: "", returnPolicy: "", deliveryInfo: "",
  status: "draft", visibility: "online",
  trackInventory: true, allowBackorders: false, lowStockThreshold: 5,
  weightGrams: "", packageWeightGrams: "", lengthCm: "", widthCm: "", heightCm: "",
  freeShipping: false, shippingClass: "",
  seoTitle: "", seoDescription: "", seoKeywords: "", canonicalUrl: "", seoImage: "",
};

const DRAFT_KEY = "mkr-product-draft-v1";
const num = (x: number | null | ""): number | null => (x === "" || x === null ? null : Number(x));
const inputCls =
  "mt-2 w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none";

type ProductFormProps = {
  initial?: ProductFormValues & { id?: string };
};

export default function ProductForm({ initial }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [v, setV] = useState<ProductFormValues>(() => {
    if (initial) return initial;
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as ProductFormValues;
          if (draft?.name) return { ...EMPTY, ...draft };
        }
      }
    } catch { /* ignore */ }
    return EMPTY;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState<{ id: string; slug: string; status: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [generatedOnce, setGeneratedOnce] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [legInput, setLegInput] = useState("");
  const lastGenerated = useRef<string>("");

  const set = useCallback(<K extends keyof ProductFormValues>(k: K, value: ProductFormValues[K]) => {
    setV((s) => ({ ...s, [k]: value }));
    setDirty(true);
    setFieldErrors((e) => ({ ...e, [k as string]: "" }));
  }, []);

  /* ——— smart automation: slug + SKU suggestions ——— */
  const onNameChange = (name: string) => {
    setV((s) => ({
      ...s,
      name,
      slug: !isEdit && (!s.slug || s.slug === slugifyName(s.name)) ? slugifyName(name) : s.slug,
      sku: !isEdit && (!s.sku || s.sku === suggestSku(s.name)) ? suggestSku(name) : s.sku,
    }));
    setDirty(true);
    setFieldErrors((e) => ({ ...e, name: "" }));
  };

  const priceNum = Number(v.price);
  const discount = useMemo(() => {
    const compare = num(v.compareAtPrice);
    return priceNum > 0 ? discountPctOf(priceNum, compare) : null;
  }, [v.compareAtPrice, priceNum]);

  const totalStock = useMemo(
    () => (v.variantInventory.length > 0
      ? v.variantInventory.reduce((s, r) => s + (r.stock || 0), 0)
      : v.sizes.length > 0
        ? v.sizes.reduce((s, r) => s + (r.stock || 0), 0)
        : Number(v.stock) || 0),
    [v.variantInventory, v.sizes, v.stock],
  );

  const stockStatus = totalStock <= 0 ? "out_of_stock" : totalStock <= v.lowStockThreshold ? "low_stock" : "in_stock";
  const outOfStockCount = v.variantInventory.filter((r) => (r.stock || 0) <= 0).length;
  const lowStockCount = v.variantInventory.filter((r) => (r.stock || 0) > 0 && (r.stock || 0) <= v.lowStockThreshold).length;

    /* ——— draft autosave + unsaved-changes guard (new products) ——— */
  useEffect(() => {
    if (isEdit || !dirty) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(t);
  }, [v, dirty, isEdit]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty || saved) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saved]);

  /* ——— uploads (existing /api/admin/upload storage) ——— */
  const uploadFiles = useCallback(async (files: FileList | File[]): Promise<string[]> => {
    const urls: string[] = [];
    setUploading(true);
    setError("");
    setUploadError("");
    useGlobalLoading.getState().startTask();
    try {
      for (const file of Array.from(files)) {
        /* Client-side pre-check: instant feedback without a round trip.
           Images are capped below Vercel's ~4.5 MB serverless payload limit;
           the server enforces its own 5 MB cap as well. */
        const isVideo = file.type.startsWith("video/");
        const limit = isVideo ? 50 * 1024 * 1024 : Math.floor(4.5 * 1024 * 1024);
        if (!isVideo && file.size > limit) {
          const msg = `"${file.name}" is too large — please use an image under 4.5 MB.`;
          setError(msg);
          setUploadError(msg);
          break;
        }
        if (isVideo && file.size > limit) {
          const msg = `"${file.name}" is too large — videos must be under 50 MB (and large videos cannot upload on Vercel hosting).`;
          setError(msg);
          setUploadError(msg);
          break;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { ok: boolean; url?: string; message?: string };
        if (data.ok && data.url) urls.push(data.url);
        else {
          const msg = data.message ?? "Upload failed.";
          setError(msg);
          setUploadError(msg);
          break;
        }
      }
    } catch {
      const msg = "Upload failed. Please try again.";
      setError(msg);
      setUploadError(msg);
    } finally {
      setUploading(false);
      useGlobalLoading.getState().endTask();
    }
    return urls;
  }, []);

  const setMainImage = useCallback(async (file: File | null) => {
    if (!file) return;
    const [url] = await uploadFiles([file]);
    if (!url) return;
    setV((s) => {
      const images = [
        { url, alt: s.name, order: 0 },
        ...s.images.filter((im) => im.url !== url),
      ].map((im, i) => ({ ...im, order: i }));
      return { ...s, image: url, images };
    });
    setDirty(true);
  }, [uploadFiles]);

  const addGalleryImages = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const urls = await uploadFiles(files);
    if (urls.length === 0) return;
    setV((s) => {
      const all = [...s.images];
      for (const url of urls) if (!all.some((im) => im.url === url)) all.push({ url, alt: "", order: all.length });
      return { ...s, image: s.image || all[0]?.url || "", images: all.map((im, i) => ({ ...im, order: i })) };
    });
    setDirty(true);
  }, [uploadFiles]);

  const reorderImages = (index: number, dir: -1 | 1) => {
    setV((s) => {
      const all = [...s.images];
      const target = index + dir;
      if (target < 0 || target >= all.length) return s;
      [all[index], all[target]] = [all[target], all[index]];
      const images = all.map((im, i) => ({ ...im, order: i }));
      return { ...s, images, image: images[0]?.url ?? s.image };
    });
    setDirty(true);
  };

  const setPrimaryImage = (index: number) => {
    setV((s) => {
      const all = [...s.images];
      const [im] = all.splice(index, 1);
      const images = [im, ...all].map((x, i) => ({ ...x, order: i }));
      return { ...s, images, image: im.url };
    });
    setDirty(true);
  };

  const removeImage = (index: number) => {
    setV((s) => {
      const all = [...s.images];
      all.splice(index, 1);
      const images = all.map((im, i) => ({ ...im, order: i }));
      return { ...s, images, image: images[0]?.url ?? "" };
    });
    setDirty(true);
  };

  /* ——— sizes ——— */
  const toggleSize = (size: string) => {
    setV((s) => {
      if (s.sizes.some((x) => x.size === size)) {
        return {
          ...s,
          sizes: s.sizes.filter((x) => x.size !== size),
          variantInventory: s.variantInventory.filter((r) => r.size !== size),
        };
      }
      return {
        ...s,
        sizes: [...s.sizes, {
          size,
          sku: s.sku ? `${s.sku}-${size.toUpperCase().replace(/\s+/g, "")}` : "",
          stock: 0, price: null, barcode: "",
        }],
      };
    });
    setDirty(true);
  };

  const addCustomSize = () => {
    const size = customSize.trim().slice(0, 20);
    if (!size || v.sizes.some((s) => s.size.toLowerCase() === size.toLowerCase())) return;
    toggleSize(size);
    setCustomSize("");
  };

  const updateSize = (size: string, patch: Partial<ProductSize>) => {
    setV((s) => ({ ...s, sizes: s.sizes.map((x) => (x.size === size ? { ...x, ...patch } : x)) }));
    setDirty(true);
  };

  /* ——— pant / trouser sizing (waist sizes in `sizes`; leg opening + length in `variants`) ——— */
  const panLegOptions = (variants: VariantGroup[]) => variants.find((g) => g.name === PANT_LEG_GROUP)?.options ?? [];
  const pantLength = (variants: VariantGroup[]) => variants.find((g) => g.name === PANT_LENGTH_GROUP)?.options[0] ?? "";
  const buildPantVariants = (waist: string[], legOpenings: string[], length: string): VariantGroup[] => {
    const groups: VariantGroup[] = [];
    if (waist.length) groups.push({ name: PANT_WAIST_GROUP, options: waist });
    if (legOpenings.length) groups.push({ name: PANT_LEG_GROUP, options: legOpenings });
    if (length) groups.push({ name: PANT_LENGTH_GROUP, options: [length] });
    return groups;
  };
  const pantLike = isPantLike(v);
  const pantLegOpenings = panLegOptions(v.variants);
  const pantLengthValue = pantLength(v.variants);

  const addWaistPreset = (size: string) => {
    if (v.sizes.some((s) => s.size === size)) return;
    setV((s) => {
      const sizes = [...s.sizes, { size, sku: s.sku ? `${s.sku}-${size}` : "", stock: 0, price: null, barcode: "" }];
      return { ...s, sizes, variants: buildPantVariants(sizes.map((x) => x.size), panLegOptions(s.variants), pantLength(s.variants)) };
    });
    setDirty(true);
  };

  const addWaistSize = () => {
    const raw = customSize.trim();
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n < 22 || n > 50) {
      setFieldErrors((e) => ({ ...e, pantWaist: "Waist size must be a whole number between 22 and 50." }));
      return;
    }
    const size = String(n);
    if (v.sizes.some((s) => s.size === size)) {
      setFieldErrors((e) => ({ ...e, pantWaist: "That waist size is already added." }));
      return;
    }
    addWaistPreset(size);
    setCustomSize("");
  };

  const removeWaist = (size: string) => {
    setV((s) => {
      const sizes = s.sizes.filter((x) => x.size !== size);
      return { ...s, sizes, variants: buildPantVariants(sizes.map((x) => x.size), panLegOptions(s.variants), pantLength(s.variants)) };
    });
    setDirty(true);
  };

  const moveWaist = (index: number, dir: -1 | 1) => {
    setV((s) => {
      const arr = [...s.sizes];
      const t = index + dir;
      if (t < 0 || t >= arr.length) return s;
      [arr[index], arr[t]] = [arr[t], arr[index]];
      return { ...s, sizes: arr, variants: buildPantVariants(arr.map((x) => x.size), panLegOptions(s.variants), pantLength(s.variants)) };
    });
    setDirty(true);
  };

  const updateWaistRow = (size: string, patch: Partial<ProductSize>) => {
    setV((s) => ({ ...s, sizes: s.sizes.map((x) => (x.size === size ? { ...x, ...patch } : x)) }));
    setDirty(true);
  };

  const addLeg = () => {
    const val = legInput.trim();
    if (!val) return;
    if (panLegOptions(v.variants).some((o) => o.toLowerCase() === val.toLowerCase())) return;
    setV((s) => ({
      ...s,
      variants: buildPantVariants(s.sizes.map((x) => x.size), [...panLegOptions(s.variants), val], pantLength(s.variants)),
    }));
    setLegInput("");
    setDirty(true);
  };

  const updateLeg = (index: number, value: string) => {
    setV((s) => {
      const opts = [...panLegOptions(s.variants)];
      if (!value.trim()) {
        opts.splice(index, 1);
      } else {
        opts[index] = value;
      }
      return { ...s, variants: buildPantVariants(s.sizes.map((x) => x.size), opts, pantLength(s.variants)) };
    });
    setDirty(true);
  };

  const removeLeg = (value: string) => {
    setV((s) => ({
      ...s,
      variants: buildPantVariants(s.sizes.map((x) => x.size), panLegOptions(s.variants).filter((o) => o !== value), pantLength(s.variants)),
    }));
    setDirty(true);
  };

  const moveLeg = (index: number, dir: -1 | 1) => {
    setV((s) => {
      const arr = [...panLegOptions(s.variants)];
      const t = index + dir;
      if (t < 0 || t >= arr.length) return s;
      [arr[index], arr[t]] = [arr[t], arr[index]];
      return { ...s, variants: buildPantVariants(s.sizes.map((x) => x.size), arr, pantLength(s.variants)) };
    });
    setDirty(true);
  };

  const setPantLength = (value: string) => {
    setV((s) => ({
      ...s,
      variants: buildPantVariants(s.sizes.map((x) => x.size), panLegOptions(s.variants), value),
    }));
    setDirty(true);
  };

  /* ——— colors ——— */
  const addColor = () => {
    set("colors", [...v.colors, { name: "", hex: "#111111", image: "", sku: "", stock: 0, price: null, barcode: "" }]);
  };

  const updateColor = (index: number, patch: Partial<ProductColor>) => {
    setV((s) => ({ ...s, colors: s.colors.map((c, i) => (i === index ? { ...c, ...patch } : c)) }));
    setDirty(true);
  };

  const removeColor = (index: number) => {
    setV((s) => {
      const name = s.colors[index]?.name;
      return {
        ...s,
        colors: s.colors.filter((_, i) => i !== index),
        variantInventory: name ? s.variantInventory.filter((r) => r.color !== name) : s.variantInventory,
      };
    });
    setDirty(true);
  };

  const uploadColorImage = async (index: number, file: File | null) => {
    if (!file) return;
    const [url] = await uploadFiles([file]);
    if (url) updateColor(index, { image: url });
  };

  /* ——— generate variant combinations ——— */
  const generateVariants = () => {
    setV((s) => {
      const colorNames = s.colors.map((c) => c.name.trim()).filter(Boolean);
      const sizeRows = s.sizes;
      const sizeNames = sizeRows.map((x) => x.size);
      if (colorNames.length === 0 && sizeNames.length === 0) return s;
      const autoSku = (color: string, size: string) => {
        if (!s.sku) return "";
        const c = color ? `-${color.replace(/\s+/g, "").toUpperCase().slice(0, 6)}` : "";
        const sz = size ? `-${size.toUpperCase().replace(/\s+/g, "")}` : "";
        return `${s.sku}${c}${sz}`;
      };
      let inv: VariantInventory[];
      if (colorNames.length > 0 && sizeNames.length > 0) {
        inv = colorNames.flatMap((color) =>
          sizeNames.map((size) => {
            const prev = s.variantInventory.find((r) => r.color === color && r.size === size);
            const sizeRow = sizeRows.find((x) => x.size === size);
            return {
              color, size,
              sku: prev?.sku || autoSku(color, size),
              stock: prev?.stock ?? sizeRow?.stock ?? 0,
              price: prev?.price ?? null,
              barcode: prev?.barcode ?? "",
            };
          }),
        );
      } else if (colorNames.length > 0) {
        inv = colorNames.map((color) => {
          const prev = s.variantInventory.find((r) => r.color === color);
          const colorRow = s.colors.find((c) => c.name === color);
          return {
            color, size: "",
            sku: prev?.sku || autoSku(color, ""),
            stock: prev?.stock ?? colorRow?.stock ?? 0,
            price: prev?.price ?? null,
            barcode: prev?.barcode ?? "",
          };
        });
      } else {
        inv = sizeNames.map((size) => {
          const row = sizeRows.find((x) => x.size === size);
          return {
            color: "", size,
            sku: row?.sku || autoSku("", size),
            stock: row?.stock ?? 0,
            price: row?.price ?? null,
            barcode: row?.barcode ?? "",
          };
        });
      }
      return { ...s, variantInventory: inv };
    });
    setDirty(true);
  };

  const setInvStock = (color: string, size: string, stock: number) => {
    setInvField(color, size, { stock: Math.max(0, Math.floor(stock) || 0) });
  };

  const setInvField = (color: string, size: string, patch: Partial<VariantInventory>) => {
    setV((s) => ({
      ...s,
      variantInventory: s.variantInventory.map((r) =>
        r.color === color && r.size === size ? { ...r, ...patch } : r,
      ),
    }));
    setDirty(true);
  };

  /* ——— tags ——— */
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().slice(0, 30);
    if (!tag || v.tags.includes(tag)) return;
    set("tags", [...v.tags, tag]);
    setTagInput("");
  };

  /* ——— AI description generation ——— */
  const generateDescription = async () => {
    if (aiBusy) return;
    if (v.name.trim().length < 2) {
      setFieldErrors((e) => ({ ...e, name: "Please enter a product name before generating the description." }));
      return;
    }
    const mainImage = v.images[0]?.url || v.image;
    if (!mainImage) {
      setAiNotice("No product image found. Please upload a product image first.");
      return;
    }
    setAiBusy(true);
    setAiNotice("");
    useGlobalLoading.getState().startTask();
    try {
      const res = await fetch("/api/admin/products/generate-description", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: v.name,
          imageUrl: mainImage,
          info: {
            Category: v.category, Gender: v.gender, Type: v.clothingType,
            Fabric: v.fabric, Fit: v.fit, Pattern: v.pattern, Season: v.season,
            Price: priceNum || undefined, Brand: v.brand,
          },
        }),
      });
      const data = (await res.json()) as { ok: boolean; text?: string; message?: string };
      if (!data.ok || !data.text) {
        setAiNotice(data.message ?? "Description generation failed. Please try again.");
      } else {
        lastGenerated.current = data.text;
        set("description", data.text);
        setGeneratedOnce(true);
        setAiNotice("Description generated successfully.");
      }
    } catch {
      setAiNotice("Description generation failed. Please try again.");
    } finally {
      setAiBusy(false);
      useGlobalLoading.getState().endTask();
    }
  };

  const onGenerateClick = () => {
    if (generatedOnce && v.description.trim() && v.description.trim() !== lastGenerated.current) {
      setConfirmRegen(true);
      return;
    }
    void generateDescription();
  };

  /* ——— client validation ——— */
  const validate = (publishing: boolean): boolean => {
    const errs: Record<string, string> = {};
    if (v.name.trim().length < 2) errs.name = "Product name is required (at least 2 characters).";
    if (!Number.isFinite(priceNum) || priceNum <= 0) errs.price = "A valid selling price is required.";
    const compare = num(v.compareAtPrice);
    if (compare !== null && compare <= priceNum) errs.compareAtPrice = "Compare-at price must be higher than the selling price.";
    if (publishing) {
      if (!v.image) errs.image = "At least one product image is required.";
      if (!v.sku.trim()) errs.sku = "SKU is required.";
      if (!v.category.trim()) errs.category = "Category is required.";
    }
    const skus = [v.sku, ...v.sizes.map((s) => s.sku), ...v.colors.map((c) => c.sku), ...v.variantInventory.map((r) => r.sku)]
      .map((s) => s.trim()).filter(Boolean);
    const dup = skus.find((s, i) => skus.indexOf(s) !== i);
    if (dup) errs.sku = `Duplicate SKU "${dup}" — SKUs must be unique.`;
    if (v.sizes.some((s) => s.stock < 0) || v.variantInventory.some((r) => r.stock < 0)) errs.stock = "Stock cannot be negative.";
    if (pantLike) {
      if (v.sizes.some((s) => { const n = Number(s.size); return !Number.isInteger(n) || n < 22 || n > 50; }))
        errs.pantWaist = "Waist sizes must be whole numbers between 22 and 50.";
      if (panLegOptions(v.variants).some((o) => !o.trim()))
        errs.pantLeg = "Leg openings cannot be empty.";
      const lower = panLegOptions(v.variants).map((o) => o.trim().toLowerCase());
      if (lower.some((o, i) => o && lower.indexOf(o) !== i))
        errs.pantLeg = "Leg openings must be unique.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ——— save ——— */
  const submit = async (status: ProductStatus) => {
    if (busy) return;
    if (!validate(status === "active")) {
      setError("Please fix the highlighted fields before saving.");
      return;
    }
    setBusy(true);
    setError("");
    useGlobalLoading.getState().startTask();
    try {
      const payload = {
        ...v,
        // legacy stock column stays in sync with sizes/variant inventory
        stock: v.variantInventory.length > 0
          ? v.variantInventory.reduce((a, r) => a + (r.stock || 0), 0)
          : v.sizes.length > 0
            ? v.sizes.reduce((a, r) => a + (r.stock || 0), 0)
            : Math.max(0, Math.floor(Number(v.stock)) || 0),
        price: Number(v.price),
        compareAtPrice: num(v.compareAtPrice),
        costPrice: num(v.costPrice),
        weightGrams: num(v.weightGrams),
        packageWeightGrams: num(v.packageWeightGrams),
        lengthCm: num(v.lengthCm),
        widthCm: num(v.widthCm),
        heightCm: num(v.heightCm),
        status,
      };
      const res = await fetch(initial?.id ? `/api/admin/products/${initial.id}` : "/api/admin/products", {
        method: initial?.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; id?: string; slug?: string; status?: string; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Save failed. Please try again.");
        setBusy(false);
        useGlobalLoading.getState().endTask();
        return;
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      if (isEdit) {
        router.push("/admin/products");
        router.refresh();
      } else {
        setSaved({ id: data.id!, slug: data.slug!, status: data.status ?? status });
        setDirty(false);
        setBusy(false);
        useGlobalLoading.getState().endTask();
      }
    } catch {
      setError("Save failed. Please try again.");
      setBusy(false);
      useGlobalLoading.getState().endTask();
    }
  };

  const resetForm = () => {
    setV(EMPTY);
    setDirty(false);
    setFieldErrors({});
    setError("");
    setSaved(null);
    setGeneratedOnce(false);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  if (saved) {
    return (
      <div className="adm-fade rounded-xl border border-line-soft bg-white/[0.03] p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Star className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foam">
          Product {saved.status === "draft" ? "draft saved" : "created"} successfully.
        </h2>
        <p className="mt-2 text-sm text-mist">/product/{saved.slug} · Status: {saved.status}</p>
        {saved.status === "draft" && (
          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-amber-300/90">
            This product is saved as a draft, so the public page returns 404 until it is published.
            Use Preview to check it, then set Status to Active and publish.
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {saved.status === "draft" ? (
            <Link href={`/product/${saved.slug}?preview=1`} className="rounded-lg border border-line-soft px-5 py-2.5 text-sm text-mist hover:text-foam">
              Preview Draft
            </Link>
          ) : (
            <Link href={`/product/${saved.slug}`} className="rounded-lg border border-line-soft px-5 py-2.5 text-sm text-mist hover:text-foam">
              View Product
            </Link>
          )}
          <button
            type="button"
            onClick={() => { resetForm(); router.refresh(); }}
            className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-foam hover:bg-white/15"
          >
            Add Another Product
          </button>
          <Link href="/admin/products" className="rounded-lg border border-line-soft px-5 py-2.5 text-sm text-mist hover:text-foam">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => { e.preventDefault(); void submit(v.status === "draft" ? "draft" : "active"); }}
      className="max-w-6xl space-y-6"
    >
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* main column */}
        <div className="space-y-6 xl:col-span-2">

          {/* 1 — Basic information */}
          <Section title="Basic Information" defaultOpen>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product Name *" error={fieldErrors.name} className="sm:col-span-2">
                <input value={v.name} onChange={(e) => onNameChange(e.target.value)} className={inputCls} placeholder="e.g. Oversized Cotton Tee" required />
              </Field>
              <Field label="SKU *" error={fieldErrors.sku}>
                <input value={v.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} placeholder="TS-001" />
              </Field>
              <Field label="Barcode">
                <input value={v.barcode} onChange={(e) => set("barcode", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Category *" error={fieldErrors.category}>
                <UiSelect
                  variant="admin"
                  ariaLabel="Category"
                  value={v.category}
                  onChange={(val) => set("category", val)}
                  options={[{ value: "", label: "Select category…" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
                  placeholder="Select category…"
                />
              </Field>
              <Field label="Subcategory">
                <input value={v.subcategory} onChange={(e) => set("subcategory", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Brand">
                <input value={v.brand} onChange={(e) => set("brand", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Collection">
                <input value={v.collection} onChange={(e) => set("collection", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Product Type">
                <input value={v.productType} onChange={(e) => set("productType", e.target.value)} className={inputCls} />
              </Field>
              <Field label="URL Slug" hint="Auto-generated from the name — edit if needed.">
                <input value={v.slug} onChange={(e) => set("slug", e.target.value)} maxLength={160} className={inputCls} placeholder="auto" />
              </Field>
              <Field label="Short Description" className="sm:col-span-2">
                <input value={v.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputCls} placeholder="1–2 sentence summary" />
              </Field>
            </div>
          </Section>

          {/* 2 — Pricing */}
          <Section title="Pricing">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Selling Price (à§³) *" error={fieldErrors.price}>
                <input type="number" min={0} value={v.price} onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Compare-at Price (à§³)" error={fieldErrors.compareAtPrice}>
                <input type="number" min={0} value={v.compareAtPrice ?? ""} onChange={(e) => set("compareAtPrice", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Cost Price (à§³)">
                <input type="number" min={0} value={v.costPrice ?? ""} onChange={(e) => set("costPrice", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Tax / VAT (%)">
                <input type="number" min={0} max={100} value={v.taxPct} onChange={(e) => set("taxPct", Math.max(0, Math.floor(Number(e.target.value) || 0)))} className={inputCls} />
              </Field>
              <Field label="Currency">
                <UiSelect
                  variant="admin"
                  searchable={false}
                  ariaLabel="Currency"
                  value={v.currency}
                  onChange={(val) => set("currency", val)}
                  options={[
                    { value: "BDT", label: "BDT (৳)" },
                    { value: "USD", label: "USD ($)" },
                  ]}
                />
              </Field>
              <div className="flex items-end pb-2">
                {discount !== null && <span className="adm-badge adm-badge--warn">Discount: {discount}% off</span>}
              </div>
            </div>
          </Section>

          {/* 3 — Media */}
          <Section title="Media">
            <Field label="Main Product Image *" error={fieldErrors.image} hint="Drag & drop or click to upload.">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); void setMainImage(e.dataTransfer.files[0] ?? null); }}
                className="mt-2 flex cursor-pointer items-center gap-4 rounded-lg border border-dashed border-line px-4 py-4 hover:border-soft/50"
              >
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void setMainImage(e.target.files?.[0] ?? null)} />
                {v.image ? (
                  <span className="relative block h-20 w-16 shrink-0 overflow-hidden rounded-md bg-white/5">
                    <Image src={v.image} alt="Main product image" fill sizes="64px" className="object-cover" />
                  </span>
                ) : (
                  <Upload className="h-6 w-6 text-mist" />
                )}
                <span className="text-sm text-mist">
                  {uploading ? "Uploading…" : v.image ? "Replace main image" : "Upload main image (JPG, PNG, WEBP — under 5 MB)"}
                </span>
              </label>
              {uploadError && (
                <p role="alert" className="mt-2 text-xs text-red-400">{uploadError}</p>
              )}
            </Field>

            <Field label="Gallery Images" className="mt-4" hint="Reorder, set primary, add alt text.">
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line-soft px-3 py-2 text-xs text-mist hover:text-foam">
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addGalleryImages(e.target.files)} />
                <Plus className="h-4 w-4" /> Add images
              </label>
              {v.images.length > 0 && (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {v.images.map((im, i) => (
                    <li key={im.url} className="rounded-lg border border-line-soft p-2">
                      <div className="relative h-24 overflow-hidden rounded-md bg-white/5">
                        <Image src={im.url} alt={im.alt || "Product image"} fill sizes="200px" className="object-cover" />
                        {i === 0 && <span className="adm-badge adm-badge--info absolute left-1 top-1">Primary</span>}
                      </div>
                      <input
                        value={im.alt}
                        onChange={(e) => setV((s) => ({ ...s, images: s.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)) }))}
                        placeholder="Alt text"
                        aria-label={`Alt text for image ${i + 1}`}
                        className="mt-2 w-full rounded border border-line bg-transparent px-2 py-1 text-xs text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-mist">
                        <div className="flex gap-1">
                          <button type="button" aria-label="Move image up" onClick={() => reorderImages(i, -1)} disabled={i === 0} className="rounded p-1 hover:text-foam disabled:opacity-30">↑</button>
                          <button type="button" aria-label="Move image down" onClick={() => reorderImages(i, 1)} disabled={i === v.images.length - 1} className="rounded p-1 hover:text-foam disabled:opacity-30">↓</button>
                          <button type="button" aria-label="Set as primary image" onClick={() => setPrimaryImage(i)} disabled={i === 0} className="rounded px-1 hover:text-foam disabled:opacity-30">★</button>
                        </div>
                        <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => removeImage(i)} className="text-accent hover:underline">Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          </Section>

          {/* 4 — Clothing details */}
          <Section title="Clothing Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gender">
                <UiSelect
                  variant="admin"
                  ariaLabel="Gender"
                  value={v.gender}
                  onChange={(val) => set("gender", val)}
                  options={[{ value: "", label: "Select…" }, ...GENDERS.map((g) => ({ value: g, label: g }))]}
                  placeholder="Select…"
                />
              </Field>
              <Field label="Clothing Type">
                <UiSelect
                  variant="admin"
                  ariaLabel="Clothing Type"
                  value={v.clothingType}
                  onChange={(val) => set("clothingType", val)}
                  options={[{ value: "", label: "Select…" }, ...CLOTHING_TYPES.map((t) => ({ value: t, label: t }))]}
                  placeholder="Select…"
                />
              </Field>
              <Field label="Material / Fabric">
                <UiSelect
                  variant="admin"
                  ariaLabel="Material / Fabric"
                  value={v.fabric}
                  onChange={(val) => set("fabric", val)}
                  options={[{ value: "", label: "Select…" }, ...FABRICS.map((f) => ({ value: f, label: f }))]}
                  placeholder="Select…"
                />
              </Field>
              <Field label="Fabric Weight" hint="e.g. 180 GSM">
                <input value={v.fabricWeight} onChange={(e) => set("fabricWeight", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Fit">
                <UiSelect
                  variant="admin"
                  ariaLabel="Fit"
                  value={v.fit}
                  onChange={(val) => set("fit", val)}
                  options={[{ value: "", label: "Select…" }, ...FITS.map((f) => ({ value: f, label: f }))]}
                  placeholder="Select…"
                />
              </Field>
              <Field label="Pattern">
                <UiSelect
                  variant="admin"
                  ariaLabel="Pattern"
                  value={v.pattern}
                  onChange={(val) => set("pattern", val)}
                  options={[{ value: "", label: "Select…" }, ...PATTERNS.map((p) => ({ value: p, label: p }))]}
                  placeholder="Select…"
                />
              </Field>
              <Field label="Season">
                <UiSelect
                  variant="admin"
                  ariaLabel="Season"
                  value={v.season}
                  onChange={(val) => set("season", val)}
                  options={[{ value: "", label: "Select…" }, ...SEASONS.map((s) => ({ value: s, label: s }))]}
                  placeholder="Select…"
                />
              </Field>
              <Field label="Country of Origin">
                <input value={v.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} className={inputCls} placeholder="Bangladesh" />
              </Field>
              <Field label="Material & Care" className="sm:col-span-2">
                <textarea value={v.material} onChange={(e) => set("material", e.target.value)} rows={3} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* 5 — Sizes & variants (pant-aware) */}
          {pantLike ? (
            <Section title="Pant Size & Leg Opening">
              <Field label="Pant Size / Waist Size" error={fieldErrors.pantWaist} hint="Numeric waist sizes only — S/M/L is not used for pants.">
                <div className="mt-2 flex flex-wrap gap-2">
                  {DEFAULT_WAIST_SIZES.map((size) => {
                    const active = v.sizes.some((s) => s.size === size);
                    return (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={active}
                        onClick={() => (active ? removeWaist(size) : addWaistPreset(size))}
                        className={`rounded-full border px-4 py-2 text-xs tracking-wide transition-colors ${active ? "border-soft/70 bg-soft/10 text-ice" : "border-line text-mist hover:border-soft/40 hover:text-foam"}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={22}
                    max={50}
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWaistSize(); } }}
                    placeholder="Custom waist (22–50)"
                    className="w-48 rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
                  />
                  <button type="button" onClick={addWaistSize} className="rounded-lg border border-line-soft px-3 py-2 text-xs text-mist hover:text-foam">+ Add Size</button>
                </div>
              </Field>

              {v.sizes.length > 0 && (
                <div className="mt-5 overflow-x-auto rounded-lg border border-line-soft">
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mist">Per-waist stock &amp; SKU</p>
                  <table className="adm-table w-full min-w-[560px]">
                    <thead>
                      <tr><th>Waist</th><th>SKU</th><th>Stock</th><th>Price override (৳)</th><th /></tr>
                    </thead>
                    <tbody>
                      {v.sizes.map((s, idx) => (
                        <tr key={s.size}>
                          <td className="font-semibold text-foam">{s.size}</td>
                          <td><input value={s.sku} onChange={(e) => updateWaistRow(s.size, { sku: e.target.value })} aria-label={`SKU for waist ${s.size}`} className="w-36 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-foam focus:border-soft/60 focus:outline-none" /></td>
                          <td><input type="number" min={0} value={s.stock} onChange={(e) => updateWaistRow(s.size, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} aria-label={`Stock for waist ${s.size}`} className="w-20 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-foam focus:border-soft/60 focus:outline-none" /></td>
                          <td><input type="number" min={0} value={s.price ?? ""} onChange={(e) => updateWaistRow(s.size, { price: e.target.value === "" ? null : Number(e.target.value) })} aria-label={`Price override for waist ${s.size}`} className="w-24 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-foam focus:border-soft/60 focus:outline-none" /></td>
                          <td className="whitespace-nowrap">
                            <button type="button" onClick={() => moveWaist(idx, -1)} aria-label={`Move ${s.size} up`} disabled={idx === 0} className="text-mist hover:text-foam disabled:opacity-30">▲</button>
                            <button type="button" onClick={() => moveWaist(idx, 1)} aria-label={`Move ${s.size} down`} disabled={idx === v.sizes.length - 1} className="ml-1 text-mist hover:text-foam disabled:opacity-30">▼</button>
                            <button type="button" onClick={() => removeWaist(s.size)} aria-label={`Remove waist ${s.size}`} className="ml-2 text-accent hover:underline">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Field label="Leg Opening" error={fieldErrors.pantLeg} hint={'One or more measurements, e.g. 15" to 22". Edit a value directly; empty a field to remove it.'}>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pantLegOpenings.map((val, i) => (
                    <span key={`${i}-${val}`} className="inline-flex items-center gap-1">
                      <input
                        value={val}
                        onChange={(e) => updateLeg(i, e.target.value)}
                        aria-label={`Leg opening ${i + 1}`}
                        className="w-16 rounded-lg border border-line bg-transparent px-2 py-1.5 text-center text-xs text-foam focus:border-soft/60 focus:outline-none"
                      />
                      <button type="button" onClick={() => moveLeg(i, -1)} aria-label="Move leg opening up" disabled={i === 0} className="ml-1 text-mist hover:text-foam disabled:opacity-30">▲</button>
                      <button type="button" onClick={() => moveLeg(i, 1)} aria-label="Move leg opening down" disabled={i === pantLegOpenings.length - 1} className="text-mist hover:text-foam disabled:opacity-30">▼</button>
                      <button type="button" onClick={() => removeLeg(val)} aria-label="Remove leg opening" className="ml-2 text-accent hover:underline">Remove</button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={legInput}
                    onChange={(e) => setLegInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLeg(); } }}
                    placeholder={'Add a measurement, e.g. 16.5"'}
                    className="w-56 rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
                  />
                  <button type="button" onClick={addLeg} className="rounded-lg border border-line-soft px-3 py-2 text-xs text-mist hover:text-foam">+ Add Leg Opening</button>
                </div>
              </Field>

              <Field label="Length (optional)" hint={'Shown with the selection when set, e.g. Regular 32"'}>
                <input value={pantLengthValue} onChange={(e) => setPantLength(e.target.value)} className={inputCls} placeholder={'e.g. Regular 30"'} />
              </Field>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="adm-badge adm-badge--info">Total stock: {totalStock}</span>
                {stockStatus === "out_of_stock" && <span className="adm-badge adm-badge--danger">No stock yet</span>}
              </div>
            </Section>
          ) : (
          <Section title="Sizes & Variants">
            <Field label="Sizes" hint="Tick the available sizes or add custom ones.">
              <div className="mt-2 flex flex-wrap gap-2">
                {STANDARD_SIZES.map((size) => {
                  const active = v.sizes.some((s) => s.size === size);
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSize(size)}
                      className={`rounded-full border px-4 py-2 text-xs uppercase tracking-wide transition-colors ${active ? "border-soft/70 bg-soft/10 text-ice" : "border-line text-mist hover:border-soft/40 hover:text-foam"}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSize(); } }}
                  placeholder="Custom size…"
                  className="w-40 rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
                />
                <button type="button" onClick={addCustomSize} className="rounded-lg border border-line-soft px-3 py-2 text-xs text-mist hover:text-foam">
                  + Add custom size
                </button>
              </div>
            </Field>

            {v.sizes.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-line-soft">
                <table className="adm-table w-full min-w-[640px]">
                  <thead>
                    <tr><th>Size</th><th>SKU</th><th>Stock</th><th>Price override (à§³)</th><th>Barcode</th><th /></tr>
                  </thead>
                  <tbody>
                    {v.sizes.map((s) => (
                      <tr key={s.size}>
                        <td className="font-semibold text-foam">{s.size}</td>
                        <td><input value={s.sku} onChange={(e) => updateSize(s.size, { sku: e.target.value })} aria-label={`SKU for size ${s.size}`} className="w-36 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-foam focus:border-soft/60 focus:outline-none" /></td>
                        <td><input type="number" min={0} value={s.stock} onChange={(e) => updateSize(s.size, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} aria-label={`Stock for size ${s.size}`} className="w-20 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-foam focus:border-soft/60 focus:outline-none" /></td>
                        <td><input type="number" min={0} value={s.price ?? ""} onChange={(e) => updateSize(s.size, { price: e.target.value === "" ? null : Number(e.target.value) })} aria-label={`Price override for size ${s.size}`} className="w-24 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-foam focus:border-soft/60 focus:outline-none" /></td>
                        <td><input value={s.barcode} onChange={(e) => updateSize(s.size, { barcode: e.target.value })} aria-label={`Barcode for size ${s.size}`} className="w-32 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-foam focus:border-soft/60 focus:outline-none" /></td>
                        <td><button type="button" onClick={() => toggleSize(s.size)} aria-label={`Remove size ${s.size}`} className="text-accent hover:underline">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ——— Size Recommendation (AI) ——— */}
            <div className="mt-6 rounded-lg border border-line-soft bg-white/[0.02] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mist">Size Recommendation</p>
              <label className="mt-3 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={v.sizeRecommendationEnabled}
                  onChange={(e) => set("sizeRecommendationEnabled", e.target.checked)}
                  className="h-4 w-4 accent-white"
                />
                <span className="text-sm text-foam">Enable Size Recommendation</span>
              </label>
              <p className="mt-1.5 text-xs leading-relaxed text-mist/70">
                Allow customers to get an AI-powered size recommendation for this product. Shown on the product page only when meaningful clothing sizes exist.
              </p>
            </div>
          </Section>
          )}

          {!pantLike && (<>
          {/* colors */}
          <div className="rounded-xl border border-line-soft bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-mist">Color Variants</p>
              <button type="button" onClick={addColor} className="rounded-lg border border-line-soft px-3 py-1.5 text-xs text-mist hover:text-foam">
                + Add color
              </button>
            </div>
            {v.colors.length > 0 && (
              <div className="mt-3 space-y-3">
                {v.colors.map((c, i) => (
                  <div key={i} className="rounded-lg border border-line-soft p-3">
                    <div className="grid gap-3 sm:grid-cols-6">
                      <input value={c.name} onChange={(e) => updateColor(i, { name: e.target.value })} placeholder="Color name (Black)" aria-label="Color name" className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none sm:col-span-2" />
                      <input type="color" value={c.hex || "#000000"} onChange={(e) => updateColor(i, { hex: e.target.value })} aria-label="Color hex value" className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent" />
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-foam">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadColorImage(i, e.target.files?.[0] ?? null)} />
                        {c.image ? "Replace image" : "Color image"}
                      </label>
                      <input type="number" min={0} value={c.stock} onChange={(e) => updateColor(i, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} placeholder="Stock" aria-label="Color stock" className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam focus:border-soft/60 focus:outline-none" />
                      <button type="button" onClick={() => removeColor(i)} className="rounded-lg border border-accent/40 px-3 text-xs text-accent">Remove</button>
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      <input value={c.sku} onChange={(e) => updateColor(i, { sku: e.target.value })} placeholder="Variant SKU" aria-label="Variant SKU" className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none" />
                      <input type="number" min={0} value={c.price ?? ""} onChange={(e) => updateColor(i, { price: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Price override" aria-label="Color price override" className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none" />
                      <input value={c.barcode} onChange={(e) => updateColor(i, { barcode: e.target.value })} placeholder="Barcode" aria-label="Color barcode" className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none" />
                    </div>
                    {c.image && <p className="mt-2 truncate text-xs text-mist/70">{c.image}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={generateVariants}
                disabled={v.colors.length === 0 && v.sizes.length === 0}
                className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-foam hover:bg-white/15 disabled:opacity-40"
              >
                Generate Variants
              </button>
              {v.variantInventory.length > 0 && (
                <button type="button" onClick={() => set("variantInventory", [])} className="rounded-lg border border-accent/40 px-3 py-2 text-xs text-accent">
                  Clear variants
                </button>
              )}
            </div>
          </div>

          {/* variant inventory matrix */}
          {v.variantInventory.length > 0 && (
            <div className="rounded-xl border border-line-soft bg-white/[0.02] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-mist">Variant Inventory Matrix</p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-line-soft">
                <table className="adm-table w-full min-w-[560px]">
                  <thead>
                    <tr>
                      <th>Color</th>
                      {v.sizes.map((s) => <th key={s.size}>{s.size}</th>)}
                      <th className="text-right">Row total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(v.variantInventory.map((r) => r.color))).map((color) => (
                      <tr key={color}>
                        <td className="font-semibold text-foam">{color}</td>
                        {v.sizes.map((s) => {
                          const row = v.variantInventory.find((r) => r.color === color && r.size === s.size);
                          const stock = row?.stock ?? 0;
                          return (
                            <td key={s.size}>
                              <input
                                type="number"
                                min={0}
                                value={stock}
                                onChange={(e) => setInvStock(color, s.size, Number(e.target.value))}
                                aria-label={`Stock for ${color} size ${s.size}`}
                                className={`w-16 rounded border bg-transparent px-2 py-1.5 text-xs focus:outline-none ${stock <= 0 ? "border-red-500/50 text-red-300" : stock <= v.lowStockThreshold ? "border-amber-500/50 text-amber-300" : "border-line text-foam"}`}
                              />
                            </td>
                          );
                        })}
                        <td className="text-right text-xs text-mist">
                          {v.variantInventory.filter((r) => r.color === color).reduce((a, r) => a + (r.stock || 0), 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-mist">
                <span className="adm-badge adm-badge--info">Total stock: {totalStock}</span>
                <span className="adm-badge adm-badge--neutral">Variants: {v.variantInventory.length}</span>
                {outOfStockCount > 0 && <span className="adm-badge adm-badge--danger">Out of stock: {outOfStockCount}</span>}
                {lowStockCount > 0 && <span className="adm-badge adm-badge--warn">Low stock: {lowStockCount}</span>}
              </div>
            </div>
          )}

          </>
          )}

          {/* 7 — Inventory */}
          <Section title="Inventory">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.trackInventory} onChange={(e) => set("trackInventory", e.target.checked)} className="h-4 w-4 accent-white" />
                Track inventory
              </label>
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.allowBackorders} onChange={(e) => set("allowBackorders", e.target.checked)} className="h-4 w-4 accent-white" />
                Allow backorders
              </label>
              <Field label="Low Stock Threshold">
                <input type="number" min={0} value={v.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Math.max(0, Math.floor(Number(e.target.value) || 0)))} className={inputCls} />
              </Field>
              <div className="flex items-end pb-2">
                {stockStatus === "out_of_stock" && <span className="adm-badge adm-badge--danger">Out of Stock</span>}
                {stockStatus === "low_stock" && <span className="adm-badge adm-badge--warn">Low Stock warning</span>}
                {stockStatus === "in_stock" && <span className="adm-badge adm-badge--success">In Stock</span>}
              </div>
              <Field label="Base Stock" hint="Used when no sizes/variants exist.">
                <input type="number" min={0} value={v.variantInventory.length === 0 && v.sizes.length === 0 ? v.stock : totalStock} onChange={(e) => set("stock", Math.max(0, Math.floor(Number(e.target.value) || 0)))} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* 8 — Shipping */}
          <Section title="Shipping">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product Weight (g)">
                <input type="number" min={0} value={v.weightGrams ?? ""} onChange={(e) => set("weightGrams", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Package Weight (g)">
                <input type="number" min={0} value={v.packageWeightGrams ?? ""} onChange={(e) => set("packageWeightGrams", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Length (cm)">
                <input type="number" min={0} value={v.lengthCm ?? ""} onChange={(e) => set("lengthCm", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Width (cm)">
                <input type="number" min={0} value={v.widthCm ?? ""} onChange={(e) => set("widthCm", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Height (cm)">
                <input type="number" min={0} value={v.heightCm ?? ""} onChange={(e) => set("heightCm", e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Shipping Class">
                <UiSelect
                  variant="admin"
                  searchable={false}
                  ariaLabel="Shipping Class"
                  value={v.shippingClass}
                  onChange={(val) => set("shippingClass", val)}
                  options={[
                    { value: "", label: "Standard" },
                    { value: "light", label: "Light" },
                    { value: "heavy", label: "Heavy" },
                  ]}
                />
              </Field>
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.freeShipping} onChange={(e) => set("freeShipping", e.target.checked)} className="h-4 w-4 accent-white" />
                Free shipping
              </label>
            </div>
          </Section>

          <Section title="Description">
            <Field label="Product Description">
              <textarea
                value={v.description}
                onChange={(e) => set("description", e.target.value)}
                rows={8}
                className={inputCls}
                placeholder="Describe the product for your customers…"
              />
            </Field>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onGenerateClick}
                disabled={aiBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-soft/40 bg-soft/10 px-4 py-2.5 text-sm font-semibold text-ice hover:bg-soft/20 disabled:opacity-60"
              >
                {aiBusy ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating Description…</>
                ) : generatedOnce ? (
                  <><RefreshCw className="h-4 w-4" /> Regenerate Description</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate Description</>
                )}
              </button>
              {aiNotice && <p aria-live="polite" className="text-xs text-mist">{aiNotice}</p>}
            </div>
            {confirmRegen && (
              <div role="dialog" aria-modal="true" aria-label="Confirm regeneration" className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-sm text-foam">Your current description has been edited. Regenerate and replace it?</p>
                <div className="mt-3 flex gap-3">
                  <button type="button" onClick={() => setConfirmRegen(false)} className="rounded-lg border border-line-soft px-4 py-2 text-xs text-mist hover:text-foam">Cancel</button>
                  <button
                    type="button"
                    onClick={() => { setConfirmRegen(false); void generateDescription(); }}
                    className="rounded-lg bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/30"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Rich content — shown on the public product page */}
          <Section title="Rich Content (shown on product page)">
            <Field label="Features" hint="One feature per line — displayed as bullet points on the product page.">
              <textarea
                value={v.features.join("\n")}
                onChange={(e) => set("features", e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
                rows={5}
                className={inputCls}
                placeholder={"Breathable cotton fabric\nMachine washable\nRegular fit"}
              />
            </Field>
            <div className="mt-5">
              <Field label="Specifications" hint="Displayed as a spec table on the product page.">
                <div className="space-y-2">
                  {v.specifications.map((spec, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={spec.label}
                        onChange={(e) => {
                          const next = [...v.specifications];
                          next[i] = { ...next[i], label: e.target.value };
                          set("specifications", next);
                        }}
                        placeholder="Label (e.g. Material)"
                        aria-label={`Specification ${i + 1} label`}
                        className={`${inputCls} !mt-0 w-1/3`}
                      />
                      <input
                        value={spec.value}
                        onChange={(e) => {
                          const next = [...v.specifications];
                          next[i] = { ...next[i], value: e.target.value };
                          set("specifications", next);
                        }}
                        placeholder="Value (e.g. 100% cotton)"
                        aria-label={`Specification ${i + 1} value`}
                        className={`${inputCls} !mt-0 flex-1`}
                      />
                      <button
                        type="button"
                        aria-label={`Remove specification ${i + 1}`}
                        onClick={() => set("specifications", v.specifications.filter((_, j) => j !== i))}
                        className="rounded-lg border border-line-soft px-3 text-xs text-mist hover:text-accent"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set("specifications", [...v.specifications, { label: "", value: "" }])}
                    className="inline-flex items-center gap-2 rounded-lg border border-line-soft px-4 py-2 text-xs text-mist hover:text-foam"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add specification
                  </button>
                </div>
              </Field>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-1">
              <Field label="Warranty" hint="Leave empty to hide the Warranty section on the product page.">
                <textarea value={v.warranty} onChange={(e) => set("warranty", e.target.value)} rows={2} className={inputCls} placeholder="e.g. 6 months manufacturer warranty against defects" />
              </Field>
              <Field label="Return Policy" hint="Leave empty to hide the Return Policy section on the product page.">
                <textarea value={v.returnPolicy} onChange={(e) => set("returnPolicy", e.target.value)} rows={2} className={inputCls} placeholder="e.g. 7-day easy return, unworn with tags attached" />
              </Field>
              <Field label="Delivery Information" hint="Leave empty to show the default delivery text on the product page.">
                <textarea value={v.deliveryInfo} onChange={(e) => set("deliveryInfo", e.target.value)} rows={2} className={inputCls} placeholder="e.g. Delivered in 2–4 working days inside Dhaka" />
              </Field>
            </div>
          </Section>

          {/* 9 — Organization */}
          <Section title="Organization">
            <Field label="Tags" hint="Press Enter to add. e.g. new-arrival, summer, cotton">
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {v.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-line-soft px-3 py-1 text-xs text-mist">
                    {tag}
                    <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => set("tags", v.tags.filter((t) => t !== tag))} className="text-accent hover:text-foam">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag…"
                  className="w-36 rounded-lg border border-line bg-transparent px-3 py-1.5 text-xs text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
                />
              </div>
            </Field>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="h-4 w-4 accent-white" />
                Featured product
              </label>
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.isNew} onChange={(e) => set("isNew", e.target.checked)} className="h-4 w-4 accent-white" />
                New arrival
              </label>
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.isBestSeller} onChange={(e) => set("isBestSeller", e.target.checked)} className="h-4 w-4 accent-white" />
                Best seller
              </label>
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.isOnSale} onChange={(e) => set("isOnSale", e.target.checked)} className="h-4 w-4 accent-white" />
                Sale
              </label>
            </div>
          </Section>

          {/* 10 — SEO */}
          <Section title="SEO">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SEO Title" hint={`${v.seoTitle.length}/60`}>
                <input value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={160} className={inputCls} placeholder={v.name || "Defaults to product name"} />
              </Field>
              <Field label="Canonical URL">
                <input value={v.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} className={inputCls} placeholder="https://…" />
              </Field>
              <Field label="SEO Description" className="sm:col-span-2" hint={`${v.seoDescription.length}/160`}>
                <textarea value={v.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={3} maxLength={500} className={inputCls} />
              </Field>
              <Field label="SEO Keywords" className="sm:col-span-2" hint="Comma separated">
                <input value={v.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="mt-4 rounded-lg border border-line-soft bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Search preview</p>
              <p className="mt-2 truncate text-sm text-[#8ab4f8]">{v.seoTitle || v.name || "Product title"}</p>
              <p className="text-xs text-emerald-400/80">yoursite.com/product/{v.slug || "your-product"}</p>
              <p className="mt-1 line-clamp-2 text-xs text-mist">{v.seoDescription || v.description || "Add an SEO description to control how this product appears in search results."}</p>
            </div>
          </Section>
        </div>

        {/* publishing sidebar */}
        <div className="space-y-6">
          <Section title="Publishing" defaultOpen>
            <Field label="Status">
              <UiSelect
                variant="admin"
                searchable={false}
                ariaLabel="Status"
                value={v.status}
                onChange={(val) => set("status", val as ProductStatus)}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "active", label: "Active" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </Field>
            <Field label="Visibility" className="mt-4">
              <UiSelect
                variant="admin"
                searchable={false}
                ariaLabel="Visibility"
                value={v.visibility}
                onChange={(val) => set("visibility", val as ProductVisibility)}
                options={[
                  { value: "online", label: "Online Store" },
                  { value: "hidden", label: "Hidden" },
                ]}
              />
            </Field>
            <div className="mt-5 space-y-3 border-t border-line-soft pt-5 text-xs text-mist">
              <p>Total stock: <span className="font-semibold text-foam">{totalStock}</span></p>
              {stockStatus === "low_stock" && <p className="text-amber-300">⚠ Low stock — at or below the {v.lowStockThreshold} threshold.</p>}
              {stockStatus === "out_of_stock" && <p className="text-red-300">⚠ Out of stock — all variants have zero stock.</p>}
              {dirty && !saved && <p>Unsaved changes are auto-saved as a local draft.</p>}
            </div>
          </Section>
        </div>
      </div>

      {/* footer actions */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-line-soft bg-[#0a1a2c]/90 px-4 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => void submit("active")}
          disabled={busy}
          className="rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-foam hover:bg-white/15 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save changes" : "Publish Product"}
        </button>
        {!isEdit && (
          <button
            type="button"
            onClick={() => void submit("draft")}
            disabled={busy}
            className="rounded-lg border border-line-soft px-6 py-3 text-sm text-mist hover:text-foam disabled:opacity-50"
          >
            Save as Draft
          </button>
        )}
        <button type="button" onClick={() => router.push("/admin/products")} className="rounded-lg border border-line-soft px-6 py-3 text-sm text-mist hover:text-foam">
          Cancel
        </button>
        <button type="button" onClick={resetForm} className="rounded-lg border border-accent/40 px-6 py-3 text-sm text-accent hover:bg-accent/10">
          Reset
        </button>
        {Object.values(fieldErrors).some(Boolean) && (
          <p className="text-xs text-red-300">Fix the highlighted fields above before publishing.</p>
        )}
        {error && !Object.values(fieldErrors).some(Boolean) && (
          <p role="alert" className="text-xs text-red-300">{error}</p>
        )}
      </div>
    </form>
  );
}

/* ——— small presentational helpers ——— */

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-line-soft bg-white/[0.02] p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-mist transition-colors hover:text-foam">
        {title}
        <ChevronDown className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

function Field({ label, children, error, hint, className = "" }: { label: string; children: React.ReactNode; error?: string; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <span className="block text-xs uppercase tracking-[0.18em] text-mist">{label}</span>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-mist/60">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}







