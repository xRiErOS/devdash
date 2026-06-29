/**
 * @typedef {Object} ApiClientConfig
 * @property {string} baseUrl
 * @property {string|number} [projectId]
 * @property {string} [token]        - X-Devd-Token (DD-285, no-op wenn Backend ungesetzt)
 * @property {typeof fetch} [fetchImpl]
 */

/**
 * @typedef {Object} ApiClient
 * @property {(method:string,path:string,body?:any,opts?:{projectId?:string|number,headers?:Record<string,string>})=>Promise<any>} request
 * @property {(extra?:Record<string,string>)=>Record<string,string>} buildHeaders
 * @property {(path:string,opts?:object)=>Promise<any>} get
 * @property {(path:string,body?:any,opts?:object)=>Promise<any>} post
 * @property {(path:string,body?:any,opts?:object)=>Promise<any>} patch
 * @property {(path:string,body?:any,opts?:object)=>Promise<any>} put
 * @property {(path:string,body?:any,opts?:object)=>Promise<any>} del
 * @property {(path:string,formData:FormData,opts?:{projectId?:string|number})=>Promise<any>} upload
 */

/**
 * Geteilter REST-Client für CLI und TUI. Reine fetch-Logik, kein process.exit/console.
 * @param {ApiClientConfig} cfg
 * @returns {ApiClient}
 */
export function createApiClient(cfg) {
  const { baseUrl, projectId, token, fetchImpl = fetch } = cfg

  function buildHeaders(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra }
    if (projectId != null && h['X-Project-Id'] == null) h['X-Project-Id'] = String(projectId)
    if (token) h['X-Devd-Token'] = token
    return h
  }

  /**
   * @param {string} method
   * @param {string} path
   * @param {any} [body]
   * @param {{projectId?: string|number, headers?: Record<string,string>}} [opts]
   */
  async function request(method, path, body, opts = {}) {
    const extra = { ...(opts.headers || {}) }
    if (opts.projectId != null) extra['X-Project-Id'] = String(opts.projectId)
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: buildHeaders(extra),
      body: body != null ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || res.statusText
      throw new Error(`${method} ${path} → ${res.status}: ${msg}`)
    }
    return data
  }

  /**
   * Multipart/form-data POST. Lets fetch set the Content-Type (with boundary)
   * by omitting it from the headers. Caller builds the FormData — this method
   * does not touch the filesystem.
   * @param {string} path
   * @param {FormData} formData
   * @param {{projectId?: string|number}} [opts]
   */
  async function upload(path, formData, opts = {}) {
    const extra = {}
    if (opts.projectId != null) extra['X-Project-Id'] = String(opts.projectId)
    const headers = buildHeaders(extra)
    // Remove Content-Type so fetch can set multipart/form-data; boundary=... itself.
    // multer fails to parse the boundary if a JSON Content-Type is present.
    delete headers['Content-Type']
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || res.statusText
      throw new Error(`POST ${path} → ${res.status}: ${msg}`)
    }
    return data
  }

  return {
    request,
    buildHeaders,
    get: (p, opts) => request('GET', p, undefined, opts),
    post: (p, b, opts) => request('POST', p, b, opts),
    patch: (p, b, opts) => request('PATCH', p, b, opts),
    put: (p, b, opts) => request('PUT', p, b, opts),
    del: (p, b, opts) => request('DELETE', p, b, opts),
    upload,
  }
}
