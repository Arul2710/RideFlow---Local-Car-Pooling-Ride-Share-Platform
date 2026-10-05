/* ═══════════════════════════════════════════════════════════════════
   RideFlow local data store
   -------------------------------------------------------------------
   A self-contained replacement for the deleted Express/SQLite backend.

   Everything lives in the browser: the account list, each account's
   rides/bookings/payments/notifications, and the current session. It
   exposes the same small promise-based surface the pages already call
   (login, register, me, summary, bookings, rides, payments,
   notifications, marketplace, changePassword, logout), so the page
   code is unchanged and every view keeps working with no server.

   Storage keys are namespaced with "rideflow." and never collide with
   the theme keys ("darkMode" / "rtl").
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var KEY_DB = 'rideflow.db.v1';
  var KEY_SESSION = 'rideflow.session.v1';

  /* ── Storage that degrades to memory (private mode, disabled storage) ── */
  var memory = {};
  var store = {
    get: function (k) {
      try { var v = global.localStorage.getItem(k); return v === null ? (k in memory ? memory[k] : null) : v; }
      catch (e) { return k in memory ? memory[k] : null; }
    },
    set: function (k, v) {
      memory[k] = v;
      try { global.localStorage.setItem(k, v); } catch (e) { /* memory only */ }
    },
    del: function (k) {
      delete memory[k];
      try { global.localStorage.removeItem(k); } catch (e) { /* memory only */ }
    }
  };

  /* ── Small helpers ── */
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* Every timestamp the store writes is a real UTC instant ending in "Z".
     The pages parse zone-less strings as UTC, so a naive local string would
     render shifted by the visitor's UTC offset. */
  function iso(d) { return d.toISOString(); }

  /* A wall-clock time n days from now, kept in the visitor's own timezone
     but stored as the equivalent UTC instant (so it displays as chosen). */
  function daysFromNow(n, hour, minute) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(hour === undefined ? 9 : hour, minute === undefined ? 0 : minute, 0, 0);
    return d.toISOString();
  }

  /* <input type="datetime-local"> yields "YYYY-MM-DDTHH:mm" with no zone,
     which the browser reads as local time. Convert it to the UTC instant
     it represents so it is stored - and later displayed - as chosen. */
  function toUtcIso(value) {
    var s = String(value || '').trim();
    if (!s) return '';
    if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) return s;
    var d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toISOString();
  }

  function monthsBack(n) {
    var d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return d.toLocaleDateString('en-US', { month: 'short' });
  }

  /* ── Seed data ──────────────────────────────────────────────────────
     Mirrors the demo dataset the backend used to serve, so the numbers
     on the dashboard stay identical after the switch.                  */
  function seed() {
    var now = new Date().toISOString();

    var accounts = [
      {
        id: 1, email: 'user@rideflow.com', password: 'User1234',
        fullName: 'Alice Nguyen', phone: '+1 555 0101', city: 'Portland',
        bio: 'Weekend cyclist and carpool regular. Happy to share a ride and split the fuel.',
        role: 'user', rating: 4.8, avatarUrl: '', createdAt: now
      },
      {
        id: 2, email: 'other@rideflow.com', password: 'Other1234',
        fullName: 'Bob Carter', phone: '+1 555 0102', city: 'Salem',
        bio: 'Driving the I-5 corridor most mornings.',
        role: 'user', rating: 4.6, avatarUrl: '', createdAt: now
      },
      {
        id: 3, email: 'admin@rideflow.com', password: 'Admin1234',
        fullName: 'Dana Whitfield', phone: '+1 555 0103', city: 'Portland',
        bio: 'RideFlow operations.',
        role: 'admin', rating: 5, avatarUrl: '', createdAt: now
      }
    ];

    /* Rides. ownerId 1 = Alice, 2 = Bob. */
    var rides = [
      { id: 1, ownerId: 1, origin: 'Pearl District', destination: 'Beaverton', departAt: daysFromNow(2, 8, 30), seatsTotal: 3, seatsAvailable: 2, price: 6.5, notes: 'Leaving from the MAX stop by the library.', status: 'scheduled' },
      { id: 2, ownerId: 1, origin: 'Portland', destination: 'Salem', departAt: daysFromNow(5, 7, 0), seatsTotal: 4, seatsAvailable: 4, price: 11, notes: 'I-5 north. Quiet in the morning.', status: 'scheduled' },
      { id: 3, ownerId: 1, origin: 'Portland', destination: 'Lake Oswego', departAt: daysFromNow(9, 17, 30), seatsTotal: 3, seatsAvailable: 1, price: 8, notes: 'Evening run back south.', status: 'scheduled' },
      { id: 4, ownerId: 1, origin: 'Beaverton', destination: 'Portland', departAt: daysFromNow(-12, 18, 0), seatsTotal: 3, seatsAvailable: 0, price: 5, notes: '', status: 'completed' },
      { id: 5, ownerId: 1, origin: 'Hillsboro', destination: 'Portland', departAt: daysFromNow(-26, 7, 45), seatsTotal: 4, seatsAvailable: 0, price: 7.25, notes: 'Early commute share.', status: 'completed' },
      { id: 6, ownerId: 1, origin: 'Gresham', destination: 'Portland', departAt: daysFromNow(-40, 16, 0), seatsTotal: 2, seatsAvailable: 0, price: 4.5, notes: '', status: 'completed' },
      { id: 7, ownerId: 1, origin: 'Tigard', destination: 'Portland', departAt: daysFromNow(-55, 8, 0), seatsTotal: 3, seatsAvailable: 0, price: 6, notes: '', status: 'cancelled' },
      { id: 8, ownerId: 2, origin: 'Salem Center', destination: 'Portland', departAt: daysFromNow(3, 6, 45), seatsTotal: 3, seatsAvailable: 2, price: 9, notes: 'Air conditioned, two bags fit.', status: 'scheduled' },
      { id: 9, ownerId: 2, origin: 'McMinnville', destination: 'Salem', departAt: daysFromNow(-18, 9, 0), seatsTotal: 2, seatsAvailable: 0, price: 6.5, notes: '', status: 'completed' },
      { id: 10, ownerId: 2, origin: 'Portland', destination: 'Eugene', departAt: daysFromNow(6, 7, 30), seatsTotal: 4, seatsAvailable: 3, price: 14, notes: 'I-5 south, leaving at dawn.', status: 'scheduled' },
      { id: 11, ownerId: 2, origin: 'Salem', destination: 'Corvallis', departAt: daysFromNow(11, 16, 0), seatsTotal: 3, seatsAvailable: 2, price: 8.5, notes: 'Evening drive back south.', status: 'scheduled' }
    ];

    /* Bookings. Alice booked 3 rides; Bob booked 1. */
    var bookings = [
      { id: 1, userId: 1, rideId: 1, origin: 'Pearl District', destination: 'Beaverton', date: daysFromNow(2, 8, 30), seats: 1, amount: 6.5, status: 'confirmed' },
      { id: 2, userId: 1, rideId: 8, origin: 'Salem Center', destination: 'Portland', date: daysFromNow(3, 6, 45), seats: 1, amount: 9, status: 'scheduled' },
      { id: 3, userId: 1, rideId: 4, origin: 'Beaverton', destination: 'Portland', date: daysFromNow(-12, 18, 0), seats: 2, amount: 10, status: 'completed' },
      { id: 4, userId: 2, rideId: 5, origin: 'Hillsboro', destination: 'Portland', date: daysFromNow(-26, 7, 45), seats: 1, amount: 7.25, status: 'completed' }
    ];

    /* Payments: Alice has 3 paid (21.50) + 1 refunded (2.75). */
    var payments = [
      { id: 1, userId: 1, reference: 'RF-2026-0001', paidAt: daysFromNow(2, 8, 30), method: 'card', amount: 6.5, status: 'paid' },
      { id: 2, userId: 1, reference: 'RF-2026-0002', paidAt: daysFromNow(3, 6, 45), method: 'wallet', amount: 9, status: 'paid' },
      { id: 3, userId: 1, reference: 'RF-2026-0003', paidAt: daysFromNow(-12, 18, 0), method: 'card', amount: 6, status: 'paid' },
      { id: 4, userId: 1, reference: 'RF-2026-0004', paidAt: daysFromNow(-30, 12, 0), method: 'card', amount: 2.75, status: 'refunded' },
      { id: 5, userId: 2, reference: 'RF-2026-0005', paidAt: daysFromNow(-26, 7, 45), method: 'card', amount: 7.25, status: 'paid' }
    ];

    var notifications = [
      { id: 1, userId: 1, title: 'Booking confirmed', body: 'Your ride from Pearl District to Beaverton is confirmed.', createdAt: daysFromNow(0, 9, 15), isRead: false },
      { id: 2, userId: 1, title: 'Driver replied', body: 'Bob confirmed the pickup point for your Salem trip.', createdAt: daysFromNow(-1, 18, 40), isRead: false },
      { id: 3, userId: 1, title: 'Payment received', body: 'Your payment of $6.00 was processed successfully.', createdAt: daysFromNow(-12, 18, 5), isRead: true },
      { id: 4, userId: 1, title: 'Trip completed', body: 'Thanks for riding with us. Rate your driver.', createdAt: daysFromNow(-12, 20, 30), isRead: true },
      { id: 5, userId: 1, title: 'Refund processed', body: 'Your refund of $2.75 is on the way.', createdAt: daysFromNow(-30, 12, 15), isRead: true },
      { id: 6, userId: 2, title: 'Trip completed', body: 'Your trip from Hillsboro to Portland is complete.', createdAt: daysFromNow(-26, 10, 0), isRead: true }
    ];

    return {
      accounts: accounts,
      rides: rides,
      bookings: bookings,
      payments: payments,
      notifications: notifications,
        nextId: { account: 4, ride: 12, booking: 5, payment: 6, notification: 7 }
    };
  }

  var db = null;

  function load() {
    if (db) return db;
    var raw = store.get(KEY_DB);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.accounts && parsed.accounts.length) { db = parsed; return db; }
      } catch (e) { /* corrupt payload: fall through and reseed */ }
    }
    db = seed();
    persist();
    return db;
  }

  function persist() { store.set(KEY_DB, JSON.stringify(db)); }

  function reset() { db = null; store.del(KEY_DB); store.del(KEY_SESSION); return load(); }

  /* ── Session ─────────────────────────────────────────────────────── */
  function sessionUser() {
    var id = store.get(KEY_SESSION);
    if (!id) return null;
    var d = load();
    for (var i = 0; i < d.accounts.length; i++) {
      if (String(d.accounts[i].id) === String(id)) return d.accounts[i];
    }
    return null;
  }

  function publicUser(a) {
    if (!a) return null;
    return {
      id: a.id, email: a.email, fullName: a.fullName, phone: a.phone || '',
      city: a.city || '', bio: a.bio || '', role: a.role,
      rating: a.rating, avatarUrl: a.avatarUrl || '', createdAt: a.createdAt
    };
  }

  /* The shape every page consumes: { ok, status, body }. */
  function ok(body) { return { ok: true, status: 200, body: body || {} }; }
  function err(status, body) { return { ok: false, status: status, body: body || {} }; }
  function unauthorized() { return err(401, { error: 'unauthenticated' }); }

  function requireUser() {
    var u = sessionUser();
    if (!u) return null;
    return u;
  }

  /* ── Validation (mirrors the server rules that were removed) ─────── */
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validatePassword(p) {
    if (!p || p.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Password must contain a letter and a number';
    return null;
  }

  /* ── Views onto a single account's rows ─────────────────────────── */
  function myBookings(u) {
    return load().bookings.filter(function (b) { return b.userId === u.id; });
  }
  function myRides(u) {
    return load().rides.filter(function (r) { return r.ownerId === u.id; });
  }
  function myPayments(u) {
    return load().payments.filter(function (p) { return p.userId === u.id; });
  }
  function myNotifications(u) {
    return load().notifications
      .filter(function (n) { return n.userId === u.id; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  }

  function isPast(value) {
    var d = new Date(String(value).replace(' ', 'T'));
    return !isNaN(d.getTime()) && d.getTime() < Date.now();
  }
  /* ════════════════════════════════════════════════════════════════
     Public API — every method returns a promise of { ok, status, body }
     ════════════════════════════════════════════════════════════════ */
  var API = {
    /* ── auth ── */
    login: function (email, password) {
      var d = load();
      email = String(email || '').trim().toLowerCase();
      var errors = {};
      if (!email) errors.email = 'Email address is required';
      if (!password) errors.password = 'Password is required';
      if (Object.keys(errors).length) return Promise.resolve(err(400, { error: 'validation_failed', errors: errors }));

      var found = null;
      for (var i = 0; i < d.accounts.length; i++) {
        if (String(d.accounts[i].email).toLowerCase() === email) { found = d.accounts[i]; break; }
      }
      /* One generic message for both cases: never reveal which part was wrong. */
      if (!found || found.password !== password) {
        return Promise.resolve(err(401, { error: 'invalid_credentials', message: 'Email or password is incorrect.' }));
      }
      store.set(KEY_SESSION, String(found.id));
      return Promise.resolve(ok({ user: publicUser(found) }));
    },

    register: function (data) {
      var d = load();
      data = data || {};
      var fullName = String(data.fullName || '').trim();
      var email = String(data.email || '').trim().toLowerCase();
      var phone = String(data.phone || '').trim();
      var password = String(data.password || '');
      var errors = {};

      if (!fullName) errors.fullName = 'Full name is required';
      else if (fullName.length < 2) errors.fullName = 'Enter your full name';
      if (!email) errors.email = 'Email address is required';
      else if (!validEmail(email)) errors.email = 'Enter a valid email address';
      else {
        for (var i = 0; i < d.accounts.length; i++) {
          if (String(d.accounts[i].email).toLowerCase() === email) { errors.email = 'An account with that email already exists'; break; }
        }
      }
      if (!phone) errors.phone = 'Phone number is required';
      var pwErr = validatePassword(password);
      if (pwErr) errors.password = pwErr;
      if (Object.keys(errors).length) return Promise.resolve(err(400, { error: 'validation_failed', errors: errors }));

      var account = {
        id: d.nextId.account++, email: email, password: password,
        fullName: fullName, phone: phone, city: String(data.city || '').trim(),
        bio: '', role: 'user', rating: 5, avatarUrl: '', createdAt: iso(new Date())
      };
      d.accounts.push(account);
      persist();
      store.set(KEY_SESSION, String(account.id));
      return Promise.resolve(ok({ user: publicUser(account) }));
    },

    logout: function () {
      store.del(KEY_SESSION);
      return Promise.resolve(ok({}));
    },

    me: function () {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      return Promise.resolve(ok({ user: publicUser(u) }));
    },

    updateProfile: function (patch) {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      var d = load();
      var errors = {};
      var fullName = patch && patch.fullName !== undefined ? String(patch.fullName).trim() : u.fullName;
      if (!fullName) errors.fullName = 'Full name is required';
      else if (fullName.length < 2) errors.fullName = 'Enter your full name';
      if (Object.keys(errors).length) return Promise.resolve(err(400, { error: 'validation_failed', errors: errors }));

      u.fullName = fullName;
      if (patch.phone !== undefined) u.phone = String(patch.phone).trim();
      if (patch.city !== undefined) u.city = String(patch.city).trim();
      if (patch.bio !== undefined) u.bio = String(patch.bio).trim();
      if (patch.bio && patch.bio.length > 400) u.bio = String(patch.bio).trim().slice(0, 400);
      persist();
      return Promise.resolve(ok({ user: publicUser(u) }));
    },

    changePassword: function (currentPassword, newPassword) {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      var errors = {};
      if (!currentPassword) errors.currentPassword = 'Enter your current password';
      var pwErr = validatePassword(newPassword);
      if (pwErr) errors.newPassword = pwErr;
      if (newPassword && newPassword === currentPassword) errors.newPassword = 'Choose a password different from your current one';
      if (Object.keys(errors).length) return Promise.resolve(err(400, { error: 'validation_failed', errors: errors }));

      if (u.password !== currentPassword) {
        return Promise.resolve(err(401, { error: 'invalid_credentials', message: 'Your current password is incorrect.' }));
      }
      u.password = newPassword;
      persist();
      return Promise.resolve(ok({}));
    },

    /* ── dashboard summary ── */
    summary: function () {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      var rides = myRides(u);
      var bookings = myBookings(u);
      var payments = myPayments(u);

      var upcomingRides = rides.filter(function (r) {
        return r.status === 'scheduled' && !isPast(r.departAt);
      });
      var completedRides = rides.filter(function (r) { return r.status === 'completed'; });
      var totalSpending = payments
        .filter(function (p) { return p.status === 'paid'; })
        .reduce(function (a, p) { return a + Number(p.amount || 0); }, 0);

      var recent = bookings.slice().sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
      }).slice(0, 4);

      var months = [], series = [];
      for (var i = 5; i >= 0; i--) {
        months.push(monthsBack(i));
        var key = monthsBack(i);
        var total = 0;
        for (var j = 0; j < payments.length; j++) {
          var p = payments[j];
          if (p.status !== 'paid') continue;
          var d = new Date(String(p.paidAt).replace(' ', 'T'));
          if (isNaN(d.getTime())) continue;
          if (d.toLocaleDateString('en-US', { month: 'short' }) === key &&
            d.getFullYear() === new Date().getFullYear()) {
            total += Number(p.amount || 0);
          }
        }
        series.push(Number(total.toFixed(2)));
      }

      return Promise.resolve(ok({
        stats: {
          totalRides: rides.length,
          upcomingRides: upcomingRides.length,
          completedRides: completedRides.length,
          totalSpending: Number(totalSpending.toFixed(2)),
          unreadNotifications: myNotifications(u).filter(function (n) { return !n.isRead; }).length
        },
        upcomingRides: upcomingRides,
        recentBookings: recent,
        spending: { labels: months, series: series }
      }));
    },

    /* ── collections ── */
    bookings: function () {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      return Promise.resolve(ok({ bookings: myBookings(u) }));
    },

    rides: function () {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      return Promise.resolve(ok({ rides: myRides(u) }));
    },

    payments: function () {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      return Promise.resolve(ok({ payments: myPayments(u) }));
    },

    notifications: function () {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      return Promise.resolve(ok({ notifications: myNotifications(u) }));
    },

    markNotificationRead: function (id) {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      var list = myNotifications(u);
      for (var i = 0; i < list.length; i++) {
        /* Scoped to this account's own list: another id simply never matches. */
        if (String(list[i].id) === String(id)) { list[i].isRead = true; persist(); return Promise.resolve(ok({})); }
      }
      return Promise.resolve(err(404, { error: 'not_found' }));
    },

    markAllNotificationsRead: function () {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      myNotifications(u).forEach(function (n) { n.isRead = true; });
      persist();
      return Promise.resolve(ok({}));
    },

    /* ── marketplace (other people's rides only) ── */
    available: function (query) {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      var d = load();
      query = query || {};
      var q = String(query.q || '').trim().toLowerCase();
      var from = String(query.from || '').trim().toLowerCase();
      var to = String(query.to || '').trim().toLowerCase();

      var out = [];
      for (var i = 0; i < d.rides.length; i++) {
        var r = d.rides[i];
        if (r.ownerId === u.id) continue;                       // never list your own
        if (r.status !== 'scheduled' || isPast(r.departAt)) continue;
        if (r.seatsAvailable < 1) continue;
        if (from && r.origin.toLowerCase().indexOf(from) === -1) continue;
        if (to && r.destination.toLowerCase().indexOf(to) === -1) continue;
        if (q && (r.origin + ' ' + r.destination + ' ' + (r.notes || '')).toLowerCase().indexOf(q) === -1) continue;

        var owner = null;
        for (var j = 0; j < d.accounts.length; j++) {
          if (d.accounts[j].id === r.ownerId) { owner = d.accounts[j]; break; }
        }
        out.push({
          id: r.id, origin: r.origin, destination: r.destination, departAt: r.departAt,
          seatsAvailable: r.seatsAvailable, price: r.price, notes: r.notes, status: r.status,
          /* Only public driver fields are exposed - never email or phone. */
          driver: { name: owner ? owner.fullName : 'Member', rating: owner ? owner.rating : null, city: owner ? owner.city : '' }
        });
      }
      return Promise.resolve(ok({ rides: out }));
    },

    /* ── mutations ── */
    createRide: function (input) {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      var d = load();
      input = input || {};
      var errors = {};
      var origin = String(input.origin || '').trim();
      var destination = String(input.destination || '').trim();
      var departAt = toUtcIso(input.departAt);
      var seatsTotal = Number(input.seatsTotal);
      var price = Number(input.price);

      if (!origin) errors.origin = 'Pick-up location is required';
      else if (origin.length < 2) errors.origin = 'Enter a valid pick-up location';
      if (!destination) errors.destination = 'Destination is required';
      else if (destination.length < 2) errors.destination = 'Enter a valid destination';
      if (origin && destination && origin.toLowerCase() === destination.toLowerCase()) {
        errors.destination = 'Destination must differ from the pick-up location';
      }
      if (!String(input.departAt || '').trim()) errors.departAt = 'Departure time is required';
      else if (isNaN(new Date(departAt).getTime())) errors.departAt = 'Enter a valid date and time';
      else if (new Date(departAt).getTime() < Date.now()) errors.departAt = 'Departure must be in the future';
      if (!seatsTotal || seatsTotal < 1 || seatsTotal > 8) errors.seatsTotal = 'Offer between 1 and 8 seats';
      if (isNaN(price) || price < 0 || price > 200) errors.price = 'Enter a price between 0 and 200';
      if (Object.keys(errors).length) return Promise.resolve(err(400, { error: 'validation_failed', errors: errors }));

      var ride = {
        id: d.nextId.ride++, ownerId: u.id, origin: origin, destination: destination,
        departAt: departAt, seatsTotal: seatsTotal, seatsAvailable: seatsTotal,
        price: Number(price.toFixed(2)), notes: String(input.notes || '').trim(),
        status: 'scheduled'
      };
      d.rides.push(ride);

      d.notifications.push({
        id: d.nextId.notification++, userId: u.id,
        title: 'Ride published',
        body: origin + ' to ' + destination + ' is now visible to other members.',
        createdAt: iso(new Date()), isRead: false
      });
      persist();
      return Promise.resolve(ok({ ride: ride }));
    },

    createBooking: function (rideId, seats) {
      var u = requireUser();
      if (!u) return Promise.resolve(unauthorized());
      var d = load();
      seats = Number(seats || 1);
      if (!seats || seats < 1 || seats > 8) {
        return Promise.resolve(err(400, { error: 'validation_failed', errors: { seats: 'Choose between 1 and 8 seats' } }));
      }

      var ride = null;
      for (var i = 0; i < d.rides.length; i++) {
        if (String(d.rides[i].id) === String(rideId)) { ride = d.rides[i]; break; }
      }
      if (!ride) return Promise.resolve(err(404, { error: 'not_found', message: 'That ride is no longer available.' }));
      if (ride.ownerId === u.id) return Promise.resolve(err(400, { error: 'own_ride', message: 'You cannot book a ride you offered yourself.' }));
      if (ride.status !== 'scheduled' || isPast(ride.departAt)) {
        return Promise.resolve(err(400, { error: 'ride_gone', message: 'That trip has already departed.' }));
      }
      if (ride.seatsAvailable < seats) {
        return Promise.resolve(err(400, { error: 'no_seats', message: 'Only ' + ride.seatsAvailable + ' seat(s) left on that trip.' }));
      }
      var already = false;
      for (var k = 0; k < d.bookings.length; k++) {
        if (d.bookings[k].userId === u.id && String(d.bookings[k].rideId) === String(rideId) && d.bookings[k].status !== 'cancelled') { already = true; break; }
      }
      if (already) return Promise.resolve(err(409, { error: 'duplicate', message: 'You already have a booking on that trip.' }));

      ride.seatsAvailable -= seats;
      var amount = Number((ride.price * seats).toFixed(2));
      var booking = {
        id: d.nextId.booking++, userId: u.id, rideId: ride.id,
        origin: ride.origin, destination: ride.destination, date: ride.departAt,
        seats: seats, amount: amount, status: 'confirmed'
      };
      d.bookings.push(booking);
      d.payments.push({
        id: d.nextId.payment++, userId: u.id,
        reference: 'RF-' + new Date().getFullYear() + '-' + String(d.nextId.payment).padStart(4, '0'),
        paidAt: iso(new Date()), method: 'card', amount: amount, status: 'paid'
      });
      d.notifications.push({
        id: d.nextId.notification++, userId: u.id,
        title: 'Booking confirmed',
        body: 'Your ride from ' + ride.origin + ' to ' + ride.destination + ' is confirmed.',
        createdAt: iso(new Date()), isRead: false
      });
      persist();
      return Promise.resolve(ok({ booking: booking }));
    },

    /* ── maintenance helpers ── */
    reset: reset,
    isDemo: function () { return true; }
  };

  global.RideFlowStore = API;
})(window);
