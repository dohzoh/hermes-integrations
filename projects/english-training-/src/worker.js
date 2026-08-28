/**
 * CloudFlare Worker entry point
 * Serves the English Training app
 */

import { generateSessionQuestions } from './questions.js';
import { gradeAnswer } from './grading.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API routes
    if (path === '/api/questions' && request.method === 'GET') {
      const count = parseInt(url.searchParams.get('count') || '10');
      const questions = generateSessionQuestions(count);
      return jsonResponse(questions);
    }

    if (path === '/api/grade' && request.method === 'POST') {
      const body = await request.json();
      const result = gradeAnswer(body.question, body.answer);
      return jsonResponse(result);
    }

    if (path === '/api/situations' && request.method === 'GET') {
      const { getSituations } = await import('./questions.js');
      return jsonResponse(getSituations());
    }

    // Static files
    if (path === '/' || path === '/index.html') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

const HTML_CONTENT = `<!DOCTYPE html>
<html><head><title>English Training</title></head>
<body>
<h1>English Training API</h1>
<p>GET /api/questions?count=10 - Generate session questions</p>
<p>POST /api/grade - Grade an answer</p>
<p>GET /api/situations - List available situations</p>
</body></html>`;