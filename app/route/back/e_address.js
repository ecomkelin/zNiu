const path = require('path');
const Nation = require(path.resolve(process.cwd(), 'app/controllers/e_address/Nation'));
const Area = require(path.resolve(process.cwd(), 'app/controllers/e_address/Area'));
const Cita = require(path.resolve(process.cwd(), 'app/controllers/e_address/Cita'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	app.delete('/api/b1/Nation/:id', MdAuth.path_mger, Nation.NationDelete);
	app.put('/api/b1/Nation/:id', MdAuth.path_mger, Nation.NationPut);
	app.post('/api/b1/Nation', MdAuth.path_mger, Nation.NationPost);
	app.get('/api/b1/Nations', Nation.Nations);

	app.delete('/api/b1/Area/:id', MdAuth.path_mger, Area.AreaDelete);
	app.put('/api/b1/Area/:id', MdAuth.path_mger, Area.AreaPut);
	app.post('/api/b1/Area', MdAuth.path_mger, Area.AreaPost);
	app.get('/api/b1/Areas', Area.Areas);

	app.delete('/api/b1/Cita/:id', MdAuth.path_mger, Cita.CitaDelete);
	app.put('/api/b1/Cita/:id', MdAuth.path_mger, Cita.CitaPut);
	app.post('/api/b1/Cita', MdAuth.path_mger, Cita.CitaPost);
	app.get('/api/b1/Citas', Cita.Citas);
};