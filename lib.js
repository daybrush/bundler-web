const bundler = require("./index");

bundler.start().then(result => {
  return Promise.all(result);
}).then(result => {
  console.log(result[1]);
})