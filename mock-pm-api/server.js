/**
 * Local mock for the Prompt Management API.
 * Implements the /api/v3/prompt-projects/* endpoints used by EvalBuilder.
 * Data is persisted to mock-pm-api/data.json between restarts.
 *
 * Start with: npm run mock-pm
 * Runs on:    http://localhost:3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function versionName(id) {
  return `Version ${id}`;
}

// ---------------------------------------------------------------------------
// Request body reader
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function notFound(res, msg) { send(res, 404, { error: msg ?? 'Not found' }); }
function badRequest(res, msg) { send(res, 400, { error: msg ?? 'Bad request' }); }

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/v3/prompt-projects
 * Returns all projects.
 */
function listProjects(res) {
  const data = loadData();
  send(res, 200, { items: data.projects });
}

/**
 * GET /api/v3/prompt-projects/:projectId/versions
 * Returns versions for a project.
 */
function listVersions(res, projectId) {
  const data = loadData();
  const versions = data.versions[projectId];
  if (!versions) return send(res, 200, { items: [] });
  send(res, 200, { items: versions });
}

/**
 * GET /api/v3/prompt-projects/:projectId/versions/:versionId
 * Returns the content of a specific version.
 */
function getVersion(res, projectId, versionId) {
  const data = loadData();
  const key = `${projectId}:${versionId}`;
  const content = data.versionContent[key];
  if (!content) {
    return send(res, 200, {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: '{{user_message}}' },
      ],
      variables: ['user_message'],
      vendor: 'openai',
      model: 'gpt-4.1-2025-04-14',
      params: { temperature: 0, max_tokens: 3000 },
    });
  }
  send(res, 200, content);
}

/**
 * POST /api/v3/prompt-projects/:projectId/versions
 * Creates a new version from baseVersionId + updated content.
 * Body: { baseVersionId, messages, variables, vendor, model, params }
 */
async function createVersion(req, res, projectId) {
  let body;
  try { body = await readBody(req); }
  catch { return badRequest(res, 'Invalid JSON body'); }

  const data = loadData();

  // Auto-create project if it doesn't exist yet
  if (!data.projects.find((p) => p.id === projectId)) {
    data.projects.push({ id: projectId, name: `Project ${projectId}` });
    data.versions[projectId] = [];
  }

  const newId = generateId();
  const newName = versionName(newId);

  // Store version metadata
  if (!data.versions[projectId]) data.versions[projectId] = [];
  data.versions[projectId].unshift({ id: newId, name: newName });

  // Store version content (strip baseVersionId from the stored payload)
  const { baseVersionId: _base, ...content } = body;
  data.versionContent[`${projectId}:${newId}`] = content;

  saveData(data);

  console.log(`[mock-pm] Created version ${newId} for project ${projectId}`);
  send(res, 200, { versionId: newId, name: newName });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const API_PREFIX = '/api/v3';

// Matches /api/v3/prompt-projects
const RE_PROJECTS = new RegExp(`^${API_PREFIX}/prompt-projects(\\?.*)?$`);
// Matches /api/v3/prompt-projects/:id/versions
const RE_VERSIONS = new RegExp(`^${API_PREFIX}/prompt-projects/([^/]+)/versions(\\?.*)?$`);
// Matches /api/v3/prompt-projects/:id/versions/:vid
const RE_VERSION = new RegExp(`^${API_PREFIX}/prompt-projects/([^/]+)/versions/([^/?]+)(\\?.*)?$`);

async function router(req, res) {
  const { method, url } = req;
  const pathname = url.split('?')[0];

  // CORS pre-flight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
    return res.end();
  }

  let m;

  if ((m = RE_VERSION.exec(pathname))) {
    const [, projectId, versionId] = m;
    if (method === 'GET') return getVersion(res, projectId, versionId);
    return send(res, 405, { error: 'Method not allowed' });
  }

  if ((m = RE_VERSIONS.exec(pathname))) {
    const [, projectId] = m;
    if (method === 'GET') return listVersions(res, projectId);
    if (method === 'POST') return createVersion(req, res, projectId);
    return send(res, 405, { error: 'Method not allowed' });
  }

  if (RE_PROJECTS.test(pathname)) {
    if (method === 'GET') return listProjects(res);
    return send(res, 405, { error: 'Method not allowed' });
  }

  notFound(res, `No mock route for ${method} ${url}`);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

http.createServer(router).listen(PORT, () => {
  console.log(`\n[mock-pm] Prompt Management mock API running at http://localhost:${PORT}`);
  console.log(`[mock-pm] Data stored in: ${DATA_FILE}`);
  console.log(`[mock-pm] Endpoints:`);
  console.log(`  GET  /api/v3/prompt-projects`);
  console.log(`  GET  /api/v3/prompt-projects/:id/versions`);
  console.log(`  GET  /api/v3/prompt-projects/:id/versions/:vid`);
  console.log(`  POST /api/v3/prompt-projects/:id/versions\n`);
});
