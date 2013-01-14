HERE=`pwd`

echo
echo -e "\033[1;30;43m UPDATING LIBS \033[0m"

if [ ! -d "tmp-update" ]; then
  mkdir tmp-update
fi

echo
echo -e "\033[33m→ updating ember.js\033[0m"
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
if [ ! -d "tmp-update/ember" ]; then
  git clone git://github.com/emberjs/ember.js.git tmp-update/ember
fi
cd tmp-update/ember
git checkout master
bundle && bundle exec rake dist
mv dist/ember.js $HERE/vendor/ember.js
cd $HERE

echo
echo -e "\033[33m→ updating ember data\033[0m"
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
if [ ! -d "tmp-update/ember-data" ]; then
  git clone git://github.com/emberjs/data.git tmp-update/ember-data
fi
cd tmp-update/ember-data
git checkout master
bundle && bundle exec rake dist
mv dist/ember-data.js $HERE/vendor/ember-data.js
cd $HERE

echo
echo -e "\033[33m→ updating handlebars\033[0m"
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
if [ ! -d "tmp-update/handlebars" ]; then
  git clone git://github.com/wycats/handlebars.js.git tmp-update/handlebars
fi
cd tmp-update/handlebars
git checkout master
bundle && bundle exec rake release
mv dist/handlebars.js $HERE/vendor/handlebars.js
cd $HERE

echo
echo -e "\033[33m→ updating jquery\033[0m"
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
curl http://code.jquery.com/jquery.js > vendor/jquery.js

echo
echo -e "\033[1;30;43m FINISHED UPDATE \033[0m"

