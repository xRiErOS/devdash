// Aggregator — importiert alle Route-Gruppen (Seiteneffekt: register()-Aufrufe).
// Eine Datei je Entity-Gruppe unter openapi/routes/. Reihenfolge = Generat-Reihenfolge.

import './routes/system.routes.js';
import './routes/projects.routes.js';
import './routes/tags.routes.js';
import './routes/backlog.routes.js';
import './routes/sprints.routes.js';
import './routes/milestones.routes.js';
import './routes/memory.routes.js';
import './routes/sops.routes.js';
import './routes/user-notes.routes.js';
import './routes/documents.routes.js';
