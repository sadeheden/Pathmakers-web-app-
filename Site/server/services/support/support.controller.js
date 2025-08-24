// services/support/support.controller.js
import { connectDB } from '../auth/auth.db.js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

// ---------- helpers ----------
const isDev = process.env.NODE_ENV !== 'production';
const requireEnv = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

// DRY-RUN: set EMAIL_DRY_RUN=true to avoid real SMTP while testing
const buildTransporter = () => {
  if (String(process.env.EMAIL_DRY_RUN || 'false') === 'true') {
    // no network calls; Nodemailer returns a JSON preview
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: requireEnv('EMAIL_USER'),
        pass: requireEnv('EMAIL_PASS'),
      },
      logger: true,
      debug: true,
    });
  }

  // Gmail service (requires App Password)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: requireEnv('EMAIL_USER'),
      pass: requireEnv('EMAIL_PASS'),
    },
    logger: true,
    debug: true,
  });
};

const transporter = buildTransporter();

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

// Reply and send email
export const replyToSupportRequest = async (req, res) => {
  const scope = `[replyToSupportRequest]`;
  try {
    const oid = asObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid id' });

    const { subject, text, html, markResolved = false } = req.body || {};
    if (!subject || (!text && !html)) {
      return res.status(400).json({ error: 'subject and text/html are required' });
    }

    // Validate env early
    if (String(process.env.EMAIL_DRY_RUN || 'false') !== 'true') {
      requireEnv('EMAIL_USER');
      requireEnv('EMAIL_PASS');
    }

    const db = await connectDB();
    const col = db.collection('support');
    const ticket = await col.findOne({ _id: oid });
    if (!ticket) return res.status(404).json({ error: 'Support message not found' });
    if (!ticket.email) return res.status(400).json({ error: 'Ticket has no email to reply to' });

    // Always send FROM the authenticated mailbox (Gmail requirement)
    const fromAddress = process.env.EMAIL_USER;

    // Optional: verify transport (will log details even if it fails)
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.warn(`${scope} transport verify failed (may still send):`, verifyErr?.message || verifyErr);
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to: ticket.email,
      subject,
      text: text || undefined,
      html: html || undefined,
      // replyTo is fine if you want:
      replyTo: process.env.EMAIL_FROM || fromAddress,
    });

    const update = {
      $push: {
        replies: {
          at: new Date(),
          subject,
          text: text || null,
          html: html || null,
          messageId: info?.messageId || null,
          from: fromAddress,
          dryRun: String(process.env.EMAIL_DRY_RUN || 'false') === 'true',
        },
      },
    };
    if (markResolved) update.$set = { status: 'resolved' };

    await col.updateOne({ _id: oid }, update);

    // If DRY_RUN, expose the preview to client for debugging
    const payload = { ok: true, messageId: info?.messageId || null };
    if (info?.message && String(process.env.EMAIL_DRY_RUN || 'false') === 'true') {
      payload.preview = info.message; // JSON containing what would be sent
    }

    res.json(payload);
  } catch (err) {
    // Log everything server-side
    console.error('SMTP response:', err?.response);
    console.error('replyToSupportRequest error:', err);

    // Send actionable info to client
    res.status(500).json({
      error: 'Failed to send reply',
      details: err?.message || String(err),
      code: err?.code || err?.responseCode || null,
    });
  }
};
