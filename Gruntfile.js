/* @TODO: remove comments */
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      dist: {
        options: {
          separator: '\n',
          process: true,
        },
        src: ['src/header.js', 'src/hhApp?*.js', 'src/hhApp.js', ],
        dest: 'hhcomic.user.js'
      },
    },
    watch: {
      files: ['src/**/*.js'],
      tasks: ['default'],
    },
  });

  grunt.registerTask('default', [
    'concat',
  ]);

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');

};
