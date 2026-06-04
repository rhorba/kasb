import { auth } from "@/auth";
import { parseReceiptText } from "@/lib/ocr/receipt-parser";
import type { ReceiptDraft } from "@/lib/ocr/types";
import { NextResponse } from "next/server";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY ?? "";

async function callGoogleVision(imageBase64: string): Promise<string> {
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    },
  );
  if (!res.ok) throw new Error(`Vision API error ${res.status}`);
  const json = await res.json();
  return (
    (json as { responses?: Array<{ fullTextAnnotation?: { text?: string } }> }).responses?.[0]
      ?.fullTextAnnotation?.text ?? ""
  );
}

export async function POST(req: Request) {
  // Auth required
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Parse multipart form — expect field "image"
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  let draft: ReceiptDraft;

  if (GOOGLE_VISION_API_KEY) {
    try {
      const rawText = await callGoogleVision(base64);
      draft = parseReceiptText(rawText);
    } catch {
      // Fallback: return low-confidence empty draft; user fills manually
      draft = {
        amountCentimes: null,
        description: null,
        date: null,
        confidence: "low",
        rawText: "",
      };
    }
  } else {
    // No API key configured — return empty draft (user fills manually)
    draft = {
      amountCentimes: null,
      description: null,
      date: null,
      confidence: "low",
      rawText: "",
    };
  }

  return NextResponse.json(draft);
}
