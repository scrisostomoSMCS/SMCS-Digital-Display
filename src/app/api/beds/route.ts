export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(process.env.BED_DATA_URL!, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Response.json({ ok: true, ...data });
  } catch (err) {
    console.error('Bed data fetch failed:', err);
    return Response.json({ ok: false }, { status: 200 });
  }
}