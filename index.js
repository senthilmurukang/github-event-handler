const escapeHtml = require('escape-html');
exports.logMessage = (req, res) => {
  res.send(`Hello ${escapeHtml(req.query.name || req.body.name || 'World')}!`);
};