'use strict';

const fetch = require('node-fetch');

const deaths = require('./deaths');

let url = "https://raw.githubusercontent.com/tetsujin1979/covid19dashboard/main/data.json";

let settings = { method: "Get" };

fetch(url, settings)
  .then(res => res.json())
  .then((json) => {
    deaths.processData(json);
  });
