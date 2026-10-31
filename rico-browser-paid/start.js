const nativeFetch = global.fetch;

// Mantém a correção do limite de 30 caracteres do checkout Asaas.
global.fetch = async (url, options = {}) => {
  try {
    if (String(url).includes('/checkouts') && options.body) {
      const body = JSON.parse(options.body);
      if (Array.isArray(body.items)) {
        body.items = body.items.map((item) => ({
          ...item,
          name: String(item.name || '').slice(0, 30),
        }));
      }
      options = { ...options, body: JSON.stringify(body) };
    }
  } catch {}
  return nativeFetch(url, options);
};

// Acopla as notificações push e os billings sem alterar o server.js principal.
const express = require('express');
const { registerPushRoutes, notifySaleFromAsaas } = require('./push_notify');
const { registerDashboardBilling } = require('./dashboard_billing');
const { registerProductBilling } = require('./product_billing');

const originalPost = express.application.post;
express.application.post = function(path, ...handlers) {
  if (path === '/webhook/asaas') {
    handlers = handlers.map((handler) => function(req, res, next) {
      const evt = req.body;
      let out;
      try {
        out = handler.call(this, req, res, next);
      } finally {
        setImmediate(() => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            notifySaleFromAsaas(evt).catch((e) => console.error('push_notify_error', e.message || e));
          }
        });
      }
      return out;
    });
  }
  return originalPost.call(this, path, ...handlers);
};

const originalListen = express.application.listen;
express.application.listen = function(...args) {
  if (!this.__dashboardBillingRegistered) {
    registerDashboardBilling(this);
  }
  if (!this.__productBillingRegistered) {
    registerProductBilling(this);
  }
  if (!this.__pushRoutesRegistered) {
    registerPushRoutes(this);
    this.__pushRoutesRegistered = true;
  }
  return originalListen.apply(this, args);
};

require('./server.js');
