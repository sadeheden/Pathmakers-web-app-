// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- Env loading ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '../client/dist');

// Load .env first, then let .env.local override if present
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

if (!process.env.VITE_HF_TOKEN) {
  console.error('⚠️ VITE_HF_TOKEN is missing. Add it to .env or .env.local');
}

const hf = new HfInference(process.env.HF_TOKEN);
const app = express();
const PORT = process.env.PORT || 4000;

// ---------- Middleware ----------
// FIXED: Allow your static site domain
app.use(cors({
  origin: [
    'https://pathmakers-web-app.onrender.com',  // Your static site
    'https://pathmakers-web-app-site.onrender.com', // Your backend (for development)
    'http://localhost:3000',  // Local development
    'http://localhost:5173'   // Vite dev server
  ],
  credentials: true
}));
app.use(express.json());

// ---------- Hugging Face chat (robust) ----------
app.post('/api/chat', async (req, res) => {
  const hfToken = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN;
  if (!hfToken) return res.status(500).json({ error: 'Missing HF_TOKEN env var' });

  try {
    // 1) normalize & drop system
    const raw = (req.body && req.body.messages) || [];
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ error: 'messages[] is required' });
    }
    const allowedRoles = new Set(['user', 'assistant']);
    const messages = raw.map((m) => {
      const role = m?.role === 'system' ? 'user' : (allowedRoles.has(m?.role) ? m.role : 'user');
      const content =
        typeof m?.content === 'string' ? m.content
        : Array.isArray(m?.content) ? m.content.map(p => (typeof p === 'string' ? p : p?.text ?? '')).join('')
        : (m?.content?.text ?? '');
      return { role, content: String(content || '').trim() };
    }).filter(m => m.content.length > 0);

    if (!messages.length) return res.status(400).json({ error: 'All messages were empty after normalization' });

    // 2) model candidates (env first, then public fallbacks)
    const candidates = [
      process.env.HF_MODEL,
      // Public, commonly available instruct models:
      'Qwen/Qwen2.5-7B-Instruct',
      'mistralai/Mistral-Nemo-Instruct-2407',
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
    ].filter(Boolean);

    // 3) call helper with timeout
    const callWithTimeout = (model, msgs, ms = 20000) =>
      new Promise((resolve, reject) => {
        const ac = new AbortController();
        const t = setTimeout(() => {
          ac.abort();
          reject(Object.assign(new Error(`Timeout after ${ms}ms for model ${model}`), { status: 504 }));
        }, ms);

        hf.chatCompletion({
          model,
          messages: msgs,
          temperature: 0.5,
          max_tokens: 512, // a bit smaller is friendlier to providers
          top_p: 0.9,
          signal: ac.signal,
        })
          .then(r => { clearTimeout(t); resolve(r); })
          .catch(e => { clearTimeout(t); reject(e); });
      });

    // 4) try models with one retry on 5xx/timeout
    let result = null;
    let lastErr = null;

    for (const model of candidates) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const r = await callWithTimeout(model, messages, 20000);
          const msg = r?.choices?.[0]?.message || {};
          const content = Array.isArray(msg.content)
            ? msg.content.map(p => (typeof p === 'string' ? p : p?.text ?? '')).join('')
            : (msg.content ?? '');
          if (!content) throw new Error(`Provider returned empty content for model ${model}`);
          result = { model, content, role: msg.role || 'assistant' };
          break; // success
        } catch (e) {
          lastErr = e;
          const status = e?.response?.status || e?.status;
          const retriable = !status || status >= 500; // network/5xx
          if (attempt === 1 && retriable) {
            await new Promise(r => setTimeout(r, 700));
            continue; // retry same model
          }
          break; // move to next model
        }
      }
      if (result) break;
    }

    if (!result) {
      let providerText = '';
      try { providerText = await lastErr?.response?.text?.(); } catch {}
      const status = lastErr?.response?.status || lastErr?.status || 502;
      console.error('HF chat error (all models failed):', status, lastErr?.message, providerText || lastErr);
      return res.status(status).json({
        error: lastErr?.message || 'Failed to perform inference',
        details: providerText || 'Upstream provider returned an error (gated model / busy / rate-limited).',
        hints: [
          'Try Qwen/Qwen2.5-7B-Instruct or Mistral-Nemo-Instruct-2407',
          'Lower max_tokens',
          'Ensure your HF token has model access',
        ],
      });
    }

    return res.json({ model: result.model, choices: [{ message: { role: result.role, content: result.content } }] });
  } catch (err) {
    let details = '';
    try { details = await err?.response?.text?.(); } catch {}
    const status = err?.response?.status || err?.status || 500;
    console.error('HF chat error (handler):', status, err?.message, details || err);
    return res.status(status).json({ error: err?.message || 'HF error', details: details || undefined });
  }
});

// ---------- Routers ----------
import citiesRouter from './services/cities/cities.router.js';
import attractionRoutes from './services/attraction/att.router.js';
import flightsRoutes from './services/flights/flights.router.js';
import hotelRoutes from './services/hotel/hotel.router.js';
import authRouter from './services/auth/auth.router.js';
import uploadRouter from './services/upload/upload.router.js';
import managerRoutes from './services/manager/manager.routes.js';
import travelRoutes from './services/travel/travel.routes.js';
import supportRouter from './services/support/support.router.js';
import ordersRouter from './services/order/order.router.js';
import orders2Router from './services/orders2/orders2.router.js';
import newsletterRouter from './services/newsletter/newsletter.router.js';
import orderCancellationRoutes from './services/orderCancellation/orderCancellation.routes.js';

// ---------- API Endpoints (BEFORE static files) ----------
app.use('/api/cities', citiesRouter);
app.use('/api/attractions', attractionRoutes);
app.use('/api/flights', flightsRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/manager', managerRoutes);
app.use('/api/travel/cities', travelRoutes);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/travel', travelRoutes);
app.use('/api/order', ordersRouter);
app.use('/api/orders2', orders2Router);
app.use('/api/support', supportRouter);
app.use('/api/order', orderCancellationRoutes);

// MOVED: Serve static files AFTER API routes
app.use(express.static(distPath));

// Serve React index.html for any unknown route (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 🛑 404 for API routes only (this won't be reached due to * route above)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: '🔍 API route not found', path: req.originalUrl });
});

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`🚀 Server listening at: http://localhost:${PORT}`);
  console.log(`📡 API available at: http://localhost:${PORT}/api/`);
});