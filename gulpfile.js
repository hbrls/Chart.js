var gulp = require('gulp'),
	pump = require('pump'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	util = require('gulp-util'),
	rev = require('gulp-rev'),
	jshint = require('gulp-jshint'),
	size = require('gulp-size'),
	connect = require('gulp-connect'),
	replace = require('gulp-replace'),
	htmlv = require('gulp-html-validator'),
	inquirer = require('inquirer'),
	semver = require('semver'),
	exec = require('child_process').exec,
	fs = require('fs'),
	package = require('./package.json'),
	bower = require('./bower.json'),
	livereload = require('gulp-livereload');

var SRC_DIR = './src/';
var OUTPUT_DIR = './dist';
/*
 *	Usage : gulp build --types=Bar,Line,Doughnut
 *	Output: - A built Chart.js file with Core and types Bar, Line and Doughnut concatenated together
 *			- A minified version of this code, in Chart.min.js
 */

gulp.task('build', function(){
	// PolarArea is not shipped by default
	var modules = ['Core', 'Bar', 'Doughnut', 'Line', 'Radar'];
	if (util.env.types) {
		modules = util.env.types.split(',').map(function (module) {
			return module;
		});
		modules.unshift('Core');
	}

	var srcFiles = modules.map(function (module) {
		return SRC_DIR + 'Chart.' + module + '.js';
	});

	return pump([
		gulp.src(srcFiles),
		concat('Chart.js'),
		replace('{{ version }}', package.version),
		replace('{{ modules }}', modules.join(', ')),
		gulp.dest(OUTPUT_DIR),
		uglify(),
		concat('Chart.min.js'),
		rev(),
		gulp.dest(OUTPUT_DIR),
	]);
});

/*
 *	Usage : gulp bump
 *	Prompts: Version increment to bump
 *	Output: - New version number written into package.json & bower.json
 */

gulp.task('bump', function(complete){
	util.log('Current version:', util.colors.cyan(package.version));
	var choices = ['major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease'].map(function(versionType){
		return versionType + ' (v' + semver.inc(package.version, versionType) + ')';
	});
	inquirer.prompt({
		type: 'list',
		name: 'version',
		message: 'What version update would you like?',
		choices: choices
	}, function(res){
		var increment = res.version.split(' ')[0],
			newVersion = semver.inc(package.version, increment);

		// Set the new versions into the bower/package object
		package.version = newVersion;
		bower.version = newVersion;

		// Write these to their own files, then build the output
		fs.writeFileSync('package.json', JSON.stringify(package, null, 2));
		fs.writeFileSync('bower.json', JSON.stringify(bower, null, 2));

		complete();
	});
});

gulp.task('release', ['build'], function(){
	exec('git tag -a v' + package.version);
});

gulp.task('jshint', function(){
	return gulp.src(SRC_DIR + '*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('valid', function(){
	return gulp.src('samples/*.html')
    .pipe(htmlv());
});

gulp.task('library-size', function(){
	return gulp.src('Chart.min.js')
		.pipe(size({
			gzip: true
		}));
});

gulp.task('module-sizes', function(){
	return gulp.src(SRC_DIR + '*.js')
	.pipe(uglify({preserveComments:'some'}))
	.pipe(size({
		showFiles: true,
		gzip: true
	}));
});

gulp.task('watch', function(){
	gulp.watch('./src/*', ['build']);

	livereload.listen(35729);

	var reloadPage = function (evt) {
	  livereload.changed(evt.path);
	};

	gulp.watch(['Chart.js', 'samples/*'], reloadPage);

});

gulp.task('test', ['jshint', 'valid']);

gulp.task('size', ['library-size', 'module-sizes']);

gulp.task('default', ['build', 'watch']);

gulp.task('server', function(){
	connect.server({
		port: 8000
	});
});

// Convenience task for opening the project straight from the command line
gulp.task('_open', function(){
	exec('open http://localhost:8000');
	exec('subl .');
});

gulp.task('dev', ['server', 'default']);
