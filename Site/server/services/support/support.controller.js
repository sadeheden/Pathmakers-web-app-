// services/support/support.controller.js
import { connectDB } from '../auth/auth.db.js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

// ---------- helpers ----------
const isDev = process.env.NODE_ENV !== 'production';
const asBool = (v) => String(v ?? '').trim().toLowerCase() === 'true';
const isDryRun = asBool(process.env.EMAIL_DRY_RUN);

const requireEnv = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

// Build transporter (respects DRY RUN)
const buildTransporter = () => {
  if (isDryRun) {
    // No network calls; Nodemailer returns JSON of what would be sent
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: asBool(process.env.SMTP_SECURE),
      auth: { user: requireEnv('EMAIL_USER'), pass: requireEnv('EMAIL_PASS') },
      logger: true,
      debug: true,
    });
  }

  // Gmail (requires App Password)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: requireEnv('EMAIL_USER'), pass: requireEnv('EMAIL_PASS') },
    logger: true,
    debug: true,
  });
};

let transporter = buildTransporter();

const asObjectId = (id) => (/^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null);

// ---------- controllers ----------
export const getAllSupportRequests = async (_req, res) => {
  try {
    const db = await connectDB();
    const support = db.collection('support');
    const requests = await support.find({}).toArray();
    res.json(requests);
  } catch (error) {
    console.error('❌ Error getting support requests:', error);
    res.status(500).json({ error: 'Failed to fetch support requests' });
  }
};

export const createSupportRequest = async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }

    const db = await connectDB();
    const support = db.collection('support');

    const result = await support.insertOne({
      name,
      email,
      message,
      status: 'pending',
      createdAt: new Date(),
    });

    res.status(201).json({ message: 'Support request created', id: result.insertedId });
  } catch (error) {
    console.error('❌ Error creating support request:', error);
    res.status(500).json({ error: 'Failed to create support request' });
  }
};

export const updateSupportStatus = async (req, res) => {
  try {
    const oid = asObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid id' });

    const { status } = req.body || {};
    if (!['pending', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = await connectDB();
    const support = db.collection('support');

    const result = await support.updateOne({ _id: oid }, { $set: { status } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Support request not found' });
    }

    res.json({ message: 'Support status updated' });
  } catch (error) {
    console.error('❌ Error updating support status:', error);
    res.status(500).json({ error: 'Failed to update support status' });
  }
};

// Reply (send or simulate)
export const replyToSupportRequest = async (req, res) => {
  const scope = '[replyToSupportRequest]';
  try {
    const oid = asObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid id' });

    const { subject, text, html, markResolved = false } = req.body || {};
    if (!subject || (!text && !html)) {
      return res.status(400).json({ error: 'subject and text/html are required' });
    }

    // Only require creds if not dry-run
    if (!isDryRun) {
      requireEnv('EMAIL_USER');
      requireEnv('EMAIL_PASS');
    }

    const db = await connectDB();
    const col = db.collection('support');
    const ticket = await col.findOne({ _id: oid });
    if (!ticket) return res.status(404).json({ error: 'Support message not found' });
    if (!ticket.email) return res.status(400).json({ error: 'Ticket has no email to reply to' });

    const fromAddress = process.env.EMAIL_USER;

    const simulate = () => ({
      messageId: `dryrun-${Date.now()}`,
      message: { from: fromAddress, to: ticket.email, subject, text, html },
      dryRun: true,
    });

    let info;

    if (isDryRun) {
      info = simulate();
      console.log('✉️ [DRY-RUN] Simulated email send:', info.message);
    } else {
      // Optional verify
      try {
        await transporter.verify();
      } catch (verifyErr) {
        console.warn(`${scope} transport verify failed (may still send):`, verifyErr?.message || verifyErr);
      }

      try {
        info = await transporter.sendMail({
          from: fromAddress,
          to: ticket.email,
          subject,
          text: text || undefined,
          html: html || undefined,
          replyTo: process.env.EMAIL_FROM || fromAddress,
        });
      } catch (sendErr) {
        // 🔁 Fallback to simulation if auth fails (EAUTH / 535)
        const code = (sendErr?.code || '').toString().toUpperCase();
        const resp = (sendErr?.response || '').toUpperCase();
        if (code === 'EAUTH' || resp.includes('5.7.8') || resp.includes('BAD CREDENTIALS') || resp.includes('AUTH')) {
          console.error('Send Error, falling back to DRY-RUN simulation:', sendErr?.message || sendErr);
          info = simulate();
        } else {
          throw sendErr;
        }
      }
    }

    // Persist reply on the ticket
    const update = {
      $push: {
        replies: {
          at: new Date(),
          subject,
          text: text || null,
          html: html || null,
          messageId: info?.messageId || null,
          from: fromAddress,
          dryRun: Boolean(info?.dryRun) || isDryRun,
        },
      },
    };
    if (markResolved) update.$set = { status: 'resolved' };

    await col.updateOne({ _id: oid }, update);

    // Response to client
    const payload = {
      ok: true,
      messageId: info?.messageId || null,
      preview: info?.message || undefined, // present only for dry-run/fallback
      dryRun: Boolean(info?.dryRun) || isDryRun,
    };

    res.json(payload);
  } catch (err) {
    console.error('SMTP response:', err?.response);
    console.error('replyToSupportRequest error:', err);
    res.status(500).json({
      error: 'Failed to send reply',
      details: err?.message || String(err),
      code: err?.code || err?.responseCode || null,
    });
  }
};
// Health-check for mail transport (works with DRY_RUN too)
export const verifyEmailTransport = async (_req, res) => {
  try {
    const isDryRun = String(process.env.EMAIL_DRY_RUN || 'false') === 'true';
    if (isDryRun) {
      return res.json({ ok: true, dryRun: true, note: 'EMAIL_DRY_RUN=true - no SMTP login attempted' });
    }

    // will throw if creds/connection invalid
    await transporter.verify();

    // show basic transport info
    const info = {
      ok: true,
      service: transporter.options?.service || null,
      host: transporter.options?.host || null,
      port: transporter.options?.port || null,
      secure: transporter.options?.secure || false,
    };
    res.json(info);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || String(err),
      code: err?.code || err?.responseCode || null,
    });
  }
};
