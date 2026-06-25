// DD-252 (M3-S02 T04): Shared client-side wrapper für PATCH /api/backlog/:id/status.
// Wirft Error mit code+status, damit StatusPicker den Toast surfacen kann.

export async function patchIssueStatus(itemId, status, notes) {
  const body = { status }
  if (notes) body.notes = notes
  const res = await fetch(`/api/backlog/${itemId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return null
  let data = null
  let parseError = null
  try { data = await res.json() } catch (e) { parseError = e }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.code = data?.code
    err.status = res.status
    throw err
  }
  if (parseError) {
    const err = new Error('Server lieferte fehlerhaftes JSON: ' + parseError.message)
    err.code = 'MALFORMED_JSON'
    err.status = res.status
    throw err
  }
  return data
}
