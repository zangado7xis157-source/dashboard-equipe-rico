const fs = require('fs');
const path = require('path');
const Module = require('module');

const filename = path.join(__dirname, 'server.js');
let code = fs.readFileSync(filename, 'utf8');
const bad = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ5dGp3d2dza2lseWdheWpyeWNmayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzkwOTczODU1LCJleHAiOjIxMDY1NDk4NTV9.avTRZstKk41cVH9oQAqXxdPVw8Q6jv9ARXabuK_4HrM";
const good = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0and3Z3NraWx5Z2F5anJ5Y2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NzM4NTUsImV4cCI6MjEwNjU0OTg1NX0.avTRZstKk41cVH9oQAqXxdPVw8Q6jv9ARXabuK_4HrM";
if (!code.includes(bad)) throw new Error('Supabase token alvo nao encontrado');
code = code.replace(bad, good);
const m = new Module(filename, module);
m.filename = filename;
m.paths = Module._nodeModulePaths(__dirname);
m._compile(code, filename);
