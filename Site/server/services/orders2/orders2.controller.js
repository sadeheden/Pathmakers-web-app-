// orders2.controller.js
import orders2DB from './orders2.db.js';
import { MongoClient, ObjectId } from 'mongodb';

/* ---------------------- lightweight native connection (enrichment) ---------------------- */
const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME || 'travel';
let __client;
async function getDb() {
  if (!__client) {
    __client = new MongoClient(uri);
    await __client.connect();
  }
  return __client.db(dbName);
}

/* ---------------------- helpers ---------------------- */
const is24 = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
const toDateOrNull = (v) => (v ? new Date(v) : null);

/** Extract base 24-hex id from "id-idx" / "id_idx" / "id" */
function cleanId(id) {
  if (!id) return null;
  if (typeof id === 'string') {
    const base = id.split(/[-_]/)[0];
    return is24(base) ? base : (is24(id) ? id : null);
  }
  const s = id?.toString?.();
  return is24(s) ? s : null;
}

/** Parse one attraction token into {kind:'name'|'id', base?:string, idx?:number} */
function parseAttractionToken(tok) {
  if (typeof tok !== 'string') return { kind: 'name', name: String(tok ?? '') };
  const [maybeId, maybeIdx] = tok.split(/[-_]/);
  if (is24(maybeId)) {
    const idx = (maybeIdx !== undefined && !Number.isNaN(parseInt(maybeIdx, 10)))
      ? parseInt(maybeIdx, 10)
      : null;
    return { kind: 'id', base: maybeId, idx };
  }
  return { kind: 'name', name: tok.trim() };
}

/** Given raw tokens (ids or names), return array of display names */
async function resolveAttractionNames(db, rawTokens = []) {
  if (!Array.isArray(rawTokens) || rawTokens.length === 0) return [];

  const parsed = rawTokens.map(parseAttractionToken);

  // collect plain names sent by client as-is
  const names = parsed.filter(p => p.kind === 'name')
    .map(p => p.name)
    .filter(Boolean);

  // group id tokens by base id
  const groups = new Map(); // baseId -> { idxs: Set<number|null> }
  for (const p of parsed) {
    if (p.kind !== 'id' || !p.base) continue;
    if (!groups.has(p.base)) groups.set(p.base, new Set());
    groups.get(p.base).add(p.idx); // may contain null meaning "whole doc"
  }

  if (groups.size === 0) {
    // only names present
    return Array.from(new Set(names));
  }

  const ids = Array.from(groups.keys()).map((s) => new ObjectId(s));
  const docs = await db.collection('attractions')
    .find({ _id: { $in: ids } })
    .project({ attractions: 1, city: 1 })
    .toArray();

  const byId = new Map(docs.map(d => [String(d._id), d]));

  for (const [base, idxs] of groups) {
    const doc = byId.get(base);
    if (!doc) continue;

    const arr = Array.isArray(doc.attractions) ? doc.attractions : [];
    const onlyNull = Array.from(idxs).every(v => v === null);

    if (onlyNull) {
      // when token is just the doc id (no index), include ALL names from that doc
      for (const a of arr) {
        const nm = a?.name || a?.title || a?.label;
        if (nm) names.push(nm);
      }
    } else {
      for (const idx of idxs) {
        if (idx === null) continue;
        const item = arr[idx];
        const nm = item?.name || item?.title || item?.label;
        if (nm) names.push(nm);
      }
    }
  }

  // de-dup and keep order
  return Array.from(new Set(names.filter(Boolean)));
}

