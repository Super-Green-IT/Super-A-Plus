export async function readJson(request: Request) {
  try {
    return { success: true as const, value: await request.json() }
  } catch {
    return { success: false as const }
  }
}
