const gulp = require('gulp'),
      sass = require("gulp-sass")(require('sass')),
	  minificss = require('gulp-minify-css'),
      del = require('del'),
	  browserSync = require('browser-sync').create(),
	  merge = require('merge-stream'),
	  spritesmith = require('gulp.spritesmith-multi'),
	  path = require('path'),
	  glob = require('glob'),
	  svgmin = require('gulp-svgmin'),
	  svgSprite = require('gulp-svg-sprite');

const config = {
	html: {
		src: 'src/views/*.html',
		dest: 'dist/html'
	},
	scss: {
		src: 'src/resources/sass/*.s+(a|c)ss',
		dest: 'dist/css'
	},
	imgSprite : {
		src: 'src/resources/images/img-sprite/**/*.png',
		clean: [
			'dist/css/spr/*.png',
			'src/resources/sass/vendors/img/*'
		]
	},
	imgSvg: {
		src: [
			'src/resources/images/svg/**/*.svg',
		],
		clean: [
			'dist/css/svg/*.svg',
			'src/resources/sass/vendors/**/*'
		]
	},
};
	//html
	gulp.task('html', function(){
		return gulp.src(config.html.src)
		.pipe(gulp.dest(config.html.dest))
		.pipe(browserSync.reload({ stream : true }));
	});
	//scss
	gulp.task('scss', function(){
		return gulp.src(config.scss.src)
		.pipe(sass().on('error', sass.logError))
		.pipe(minificss())
		.pipe(gulp.dest(config.scss.dest))
		.pipe(browserSync.reload({ stream : true }));
	});
	//img sprite
	gulp.task('sprite', function() {
		const opts = {
			spritesmith: function (options, sprite, icons){
				//options.imgPath = `../spr/${options.imgName}`;
				options.imgName = `${sprite}.png`;
				options.cssName = `_${sprite}.scss`;
				options.cssTemplate = `./gulp/helper/sprite.scss.handlebars`;
				options.padding = 5;
				options.cssVarMap = (sp) => {
					sp.name = `${sp.name}`;
				};
				return options;
			}
		};
		const spriteData = gulp.src(config.imgSprite.src)
		.pipe(spritesmith(opts))
		.on('error', function (err) {
			console.log(err)
		});

		const imgStream = spriteData.img.pipe(gulp.dest('./dist/css/spr/'));
		const cssStream = spriteData.css.pipe(gulp.dest('./src/resources/sass/vendors/img'));

		return merge(imgStream, cssStream);
	});
	//svg sprite
	gulp.task('svgSprite',function(){
		function svgOpt(dirPath) {
			return {
				shape: {
					spacing: {
						padding:2,
						box: 'content'
					},
					transform :[
						shapeTransform,
						'svgo',
					]
				},
				mode: {
					css: {
						bust: false,
						dest: '.',
						prefix: '%s',
						sprite: 'dist/css/svg/' + path.basename(dirPath) + '.svg',
						render: {
							scss: {
								template: './gulp/helper/svgsprite-scss-tmpl.mustache',
								dest: 'src/resources/sass/vendors/svg/_' + path.basename(dirPath) + '.scss',
							}
						},
						example: {
							template: './gulp/helper/svg-guide-tmpl.html',
							dest: './src/svg-guide/' + path.basename(dirPath) + '.html'
						}
					}
				},
				svg:{
					namespaceClassnames:false,
					transform       : [
						/**
						 * Custom sprite SVG transformation
						 *
						 * @param {String} svg					Sprite SVG
						 * @return {String}						Processed SVG
						 */
						function(svg) {
							if(svg.match('keyframes')) {
								svg=svg.replace(/<script>/, '<style>').replace(/<\/script>/, '<\/style>');
							}
							return svg;
						},
					]
				},
				//scss에서 사용하는 코드
				variables: {
					svgcode: function() {
						return function(svg,render) {
							svg=render(svg).replace(/<svg[^>]*>|<\/svg>/gi,'').replace(/%/g,'%25').replace(/#/g,'%23');
							if(svg.match('keyframes')){
								svg=svg.replace(/<script>/, '<style>').replace(/<\/script>/, '<\/style>');
							}
							return svg;
						}
					},
					// time: now
				}
			}
		}

		return glob('src/resources/images/svg/**/', function(err, dirs) {
			dirs.forEach(function(dir) {
				gulp.src(path.join(dir, '*.svg'))
				// 	.pipe($.plumber({
				// 		errorHandler: isProduction ? false : true
				// 	}))
					.pipe(svgmin())
					.pipe(svgSprite(svgOpt(dir)))
					.pipe(gulp.dest('.'))
					.pipe(browserSync.stream());
			})
		});

		function shapeTransform(shape, spriter, callback) {
			svg=shape.getSVG();
			if(svg.match('keyframes')){
				svg=svg.replace(/<style[^>]*>/, '<script>').replace(/<\/style>/, '<\/script>');
				shape.setSVG(svg);
			}
			callback(null);
		}
	});
	//watch
	gulp.task('watch', function(){
		gulp.watch(config.imgSprite.src, gulp.series('sprite'));
		gulp.watch(config.scss.src, gulp.series('scss'));
		gulp.watch(config.html.src, gulp.series('html'));
	});
	//browser
	gulp.task('browserSync', function(){
		return browserSync.init({ port : 8001, server: { baseDir: './' }, index: '/dist/html/index.html' });
	});
	//css clean
	gulp.task('clean', function(){
		return del('dist/*/css')
	});
	//img clean
	gulp.task('imgClean', function(){
		return del(config.imgSprite.clean)
	});
	//svg clean
	gulp.task('svgClean', function(){
		return del(config.imgSvg.clean)
	});


gulp.task('default', gulp.series('clean','imgClean','svgClean', gulp.parallel('browserSync', 'sprite', 'svgSprite', 'scss', 'html'), 'watch'));

//gulp.task('default', gulp.parallel('clean','imgClean','browserSync','sprite', 'html', 'scss', 'watch'));