class Orders2Controller {
  /* ---------------------- POST /api/orders2 ---------------------- */
  static async createOrder(req, res) {
    try {
      console.log('📝 Creating new order for user:', req.user?.id);
      console.log('📦 Order data received:', req.body);

      const {
        // canonical ids
        departure_city_id, destination_city_id, flight_id, hotel_id,
        attractions, attractionNames,

        // misc
        transportation, paymentMethod, totalPrice, tripDate, returnDate,

        // denormalized display names (optional)
        departureCityName, destinationCityName, flightName, hotelName,

        // legacy summary fields your UI already shows
        cityName, citySlug, flightNumber, departure, destination, summary, cityImage,

        // optional status/bookingDate coming from client
        status: bodyStatus,
        bookingDate: bodyBookingDate
      } = req.body;

      // required bits
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'User authentication required' });
      }
      if ((!cityName && !departure_city_id) || (!flightNumber && !flight_id) || !tripDate || totalPrice == null) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          required: ['cityName or departure_city_id', 'flightNumber or flight_id', 'tripDate', 'totalPrice'],
          received: Object.keys(req.body)
        });
      }
      if (isNaN(totalPrice) || Number(totalPrice) <= 0) {
        return res.status(400).json({ success: false, message: 'Total price must be a positive number' });
      }
      const tripDateObj = new Date(tripDate);
      if (isNaN(tripDateObj.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid trip date format' });
      }

      // normalize attractions: keep valid 24-hex tokens; keep non-ids as names
      let attraction_ids = [];
      let attraction_names = Array.isArray(attractionNames) ? attractionNames : [];
      if (Array.isArray(attractions)) {
        for (const a of attractions) {
          // allow compound "id-idx" too; store the original token so enrichment can resolve later
          if (typeof a === 'string' && (is24(a) || is24(a.split(/[-_]/)[0]))) {
            attraction_ids.push(a.trim());
          } else if (typeof a === 'string' && a.trim()) {
            attraction_names.push(a.trim());
          }
        }
      }

      const orderData = {
        user_id: new ObjectId(req.user.id),

        // denormalized trip summary
        cityName: cityName?.trim() || null,
        citySlug: citySlug ? citySlug.trim() : (cityName ? cityName.toLowerCase().replace(/\s+/g, '-') : null),
        flightNumber: flightNumber?.trim() || null,
        departure: departure?.trim() || null,
        destination: destination?.trim() || null,

        tripDate: tripDateObj,
        returnDate: toDateOrNull(returnDate),

        total_price: Number(totalPrice),
        payment_method: paymentMethod || 'Credit Card',

        status: bodyStatus || 'confirmed',
        bookingDate: bodyBookingDate ? new Date(bodyBookingDate) : new Date(),

        summary: summary?.trim() || null,
        cityImage: cityImage?.trim() || null,

        // canonical ids (24-hex only)
        departure_city_id: is24(departure_city_id) ? departure_city_id : null,
        destination_city_id: is24(destination_city_id) ? destination_city_id : null,
        flight_id: is24(flight_id) ? flight_id : null,
        hotel_id: is24(hotel_id) ? hotel_id : null,

        transportation: transportation || null,

        // attractions: preserve tokens; enrich later
        attractions: attraction_ids,
        attraction_names,

        // optional denormalized display names
        flight_name: flightName || null,
        hotel_name: hotelName || null,

        departureCityName: departureCityName || null,
        destinationCityName: destinationCityName || null
      };

      if (orderData.returnDate && orderData.returnDate <= orderData.tripDate) {
        return res.status(400).json({ success: false, message: 'Return date must be after trip date' });
      }

      const savedOrder = await orders2DB.createOrder(orderData);
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: savedOrder,
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber || null
      });
    } catch (error) {
      console.error('❌ Error in createOrder controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /* ---------------------- GET /api/orders2 ---------------------- */
  static async getUserOrders(req, res) {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: 'User authentication required' });

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        status: req.query.status || null,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder === 'asc' ? 1 : -1
      };

      const result = await orders2DB.getUserOrders(req.user.id, options);

      // Enrich attraction names
      const db = await getDb();
      const orders = await Promise.all(
        result.orders.map(async (o) => {
          if (Array.isArray(o.attraction_names) && o.attraction_names.length) return o;

          const raw = Array.isArray(o.attractions) ? o.attractions : [];
          const names = await resolveAttractionNames(db, raw);

          if (!names.length) return o;
          return { ...o, attraction_names: names };
        })
      );

      res.json({
        success: true,
        message: `Found ${result.totalOrders} orders`,
        data: { ...result, orders }
      });
    } catch (error) {
      console.error('❌ Error in getUserOrders controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

export default Orders2Controller;
