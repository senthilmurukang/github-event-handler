const escapeHtml = require('escape-html');
exports.issue = (req, res) => {
    switch (req.method) {
        case 'GET':
            res.status(200).send('It is working!');
            break;
        case 'PUT':
            res.status(403).send('Forbidden!');
            break;
        case 'POST':
            console.log(`Request Body: ${req.body.toString()}`);
            res.status(200).send('It is working!');
            break;
        default:
            res.status(405).send({ error: 'Something blew up!' });
            break;
    }
};