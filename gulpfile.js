//var fs = require('fs');
//var ftpConf = JSON.parse(fs.readFileSync('./ftp.json'));

var gulp = require("gulp");
var autoprefixer = require('gulp-autoprefixer');
var useref = require('gulp-useref');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var stylus = require('gulp-stylus');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync').create();
var ftp = require( 'vinyl-ftp' );
var reload = browserSync.reload;
var rupture = require('rupture');
var data = require('gulp-data');
var jade = require('gulp-jade');
var notify = require('gulp-notify');
var pngquant = require('imagemin-pngquant');
var imageminMozjpeg = require('imagemin-mozjpeg');
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cached');
var newer = require('gulp-newer');
var remember = require('gulp-remember');
var spritesmith = require('gulp.spritesmith');
var runSequence = require('run-sequence');
var progeny = require('gulp-progeny');
var filter = require('gulp-filter');

// ########## make img ###############
gulp.task('imagePng',function(){
 return gulp.src('app/img/*.png')
     .pipe(newer('dist/img/'))
     .pipe(imagemin({
         progressive: true,
         svgoPlugins: [{removeViewBox: false}],
         use: [pngquant({quality: '80', speed: 5})]
     }))
     .pipe(gulp.dest('dist/img/'));
 });

gulp.task('imageJpg',function(){
  return gulp.src('app/img/*.jpg')
  .pipe(newer('dist/img/'))
  .pipe(imagemin({
          progressive: true,
          svgoPlugins: [{removeViewBox: false}],
          use: [imageminMozjpeg({quality: '80', speed: 5})]
      }))
  .pipe(gulp.dest('dist/img/'));
});


//Sprite
gulp.task('sprite', function () {
  var spriteData = gulp.src('app/img/sprites/*.png').pipe(spritesmith({
    imgName: '../img/sprite.png',
    cssName: 'sprite.css',
    cssOpts: {
        cssSelector: function (item) {
            // If this is a hover sprite, name it as a hover one (e.g. 'home-hover' -> 'home:hover')
            if (item.name.indexOf('-hover') !== -1) {
                return '.icon-' + item.name.replace('-hover', ':hover');
                // Otherwise, use the name as the selector (e.g. 'home' -> 'home')
            }
            else {
                return '.icon-' + item.name;
            }
        }
     }
  }));
  spriteData.img.pipe(gulp.dest('app/img/')); // путь, куда сохраняем картинку
  spriteData.css.pipe(gulp.dest('app/css/icon/')); // путь, куда сохраняем стили
});
// ########## make css ###############

//Prefix my css
gulp.task('prefix', function () {
    return gulp.src('app/css/style.css')
        .pipe(cache('prefix'))
        .pipe(autoprefixer({
            browsers: ['last 15 versions']
        }))
        .pipe(gulp.dest('app/css/'));
});

//Stylus
gulp.task('stylus', function () {
  return gulp.src(['app/css/**/*.styl'])
    .pipe(cache('stylus'))
    .pipe(progeny({
            regexp: /^\s*@import\s*(?:\(\w+\)\s*)?['"]([^'"]+)['"]/
        }))
    .pipe(filter(['**/*.styl', '!**/_*.styl']))
    .pipe(stylus({
        use:[rupture()],
        'include css': true
        })).on('error', errorhandler)
    .pipe(gulp.dest('app/css/'))
  
});

//Source map
gulp.task('sourcemaps', function () {
  return gulp.src('./app/css/style.styl')
    .pipe(sourcemaps.init())
    .pipe(stylus({
        use:[rupture()]
        }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./app/css/'))
});

// ########## make css end ###############

// ########## make html ###############

gulp.task('jade', function() {
  gulp.src('app/html/*.jade')
    //.pipe(jadeInheritance({basedir: '/app/'}))
    .pipe(jade({
      pretty: '\t',
     cache:'true'
    }).on('error', errorhandler))
    .pipe(gulp.dest('app/'))
    .on('end', browserSync.reload);
});



// ########## make html end###############


// ########## make service###############
//copy file
gulp.task('copy:font',function(){
  return gulp.src('./app/fonts/**.*')
        .pipe(newer('./dist/fonts/'))
        .pipe(gulp.dest('./dist/fonts/'))
  })

gulp.task('copy:js',function(){
  return gulp.src('./app/js/script.js')
         .pipe(gulp.dest('./dist/js/'))
  })

//Show error
function errorhandler(a) {
    var args = Array.prototype.slice.call(arguments);
    // Send error to notification center with gulp-notify
    notify.onError({
        title: 'Compile Error',
        message: a,
        // sound: true можно даже со звуком!
    }).apply(this, args);

    // Keep gulp from hanging on this task
    this.emit('end');
};

//useref
gulp.task('make', function () {
   
  var assets = useref.assets();
  gulp.src('app/js/*.js')
  .pipe(uglify())
  .pipe(gulp.dest('dist/js/'));

   gulp.src('app/css/style.css')
  .pipe(minifyCss())
  .pipe(gulp.dest('dist/css/'));
  return gulp.src('app/*.html')
      .pipe(cache('make'))
      .pipe(assets)
      .pipe(remember('make'))
      .pipe(gulpif('*.js', uglify()))
      .pipe(gulpif('*.css', minifyCss()))
      .pipe(assets.restore())
      .pipe(useref())
      .pipe(gulp.dest('dist'));
});

//Ftp
gulp.task( 'ftp', function() {
    var conn = ftp.create( {
        host:     'one.web-kuznetcov.ru',
        user:     ftpConf.user,
        password: ftpConf.pass,
        parallel: 21,
    } );
    var globs = [
        'dist/**',
        'dist/*.html'
    ];
   return gulp.src(globs)
        .pipe( conn.newer( 'httpdocs/one.web-kuznetcov.ru/'+ftpConf.name) )
        .pipe( conn.dest( 'httpdocs/one.web-kuznetcov.ru/'+ftpConf.name) );

} );

//LiveReload
gulp.task('serve', function () {
    browserSync.init({
        notify: false,
        reloadDelay: 300,
        server: {
            baseDir: "app/",
        }
    });
    browserSync.watch(["app/css/**/*.css" ,"app/js/**.*"]).on("change", browserSync.reload);
});

// ########## make service end ###############

//Watcher
gulp.task('see',function(){
        gulp.watch('app/html/**/*.jade', ['jade']);
        gulp.watch(['app/css/**/*.styl'],['stylus'])
})

//default
gulp.task('img',['imagePng' , 'imageJpg']);
gulp.task('default',['see','serve'] );

gulp.task('build',function(){
    runSequence('copy:font','prefix','img','make')
});
gulp.task('build-ftp',function(){
  runSequence('copy:font','prefix','img','make','ftp')
});

//gulp.task('fast-build',['stylus','prefix','jade','copy:js','ftp']);



gulp.task('fast-see',function(){
        gulp.watch(["./app/css/**/**.styl","./app/html/**.jade","./app/js/**.*"] ,gulp.series('fast-build'))
})


//gulp.task('default', function() {
//  runSequence('see');
//});


