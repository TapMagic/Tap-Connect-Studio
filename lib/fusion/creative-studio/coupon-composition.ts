/**
 * Coupon creative compositions — canonical children per layout preset.
 * Appearance uses shared Surface engines; this module defines structure only.
 */

import { nanoid } from "nanoid";
import {
  createCompositionNode,
  createEmptyCreativeComposition,
  type CreativeCompositionBlock,
  type CreativeCompositionNode,
} from "./composition";
import type { StarterCommerceLayout } from "./starter-preset-registry";

export type CouponLayoutGeometry =
  | "retail_card"
  | "perforated_stub"
  | "split_image"
  | "qr_first";

export type CouponChildRole =
  | "offer"
  | "headline"
  | "description"
  | "image"
  | "code"
  | "qr"
  | "expiration"
  | "terms"
  | "cta"
  | "badge"
  | "icon"
  | "stub_code"
  | "perforation";

function child(
  primitive: CreativeCompositionNode["primitive"],
  role: CouponChildRole,
  name: string,
  box: { x: number; y: number; width: number; height: number },
  props: Record<string, unknown>,
  zIndex: number
): CreativeCompositionNode {
  return createCompositionNode(primitive, {
    name,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    zIndex,
    props: {
      ...props,
      componentContentRole: role,
      presetChildRole: role,
    },
  });
}

