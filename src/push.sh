 #!/bin/sh

cd ./tmp/files
git config user.email "lqvu99+webapi@gmail.com"
git config user.name "Files Manager"
git config push.default current
git stash
git checkout master
git stash pop
git add .
git commit -m "${COMMIT_MSG}"
git push https://${GITHUB_TOKEN}@github.com/remtori/files.git