const nativeFetch = global.fetch;

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

require('./server.js');
