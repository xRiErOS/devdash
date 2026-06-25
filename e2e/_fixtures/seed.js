// DD-266 (T14): HTTP-Helper für E2E-Tests, die zur Laufzeit weitere Daten anlegen wollen.
const API = process.env.E2E_BASE_URL || 'http://localhost:5555'

const headers = {
  'Content-Type': 'application/json',
  'X-Project-Id': '2',
}

export async function fetchMilestones(query = '') {
  const res = await fetch(`${API}/api/milestones${query ? '?' + query : ''}`, { headers })
  if (!res.ok) throw new Error(`fetchMilestones: ${res.status}`)
  return res.json()
}

export async function createMilestone(payload) {
  const res = await fetch(`${API}/api/milestones`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`createMilestone: ${res.status}`)
  return res.json()
}

export async function deleteMilestone(id) {
  return fetch(`${API}/api/milestones/${id}`, { method: 'DELETE', headers })
}

export async function findMilestoneByName(name) {
  const data = await fetchMilestones('status=all')
  return data.find(m => m.name === name)
}
