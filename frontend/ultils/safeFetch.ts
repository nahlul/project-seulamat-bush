export async function safeFetch(
  input: RequestInfo,
  init?: RequestInit
) {
  const res = await fetch(input, init)

  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  }
}
