'use strict';

const rollup = require('rollup'),
	nodeResolve = require('rollup-plugin-node-resolve'),
	commonjs = require('rollup-plugin-commonjs'),
	eslint = require('rollup-plugin-eslint'),
	alias = require('rollup-plugin-alias'),
	replace = require('rollup-plugin-replace'),

	config = require('./config_loader.js')('./build_config.json', {
		dev: false, // rewrites hardcoded jumpsuit.space URLs + (to be done) whether to include sourcemaps
		mod: 'capture'
	});

function errorHandler(err) {
	console.error(err);
}
const nodeSrcMapIntro = 'require(\'source-map-support\').install();';

rollup.rollup({
	entry: './server/master_server.js',
	plugins: [
		alias({
			'<@convert@>': 'server/convert.js'
		}),
		nodeResolve({ jsnext: true, main: true }),
		commonjs({ include: 'node_modules/**' }),
		eslint()
	]
}).then((bundle) => {
	return bundle.write({
		format: 'cjs',
		intro: nodeSrcMapIntro,
		exports: 'none',
		indent: false,
		sourceMap: "inline",
		cache: './master_server_bundle.js',
		dest: './master_server_bundle.js'
	});
}).catch(errorHandler).then(() => {
	console.log('`./master_server_bundle.js` successfully written!');
});


rollup.rollup({
	entry: './server/game_server.js',
	plugins: [
		alias({
			'<@engine@>': 'mods/' + config.mod + '/engine.js',
			'<@onMessage@>': 'mods/' + config.mod + '/on_message.js',
			'<@Player@>': 'mods/' + config.mod + '/player.js',
			'<@Planet@>': 'mods/' + config.mod + '/planet.js',
			'<@Enemy@>': 'mods/' + config.mod + '/enemy.js',

			'<@Shot@>': 'mods/' + config.mod + '/shot.js',

			'<@Weapon@>': 'mods/' + config.mod + '/weapon.js',
			'<@RapidFireWeapon@>': 'mods/' + config.mod + '/rapid_fire_weapon.js',

			'<@Lmg@>': 'mods/' + config.mod + '/lmg.js',
			'<@Smg@>': 'mods/' + config.mod + '/smg.js',
			'<@Shotgun@>': 'mods/' + config.mod + '/shotgun.js',
			'<@Knife@>': 'mods/' + config.mod + '/knife.js',

			'<@convert@>': 'server/convert.js'
		}),
		replace({
			exclude: 'node_modules/**',
			delimiters: [ '<@', '@>' ],
			values: {
				modName: config.mod
			}
		}),
		nodeResolve({ jsnext: true, main: true }),
		commonjs({ include: 'node_modules/**' }),
		eslint()
	]
}).then((bundle) => {
	return bundle.write({
		format: 'cjs',
		intro: nodeSrcMapIntro,
		exports: 'none',
		indent: false,
		sourceMap: 'inline',
		cache: './game_server_bundle.js',
		dest: './game_server_bundle.js'
	});
}).catch(errorHandler).then(() => {
	console.log('`./game_server_bundle.js` successfully written!');
});


let clientPlugins = [
	replace({
		include: 'shared/**',
		values: {
			'import resources from \'../server/resource_loader.js\';\n': '' // strip out resources import since it is a global
		}
	}),
	alias({
		'<@Player@>': 'client/player.js',
		'<@Shot@>': 'client/shot.js',

		'<@Weapon@>': 'client/weapon.js',
		'<@RapidFireWeapon@>': 'client/rapid_fire_weapon.js',

		'<@Lmg@>': 'client/lmg.js',
		'<@Smg@>': 'client/smg.js',
		'<@Shotgun@>': 'client/shotgun.js',
		'<@Knife@>': 'client/knife.js',

		'<@convert@>': 'client/convert.js'
	}),
	eslint()
];
if (config.dev) clientPlugins.push(replace({
	include: 'client/websocket_client.js',
	values: {
		'\'wss://\'': '(location.protocol === \'http:\' ? \'ws://\' : \'wss://\')'
	}
}));

rollup.rollup({
	entry: './client/main.js',
	plugins: clientPlugins
}).then((bundle) => {
	return bundle.write({
		format: 'iife',
		exports: 'none',
		indent: false,
		sourceMap: 'inline',
		cache: './static/bundle.js',
		dest: './static/bundle.js',
		globals: {
			vinage: 'vinage',
			'ipaddr.js': 'ipaddr'
		}
	});
}).catch(errorHandler).then(() => {
	console.log('`./static/bundle.js` successfully written!');
});