export function buildCouponContentComposition(
  geometry: CouponLayoutGeometry,
  parentId: string,
  seed?: Record<string, unknown>
): CreativeCompositionBlock {
  const offer = String(seed?.offerValue || "20% OFF");
  const headline = String(seed?.headline || "SPECIAL OFFER");
  const description = String(seed?.description || "Thank you for visiting — enjoy this offer on your next visit.");
  const code = String(seed?.code || "SAVE20");
  const terms = String(seed?.terms || "One use per customer. Draft terms — review before publishing.");
  const expiration = String(seed?.expiration || "Expires soon");
  const cta = String(seed?.ctaLabel || "Use offer");
  const artwork = String(seed?.artworkSrc || "");

  let nodes: CreativeCompositionNode[] = [];

  if (geometry === "retail_card") {
    nodes = [
      child("text", "offer", "Offer", { x: 0.08, y: 0.08, width: 0.84, height: 0.18 }, { text: offer, fontSize: 28, fontWeight: 900, color: "#17100a" }, 1),
      child("text", "headline", "Headline", { x: 0.08, y: 0.28, width: 0.84, height: 0.12 }, { text: headline, fontSize: 14, fontWeight: 800, color: "#17100a" }, 2),
      child("text", "description", "Description", { x: 0.08, y: 0.42, width: 0.84, height: 0.14 }, { text: description, fontSize: 10, color: "#3f2a16" }, 3),
      child("text", "code", "Code", { x: 0.08, y: 0.6, width: 0.42, height: 0.12 }, { text: code, fontSize: 12, fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#ffffff", boxFill: "#17100a", boxPadding: 6, boxRadius: 6 }, 4),
      child("text", "expiration", "Expiration", { x: 0.54, y: 0.6, width: 0.38, height: 0.12 }, { text: expiration, fontSize: 9, color: "#3f2a16" }, 5),
      child("text", "terms", "Terms", { x: 0.08, y: 0.76, width: 0.5, height: 0.16 }, { text: terms, fontSize: 8, color: "#4a3420" }, 6),
      child("button", "cta", "CTA", { x: 0.6, y: 0.78, width: 0.32, height: 0.14 }, { label: cta, fill: "#17100a", labelColor: "#ffffff", radius: 999, actionType: "coupon" }, 7),
    ];
  } else if (geometry === "perforated_stub") {
    nodes = [
      child("text", "offer", "Offer", { x: 0.06, y: 0.12, width: 0.52, height: 0.22 }, { text: offer, fontSize: 26, fontWeight: 900, color: "#17100a" }, 1),
      child("text", "headline", "Headline", { x: 0.06, y: 0.38, width: 0.52, height: 0.14 }, { text: headline, fontSize: 12, fontWeight: 800, color: "#17100a" }, 2),
      child("text", "terms", "Terms", { x: 0.06, y: 0.7, width: 0.52, height: 0.2 }, { text: terms, fontSize: 7, color: "#4a3420" }, 3),
      child("shape", "perforation", "Perforation", { x: 0.62, y: 0.06, width: 0.02, height: 0.88 }, { fill: "transparent", borderStyle: "dashed", borderWidth: 2, borderColor: "#17100a66", couponPerforation: true }, 4),
      child("text", "stub_code", "Stub code", { x: 0.68, y: 0.14, width: 0.26, height: 0.18 }, { text: code, fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 800, color: "#17100a" }, 5),
      child("image", "qr", "QR", { x: 0.7, y: 0.38, width: 0.22, height: 0.36 }, { src: "", alt: "QR placeholder", qrManagementState: "setup_required", couponQrPlaceholder: true }, 6),
      child("text", "expiration", "Expiration", { x: 0.68, y: 0.78, width: 0.26, height: 0.12 }, { text: expiration, fontSize: 8, color: "#3f2a16" }, 7),
    ];
  } else if (geometry === "split_image") {
    nodes = [
      child("image", "image", "Image", { x: 0, y: 0, width: 0.42, height: 1 }, { src: artwork, alt: "Promotion image", objectFit: "cover", couponImageRegion: true }, 1),
      child("text", "offer", "Offer", { x: 0.48, y: 0.1, width: 0.46, height: 0.18 }, { text: offer, fontSize: 24, fontWeight: 900, color: "#17100a" }, 2),
      child("text", "headline", "Headline", { x: 0.48, y: 0.32, width: 0.46, height: 0.12 }, { text: headline, fontSize: 13, fontWeight: 800, color: "#17100a" }, 3),
      child("text", "description", "Description", { x: 0.48, y: 0.46, width: 0.46, height: 0.16 }, { text: description, fontSize: 9, color: "#3f2a16" }, 4),
      child("text", "code", "Code", { x: 0.48, y: 0.66, width: 0.28, height: 0.12 }, { text: code, fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#ffffff", boxFill: "#17100a", boxRadius: 6, boxPadding: 4 }, 5),
      child("button", "cta", "CTA", { x: 0.78, y: 0.66, width: 0.16, height: 0.12 }, { label: cta, fill: "#17100a", labelColor: "#f8fafc", radius: 8 }, 6),
      child("text", "terms", "Terms", { x: 0.48, y: 0.84, width: 0.46, height: 0.1 }, { text: terms, fontSize: 7, color: "#4a3420" }, 7),
    ];
  } else {
    // qr_first
    nodes = [
      child("image", "qr", "QR", { x: 0.28, y: 0.06, width: 0.44, height: 0.38 }, { src: "", alt: "Scan to claim", qrManagementState: "setup_required", couponQrPlaceholder: true }, 1),
      child("text", "offer", "Offer", { x: 0.08, y: 0.48, width: 0.84, height: 0.14 }, { text: offer, fontSize: 24, fontWeight: 900, color: "#17100a", textAlign: "center" }, 2),
      child("text", "headline", "Headline", { x: 0.08, y: 0.62, width: 0.84, height: 0.1 }, { text: headline, fontSize: 12, fontWeight: 800, color: "#17100a", textAlign: "center" }, 3),
      child("text", "code", "Code", { x: 0.22, y: 0.74, width: 0.56, height: 0.1 }, { text: code, fontSize: 12, fontFamily: "ui-monospace, monospace", fontWeight: 800, color: "#17100a", textAlign: "center" }, 4),
      child("text", "description", "Instructions", { x: 0.1, y: 0.86, width: 0.8, height: 0.1 }, { text: "Scan the code or enter the offer code to claim.", fontSize: 8, color: "#3f2a16", textAlign: "center" }, 5),
    ];
  }

  return {
    ...createEmptyCreativeComposition(`${parentId}-content`),
    id: `${parentId}-content-${nanoid(4)}`,
    label: `coupon ${geometry} content`,
    nodes,
  };
}

export function couponSurfaceDefaults(geometry: CouponLayoutGeometry): Record<string, unknown> {
  const shared = {
    componentKind: "coupon",
    mask: "coupon",
    layoutVariant: geometry,
    ownerReviewRequired: true,
    accessibleLabel: "Coupon",
    fill: "#fbbf24",
    gradientFill: "linear-gradient(135deg,#fcd34d,#f97316,#f43f5e)",
    gradientStart: "#fcd34d",
    gradientEnd: "#f43f5e",
    gradientAngle: 135,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderStyle: "solid",
    radius: 18,
    materialPreset: "flat",
  };
  if (geometry === "perforated_stub") {
    return { ...shared, perforated: true, width: 0.88, height: 0.26, radius: 14 };
  }
  if (geometry === "split_image") {
    return { ...shared, showArtwork: true, width: 0.9, height: 0.34, radius: 16 };
  }
  if (geometry === "qr_first") {
    return { ...shared, qrFirst: true, width: 0.72, height: 0.4, radius: 20 };
  }
  return { ...shared, width: 0.84, height: 0.32 };
}

export function syncCouponParentFromChildren(
  parent: CreativeCompositionNode,
  content: CreativeCompositionBlock | null | undefined
): CreativeCompositionNode {
  if (!content?.nodes?.length) return parent;
  const byRole = (role: CouponChildRole) =>
    content.nodes.find((node) => String(node.props.componentContentRole || node.props.presetChildRole) === role);
  const offer = byRole("offer");
  const headline = byRole("headline");
  const code = byRole("code") || byRole("stub_code");
  const terms = byRole("terms");
  const image = byRole("image");
  const description = byRole("description");
  return {
    ...parent,
    props: {
      ...parent.props,
      offerValue: offer ? String(offer.props.text || parent.props.offerValue || "") : parent.props.offerValue,
      headline: headline ? String(headline.props.text || parent.props.headline || "") : parent.props.headline,
      code: code ? String(code.props.text || parent.props.code || "") : parent.props.code,
      terms: terms ? String(terms.props.text || parent.props.terms || "") : parent.props.terms,
      description: description ? String(description.props.text || parent.props.description || "") : parent.props.description,
      artworkSrc: image ? String(image.props.src || parent.props.artworkSrc || "") : parent.props.artworkSrc,
      contentComposition: content,
    },
  };
}

export function couponThumbnailSignature(geometry: CouponLayoutGeometry): {
  regions: string[];
  label: string;
} {
  switch (geometry) {
    case "perforated_stub":
      return { regions: ["offer", "perforation", "stub", "qr"], label: "Perforated stub" };
    case "split_image":
      return { regions: ["image", "offer", "content"], label: "Split image" };
    case "qr_first":
      return { regions: ["qr", "offer", "code"], label: "QR first" };
    default:
      return { regions: ["offer", "headline", "code", "cta"], label: "Retail card" };
  }
}

export function geometryFromStarter(layout: StarterCommerceLayout): CouponLayoutGeometry {
  const g = layout.geometry;
  if (g === "perforated_stub" || g === "split_image" || g === "qr_first" || g === "retail_card") return g;
  return "retail_card";
}
