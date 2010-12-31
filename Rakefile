require 'digest/md5'

add_pygments = "doc/add_pygments.py"
subst = "doc/subst_code_blocks.py"
num_pres = "doc/number_pres.py"
set_title = "doc/set_title.py"
manifest =  'build/doc/doc.manifest'

task :default => :docs

task 'gh-pages' => :docs do
  sh "doc/add_analytics.py build/doc/*.html"
end

task :docs => manifest

directory 'build/doc'

task manifest => [
  'build/doc',
  'build/doc/main.css' ]

# simply copy these
[ 'build/doc/cc-by-sa.png', 'build/doc/cc-zero.png', 'build/doc/lgplv3.png' ].each do |t|
  s = t.sub(/^build\//, '')
  file t => s do
    cp s, t
  end
  task manifest => t
end

# convert SVGs to PNGs
[ 'build/doc/logo.png', 'build/doc/icon.png' ].each do |t|
  s = t.sub(/^build\//, '').ext('svg')
  file t => s do
    sh "inkscape -e #{t} #{s}"
  end
  task manifest => t
end

file 'build/doc/main.css' => 'doc/main.scss' do |t|
  sh "sass #{t.prerequisites.first} #{t.name}"
end

rule /^build\/doc\/.+\.html$/ => [
  proc {
    |task| task.ext('.ronn').sub(/^build\//, '')
  },
  'doc/header.html',
  'doc/footer.html',
  subst,
  add_pygments,
  num_pres,
  set_title] do |t|
  sh "#{subst} #{t.source} - | \
    ronn -f -5 | \
    #{add_pygments} - - | \
    #{num_pres} - - | \
    cat doc/header.html - doc/footer.html | \
    #{set_title} - #{t.name}"
end

FileList['doc/*.ronn'].each do |f|
  target = f.pathmap("build/%X.html")
  task manifest => target
end

task :test do
  sh 'cd test && ./run_tests.sh'
end
