const path = require('path');
const Nation = require(path.resolve(process.cwd(), 'app/controllers/e_address/Nation'));
const Area = require(path.resolve(process.cwd(), 'app/controllers/e_address/Area'));
const Cita = require(path.resolve(process.cwd(), 'app/controllers/e_address/Cita'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	app.get('/api/v1/Nations', Nation.Nations);

	app.get('/api/v1/Areas', Area.Areas);

	app.get('/api/v1/Citas', Cita.Citas);
};