const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
module.exports = {
	User: ConfUser
}