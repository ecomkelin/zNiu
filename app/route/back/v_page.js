const path = require('path');
const Home = require(path.resolve(process.cwd(), 'app/controllers/v_page/Home'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
    app.post('/api/b1/home', MdAuth.path_bser, Home);
};